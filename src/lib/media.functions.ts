import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { QUOTA, nextIstReset, heartbeatCredit, istDay } from "./quota";

type Availability = {
  published: boolean;
  can_stream?: boolean;
  can_download?: boolean;
  guest_download?: boolean;
  qualities?: { quality: string; size_bytes: number | null }[];
};

const movieIdSchema = z.object({ movieId: z.string().uuid() });

async function availability(movieId: string): Promise<Availability> {
  const { admin } = await import("./server-utils.server");
  const a = await admin();
  const { data } = await a.rpc("movie_availability", { _movie_id: movieId });
  return (data ?? { published: false }) as Availability;
}

async function usedToday(kind: "download" | "watch", subject: string) {
  const { admin } = await import("./server-utils.server");
  const a = await admin();
  const { data } = await a.from("quota_usage").select("movie_id").eq("kind", kind).eq("subject", subject).eq("quota_day", istDay());
  return (data ?? []).map((r) => r.movie_id);
}

/** Download sheet data. Works for guests and users. Does NOT consume quota. */
export const getDownloadOptions = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => movieIdSchema.parse(d))
  .handler(async ({ data }) => {
    const { optionalUser, guestId } = await import("./server-utils.server");
    const user = await optionalUser();
    const subject = user ? `u:${user.id}` : `g:${await guestId()}`;
    const av = await availability(data.movieId);
    const used = await usedToday("download", subject);
    const alreadyThis = used.includes(data.movieId);
    const allowed = !!av.can_download && (user ? true : !!av.guest_download);
    return {
      signedIn: !!user,
      allowed,
      reason: !av.published
        ? "This title is not published."
        : !av.can_download
          ? "Downloads are not licensed for this title yet."
          : !user && !av.guest_download
            ? "Sign in to download this title."
            : null,
      qualities: allowed ? (av.qualities ?? []) : [],
      remaining: alreadyThis ? QUOTA.downloadPerDay - used.length + 1 : Math.max(0, QUOTA.downloadPerDay - used.length),
      alreadyCountedToday: alreadyThis,
      limit: QUOTA.downloadPerDay,
      resetsAt: nextIstReset().toISOString(),
    };
  });

/** Issues a short-lived signed link after rights + atomic quota checks. */
export const requestDownloadLink = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ movieId: z.string().uuid(), quality: z.enum(["480p", "720p", "1080p", "2160p"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { optionalUser, guestId, admin, rateLimit, ipHash } = await import("./server-utils.server");
    const user = await optionalUser();
    const subject = user ? `u:${user.id}` : `g:${await guestId()}`;
    await rateLimit("dl:" + subject, 10, 60);
    await rateLimit("dlip:" + (await ipHash()), 30, 3600);

    const av = await availability(data.movieId);
    if (!av.can_download || (!user && !av.guest_download)) {
      return { ok: false as const, code: "not_available", message: "This download is not available." };
    }
    const a = await admin();
    const { data: asset } = await a
      .from("media_assets")
      .select("id,storage_path,quality,mime_type")
      .eq("movie_id", data.movieId)
      .eq("quality", data.quality)
      .eq("status", "verified")
      .maybeSingle();
    if (!asset) return { ok: false as const, code: "no_asset", message: "That quality is not available." };

    const { data: res, error } = await a.rpc("reserve_quota", {
      _kind: "download", _subject: subject, _user_id: user?.id ?? null as unknown as string, _movie_id: data.movieId, _limit: QUOTA.downloadPerDay,
    });
    if (error) return { ok: false as const, code: "error", message: "Could not check your quota. Please retry." };
    const r = res as { ok: boolean; used: number; limit: number };
    if (!r.ok) {
      return { ok: false as const, code: "quota", message: "Daily download limit reached.", resetsAt: nextIstReset().toISOString() };
    }
    const { data: movie } = await a.from("movies").select("slug").eq("id", data.movieId).single();
    const ext = asset.storage_path.split(".").pop() ?? "mp4";
    const { data: signed, error: sErr } = await a.storage
      .from("media")
      .createSignedUrl(asset.storage_path, QUOTA.downloadLinkTtlSeconds, { download: `${movie?.slug ?? "movie"}-${asset.quality}.${ext}` });
    if (sErr || !signed) return { ok: false as const, code: "error", message: "Could not create a download link. Please retry." };
    const expires = new Date(Date.now() + QUOTA.downloadLinkTtlSeconds * 1000).toISOString();
    await a.from("download_events").insert({ subject, user_id: user?.id ?? null, movie_id: data.movieId, asset_id: asset.id, quality: asset.quality, link_expires_at: expires });
    return { ok: true as const, url: signed.signedUrl, expiresAt: expires };
  });

export const getMyQuota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = `u:${context.userId}`;
    const [w, d] = await Promise.all([usedToday("watch", s), usedToday("download", s)]);
    return {
      watchUsed: w.length, watchLimit: QUOTA.watchPerDay,
      downloadUsed: d.length, downloadLimit: QUOTA.downloadPerDay,
      resetsAt: nextIstReset().toISOString(),
    };
  });

/** Authorises full playback. Login + verified email + rights + verified asset + watch quota. */
export const startPlayback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ slug: z.string().regex(/^[a-z0-9-]{1,80}$/), quality: z.enum(["480p", "720p", "1080p", "2160p"]).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { admin, rateLimit } = await import("./server-utils.server");
    await rateLimit("play:" + context.userId, 20, 60);
    const a = await admin();
    const { data: u } = await a.auth.admin.getUserById(context.userId);
    if (!u.user?.email_confirmed_at) {
      return { ok: false as const, code: "unverified", message: "Please verify your email address to watch full movies." };
    }
    const { data: movie } = await a.from("movies").select("id,title,slug,backdrop_url,poster_url").eq("slug", data.slug).eq("status", "published").maybeSingle();
    if (!movie) return { ok: false as const, code: "not_found", message: "Movie not found." };
    const av = await availability(movie.id);
    if (!av.can_stream) {
      return { ok: false as const, code: "not_available", message: "Licensed streaming media is not available for this title yet.", movie };
    }
    const subject = `u:${context.userId}`;
    const used = await usedToday("watch", subject);
    if (!used.includes(movie.id) && used.length >= QUOTA.watchPerDay) {
      return { ok: false as const, code: "quota", message: `You've watched ${QUOTA.watchPerDay} movies today.`, resetsAt: nextIstReset().toISOString(), movie };
    }
    const qualities = (av.qualities ?? []).map((q) => q.quality);
    const quality = data.quality && qualities.includes(data.quality) ? data.quality : (qualities.includes("720p") ? "720p" : qualities[0]);
    const { data: asset } = await a.from("media_assets").select("storage_path").eq("movie_id", movie.id).eq("quality", quality).eq("status", "verified").maybeSingle();
    if (!asset) return { ok: false as const, code: "not_available", message: "Media is unavailable.", movie };
    const { data: signed } = await a.storage.from("media").createSignedUrl(asset.storage_path, QUOTA.streamLinkTtlSeconds);
    if (!signed) return { ok: false as const, code: "error", message: "Could not authorise playback. Please retry.", movie };

    // Reuse today's session for this movie so resumes do not create parallel counters.
    const day = istDay();
    const { data: existing } = await a.from("playback_sessions").select("id").eq("user_id", context.userId).eq("movie_id", movie.id).eq("quota_day", day).order("created_at", { ascending: false }).limit(1).maybeSingle();
    let sessionId = existing?.id;
    if (sessionId) {
      await a.from("playback_sessions").update({ last_heartbeat_at: new Date().toISOString() }).eq("id", sessionId);
    } else {
      const { data: s } = await a.from("playback_sessions").insert({ user_id: context.userId, movie_id: movie.id, quota_day: day }).select("id").single();
      sessionId = s!.id;
    }
    const { data: prog } = await a.from("watch_progress").select("position_seconds").eq("user_id", context.userId).eq("movie_id", movie.id).maybeSingle();
    return {
      ok: true as const,
      movie,
      src: signed.signedUrl,
      quality,
      qualities,
      sessionId,
      resumeAt: prog?.position_seconds ?? 0,
      expiresAt: new Date(Date.now() + QUOTA.streamLinkTtlSeconds * 1000).toISOString(),
    };
  });

export const playbackHeartbeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      sessionId: z.string().uuid(),
      position: z.number().min(0).max(100000),
      duration: z.number().min(0).max(100000).nullable(),
      playing: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { admin, rateLimit } = await import("./server-utils.server");
    await rateLimit("hb:" + context.userId, 12, 60);
    const a = await admin();
    const { data: s } = await a.from("playback_sessions").select("*").eq("id", data.sessionId).eq("user_id", context.userId).maybeSingle();
    if (!s) return { ok: false as const, code: "invalid" };
    const now = Date.now();
    const credit = heartbeatCredit(new Date(s.last_heartbeat_at).getTime(), now, data.playing);
    const validated = s.validated_seconds + credit;
    let counted = s.counted;
    if (!counted && validated >= QUOTA.watchCountAfterSeconds) {
      const { data: res } = await a.rpc("reserve_quota", { _kind: "watch", _subject: `u:${context.userId}`, _user_id: context.userId, _movie_id: s.movie_id, _limit: QUOTA.watchPerDay });
      if (!(res as { ok: boolean })?.ok) return { ok: false as const, code: "quota", resetsAt: nextIstReset().toISOString() };
      counted = true;
    }
    await a.from("playback_sessions").update({ validated_seconds: validated, counted, last_heartbeat_at: new Date(now).toISOString() }).eq("id", s.id);
    await a.from("watch_progress").upsert({
      user_id: context.userId, movie_id: s.movie_id,
      position_seconds: Math.floor(data.position),
      duration_seconds: data.duration ? Math.floor(data.duration) : null,
      last_played_at: new Date(now).toISOString(),
    });
    return { ok: true as const, counted };
  });
