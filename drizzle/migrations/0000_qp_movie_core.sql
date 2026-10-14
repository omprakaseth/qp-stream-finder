
-- ===== Roles =====
CREATE TYPE public.app_role AS ENUM ('owner','content_admin','media_manager','moderator');
CREATE TYPE public.movie_status AS ENUM ('draft','pending_approval','published','unpublished');
CREATE TYPE public.asset_status AS ENUM ('uploading','uploaded','verified','failed');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text CHECK (char_length(display_name) <= 60),
  deletion_requested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, left(coalesce(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)), 60));
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- First signed-in user may claim owner exactly once (secure bootstrap)
CREATE OR REPLACE FUNCTION public.claim_first_owner()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('claim_first_owner'));
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'owner') THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'owner');
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.claim_first_owner() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_owner() TO authenticated;

CREATE OR REPLACE FUNCTION public.owner_exists()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'owner')
$$;

-- ===== Movies =====
CREATE TABLE public.movies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{1,80}$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  release_year int CHECK (release_year BETWEEN 1888 AND 2100),
  genres text[] NOT NULL DEFAULT '{}',
  language text,
  runtime_minutes int CHECK (runtime_minutes > 0 AND runtime_minutes < 1000),
  certification text,
  content_advisory text,
  synopsis text CHECK (char_length(synopsis) <= 4000),
  poster_url text,
  backdrop_url text,
  trailer_youtube_id text CHECK (trailer_youtube_id IS NULL OR trailer_youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  trailer_verified boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  status public.movie_status NOT NULL DEFAULT 'draft',
  popularity int NOT NULL DEFAULT 0,
  created_by uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX movies_status_idx ON public.movies (status, published_at DESC);
CREATE INDEX movies_title_trgm ON public.movies (lower(title));
CREATE INDEX movies_genres_idx ON public.movies USING gin (genres);
GRANT SELECT ON public.movies TO anon, authenticated;
GRANT ALL ON public.movies TO service_role;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published movies public" ON public.movies FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "staff read all movies" ON public.movies FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE public.movie_screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.movie_screenshots (movie_id, sort_order);
GRANT SELECT ON public.movie_screenshots TO anon, authenticated;
GRANT ALL ON public.movie_screenshots TO service_role;
ALTER TABLE public.movie_screenshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "screens of published" ON public.movie_screenshots FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.movies m WHERE m.id = movie_id AND (m.status='published' OR public.is_staff(auth.uid()))));

CREATE TABLE public.movie_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  person_name text NOT NULL,
  credit_role text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.movie_credits TO anon, authenticated;
GRANT ALL ON public.movie_credits TO service_role;
ALTER TABLE public.movie_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credits of published" ON public.movie_credits FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.movies m WHERE m.id = movie_id AND (m.status='published' OR public.is_staff(auth.uid()))));

-- Media assets: never readable by clients (private paths). Server only.
CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  quality text NOT NULL CHECK (quality IN ('480p','720p','1080p','2160p')),
  storage_path text NOT NULL UNIQUE,
  expected_size_bytes bigint,
  size_bytes bigint,
  sha256 text,
  mime_type text,
  status public.asset_status NOT NULL DEFAULT 'uploading',
  playback_checked_at timestamptz,
  source text NOT NULL DEFAULT 'upload',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (movie_id, quality)
);
GRANT ALL ON public.media_assets TO service_role;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rights_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  rights_holder text NOT NULL,
  licence_reference text NOT NULL,
  evidence_notes text,
  territories text,
  allow_stream boolean NOT NULL DEFAULT false,
  allow_download boolean NOT NULL DEFAULT false,
  allow_guest_download boolean NOT NULL DEFAULT false,
  valid_from timestamptz,
  expires_at timestamptz,
  verified_by uuid,
  verified_at timestamptz,
  revoked_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.rights_records (movie_id);
GRANT ALL ON public.rights_records TO service_role;
ALTER TABLE public.rights_records ENABLE ROW LEVEL SECURITY;

-- Public availability summary (no paths). Fail closed.
CREATE OR REPLACE FUNCTION public.movie_availability(_movie_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH m AS (SELECT * FROM movies WHERE id = _movie_id AND status = 'published'),
  r AS (
    SELECT bool_or(allow_stream) s, bool_or(allow_download) d, bool_or(allow_guest_download) g
    FROM rights_records
    WHERE movie_id = _movie_id AND verified_at IS NOT NULL AND revoked_at IS NULL
      AND (valid_from IS NULL OR valid_from <= now()) AND (expires_at IS NULL OR expires_at > now())
  ),
  a AS (
    SELECT coalesce(jsonb_agg(jsonb_build_object('quality', quality, 'size_bytes', size_bytes) ORDER BY size_bytes DESC NULLS LAST), '[]'::jsonb) q
    FROM media_assets WHERE movie_id = _movie_id AND status = 'verified'
  )
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM m) THEN jsonb_build_object('published', false)
  ELSE jsonb_build_object(
    'published', true,
    'can_stream', coalesce((SELECT s FROM r), false) AND jsonb_array_length((SELECT q FROM a)) > 0,
    'can_download', coalesce((SELECT d FROM r), false) AND jsonb_array_length((SELECT q FROM a)) > 0,
    'guest_download', coalesce((SELECT g FROM r), false) AND coalesce((SELECT d FROM r), false),
    'qualities', (SELECT q FROM a)
  ) END
$$;
GRANT EXECUTE ON FUNCTION public.movie_availability(uuid) TO anon, authenticated;

-- Real available qualities for filtering (verified assets of published movies only)
CREATE OR REPLACE FUNCTION public.movies_with_quality(_quality text)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT a.movie_id FROM media_assets a JOIN movies m ON m.id=a.movie_id
  WHERE a.quality = _quality AND a.status='verified' AND m.status='published'
$$;
GRANT EXECUTE ON FUNCTION public.movies_with_quality(text) TO anon, authenticated;

-- ===== Quotas =====
CREATE OR REPLACE FUNCTION public.ist_today() RETURNS date LANGUAGE sql STABLE AS $$
  SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date
$$;

CREATE TABLE public.guest_sessions (
  id uuid PRIMARY KEY,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.guest_sessions TO service_role;
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.quota_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('download','watch')),
  subject text NOT NULL,         -- 'u:<uuid>' or 'g:<uuid>'
  user_id uuid,
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  quota_day date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, subject, movie_id, quota_day)
);
CREATE INDEX ON public.quota_usage (kind, subject, quota_day);
CREATE INDEX ON public.quota_usage (user_id, quota_day);
GRANT SELECT ON public.quota_usage TO authenticated;
GRANT ALL ON public.quota_usage TO service_role;
ALTER TABLE public.quota_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quota read" ON public.quota_usage FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Atomic, idempotent unique-movie reservation. Service role only.
CREATE OR REPLACE FUNCTION public.reserve_quota(_kind text, _subject text, _user_id uuid, _movie_id uuid, _limit int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d date := public.ist_today(); used int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(_kind || '|' || _subject || '|' || d::text));
  IF EXISTS (SELECT 1 FROM quota_usage WHERE kind=_kind AND subject=_subject AND movie_id=_movie_id AND quota_day=d) THEN
    SELECT count(*) INTO used FROM quota_usage WHERE kind=_kind AND subject=_subject AND quota_day=d;
    RETURN jsonb_build_object('ok', true, 'already', true, 'used', used, 'limit', _limit);
  END IF;
  SELECT count(*) INTO used FROM quota_usage WHERE kind=_kind AND subject=_subject AND quota_day=d;
  IF used >= _limit THEN
    RETURN jsonb_build_object('ok', false, 'used', used, 'limit', _limit);
  END IF;
  INSERT INTO quota_usage (kind, subject, user_id, movie_id, quota_day) VALUES (_kind, _subject, _user_id, _movie_id, d);
  RETURN jsonb_build_object('ok', true, 'already', false, 'used', used + 1, 'limit', _limit);
END $$;
REVOKE ALL ON FUNCTION public.reserve_quota(text,text,uuid,uuid,int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_quota(text,text,uuid,uuid,int) TO service_role;

-- Simple fixed-window rate limiter. Service role only.
CREATE TABLE public.rate_limits (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  hits int NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.hit_rate_limit(_bucket text, _max int, _window_seconds int)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws timestamptz := to_timestamp(floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds); n int;
BEGIN
  INSERT INTO rate_limits (bucket, window_start, hits) VALUES (_bucket, ws, 1)
  ON CONFLICT (bucket, window_start) DO UPDATE SET hits = rate_limits.hits + 1 RETURNING hits INTO n;
  DELETE FROM rate_limits WHERE window_start < now() - interval '1 day' AND random() < 0.01;
  RETURN n <= _max;
END $$;
REVOKE ALL ON FUNCTION public.hit_rate_limit(text,int,int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hit_rate_limit(text,int,int) TO service_role;

CREATE TABLE public.download_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  user_id uuid,
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  quality text NOT NULL,
  link_expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.download_events (user_id, created_at DESC);
GRANT SELECT ON public.download_events TO authenticated;
GRANT ALL ON public.download_events TO service_role;
ALTER TABLE public.download_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own downloads read" ON public.download_events FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.playback_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  quota_day date NOT NULL,
  validated_seconds int NOT NULL DEFAULT 0,
  counted boolean NOT NULL DEFAULT false,
  last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.playback_sessions (user_id, movie_id, quota_day);
GRANT ALL ON public.playback_sessions TO service_role;
ALTER TABLE public.playback_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.watch_progress (
  user_id uuid NOT NULL,
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  position_seconds int NOT NULL DEFAULT 0 CHECK (position_seconds >= 0),
  duration_seconds int,
  last_played_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, movie_id)
);
GRANT SELECT, DELETE ON public.watch_progress TO authenticated;
GRANT ALL ON public.watch_progress TO service_role;
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress read" ON public.watch_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own progress delete" ON public.watch_progress FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.watchlist (
  user_id uuid NOT NULL,
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, movie_id)
);
GRANT SELECT, INSERT, DELETE ON public.watchlist TO authenticated;
GRANT ALL ON public.watchlist TO service_role;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own watchlist read" ON public.watchlist FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own watchlist insert" ON public.watchlist FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own watchlist delete" ON public.watchlist FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ===== Reviews =====
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Viewer',
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text CHECK (char_length(body) <= 2000),
  status text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden','removed')),
  moderation_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, movie_id)
);
CREATE INDEX ON public.reviews (movie_id, status, created_at DESC);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visible reviews public" ON public.reviews FOR SELECT TO anon, authenticated USING (status = 'visible');
CREATE POLICY "own reviews read" ON public.reviews FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own reviews insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'visible' AND moderation_note IS NULL);
CREATE POLICY "own reviews update" ON public.reviews FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND status = 'visible' AND moderation_note IS NULL);
CREATE POLICY "own reviews delete" ON public.reviews FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Reviews cannot be resurrected by author after moderation: block author update of non-visible rows
CREATE OR REPLACE FUNCTION public.reviews_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status <> 'visible' AND current_user = 'authenticated' THEN
    RAISE EXCEPTION 'This review is under moderation and cannot be edited';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER reviews_guard BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.reviews_guard();

CREATE OR REPLACE FUNCTION public.movie_rating(_movie_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('average', round(avg(rating)::numeric, 1), 'count', count(*))
  FROM reviews WHERE movie_id = _movie_id AND status = 'visible'
$$;
GRANT EXECUTE ON FUNCTION public.movie_rating(uuid) TO anon, authenticated;

CREATE TABLE public.review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 500),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, reporter_id)
);
GRANT INSERT ON public.review_reports TO authenticated;
GRANT ALL ON public.review_reports TO service_role;
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report insert" ON public.review_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid() AND status='open');

-- Copyright / content removal requests (submitted via server fn)
CREATE TABLE public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid REFERENCES public.movies(id) ON DELETE SET NULL,
  reporter_name text NOT NULL,
  reporter_email text NOT NULL,
  claim text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','actioned','rejected')),
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.content_reports TO service_role;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_logs (
  id bigserial PRIMARY KEY,
  actor_id uuid,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.audit_logs (created_at DESC);
GRANT ALL ON public.audit_logs TO service_role;
GRANT USAGE ON SEQUENCE public.audit_logs_id_seq TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.drive_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid REFERENCES public.movies(id) ON DELETE CASCADE,
  drive_file_id text NOT NULL,
  quality text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
  bytes_copied bigint NOT NULL DEFAULT 0,
  error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (movie_id, drive_file_id)
);
GRANT ALL ON public.drive_import_jobs TO service_role;
ALTER TABLE public.drive_import_jobs ENABLE ROW LEVEL SECURITY;

-- ===== Demo seed (clearly labelled; no rights, no media) =====
INSERT INTO public.movies (slug,title,release_year,genres,language,runtime_minutes,certification,synopsis,is_demo,status,popularity,featured,published_at) VALUES
('demo-ember-city','Ember City (Demo)',2024,'{Action,Drama}','Hindi',150,'U/A 13+','DEMO LISTING — placeholder metadata for layout testing. No rights or media are attached.',true,'published',95,true,now()),
('demo-tide-runner','Tide Runner (Demo)',2023,'{Thriller}','Tamil',132,'U/A 16+','DEMO LISTING — placeholder metadata for layout testing.',true,'published',80,false,now()),
('demo-paper-moons','Paper Moons (Demo)',2022,'{Romance,Drama}','Telugu',128,'U','DEMO LISTING — placeholder metadata for layout testing.',true,'published',70,false,now()),
('demo-hollow-pines','Hollow Pines (Demo)',2021,'{Horror}','English',104,'A','DEMO LISTING — placeholder metadata for layout testing.',true,'published',60,false,now()),
('demo-laugh-track','Laugh Track (Demo)',2024,'{Comedy}','Hindi',118,'U','DEMO LISTING — placeholder metadata for layout testing.',true,'published',75,false,now()),
('demo-iron-monsoon','Iron Monsoon (Demo)',2020,'{Action}','Malayalam',141,'U/A 13+','DEMO LISTING — placeholder metadata for layout testing.',true,'published',65,false,now()),
('demo-quiet-orbit','Quiet Orbit (Demo)',2023,'{Drama}','English',112,'U','DEMO LISTING — placeholder metadata for layout testing.',true,'published',55,false,now()),
('demo-saffron-heist','Saffron Heist (Demo)',2022,'{Thriller,Action}','Kannada',136,'U/A 13+','DEMO LISTING — placeholder metadata for layout testing.',true,'published',85,false,now()),
('demo-last-ferry','The Last Ferry (Demo)',2019,'{Drama,Romance}','Hindi',124,'U','DEMO LISTING — placeholder metadata for layout testing.',true,'published',50,false,now()),
('demo-night-market','Night Market (Demo)',2024,'{Comedy,Drama}','Tamil',109,'U','DEMO LISTING — placeholder metadata for layout testing.',true,'published',45,false,now()),
('demo-glass-river','Glass River (Demo)',2021,'{Thriller}','Telugu',119,'U/A 16+','DEMO LISTING — placeholder metadata for layout testing.',true,'published',40,false,now()),
('demo-ghost-signal','Ghost Signal (Demo)',2023,'{Horror,Thriller}','English',99,'A','DEMO LISTING — placeholder metadata for layout testing.',true,'published',35,false,now()),
('demo-kite-season','Kite Season (Demo)',2020,'{Comedy,Romance}','Hindi',115,'U','DEMO LISTING — placeholder metadata for layout testing.',true,'published',30,false,now()),
('demo-red-dunes','Red Dunes (Demo)',2022,'{Action,Drama}','Hindi',147,'U/A 13+','DEMO LISTING — placeholder metadata for layout testing.',true,'published',25,false,now());
