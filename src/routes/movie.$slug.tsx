import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Play, Download, Heart, Star, Clock, Languages, ShieldCheck, ChevronDown, Flag, Info } from "lucide-react";
import { BackHeader, SiteFooter } from "@/components/qp/SiteChrome";
import { Poster } from "@/components/qp/MovieCard";
import { ScreenshotViewer } from "@/components/qp/ScreenshotViewer";
import { DownloadSheet } from "@/components/qp/DownloadSheet";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { getMovie } from "@/lib/catalog.functions";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { qualityLabel } from "@/lib/quota";

const movieQuery = (slug: string) => queryOptions({ queryKey: ["movie", slug], queryFn: () => getMovie({ data: { slug } }) });

export const Route = createFileRoute("/movie/$slug")({
  loader: async ({ context, params }) => {
    const d = await context.queryClient.ensureQueryData(movieQuery(params.slug));
    if (!d) throw notFound();
    return { title: d.movie.title, synopsis: d.movie.synopsis, image: d.movie.backdrop_url ?? d.movie.poster_url };
  },
  head: ({ loaderData }) => {
    const t = loaderData ? `${loaderData.title} — QP Movie` : "Movie unavailable — QP Movie";
    const desc = loaderData?.synopsis?.slice(0, 155) ?? "Movie details on QP Movie.";
    const img = loaderData?.image?.startsWith("https://") ? loaderData.image : null;
    return {
      meta: [
        { title: t }, { name: "description", content: desc },
        { property: "og:title", content: t }, { property: "og:description", content: desc },
        { property: "og:type", content: "video.movie" }, { name: "twitter:card", content: "summary_large_image" },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen"><BackHeader /><div className="p-10 text-center"><h1 className="text-xl font-semibold">Movie not available</h1><Link to="/" className="mt-4 inline-block text-primary">Back to catalogue</Link></div></div>
  ),
  component: MovieDetails,
});

function MovieDetails() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(movieQuery(slug));
  const d = data!;
  const m = d.movie;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewer, setViewer] = useState<number | null>(null);
  const [dlOpen, setDlOpen] = useState(false);
  const av = d.availability;

  const watch = () => {
    if (!user) { navigate({ to: "/auth", search: { next: `/watch/${slug}` } }); return; }
    navigate({ to: "/watch/$slug", params: { slug } });
  };

  return (
    <div className="min-h-screen">
      <BackHeader right={<WatchlistButton movieId={m.id} />} />
      <div className="mx-auto max-w-5xl px-4">
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-border">
          <div className="aspect-[16/10] sm:aspect-[21/9]">
            {m.backdrop_url ? <img src={m.backdrop_url} alt="" className="h-full w-full object-cover" /> : <Poster src={m.poster_url} title={m.title} className="h-full w-full" />}
          </div>
          {m.is_demo && <span className="absolute left-3 top-3 rounded-full bg-background/80 px-2.5 py-1 text-xs text-muted-foreground">Demo listing — no media or rights</span>}
        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-[200px_1fr]">
          <div className="hidden aspect-[2/3] overflow-hidden rounded-xl border border-border md:block"><Poster src={m.poster_url} title={m.title} className="h-full w-full" /></div>
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">{m.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {d.rating.count > 0 && <span className="flex items-center gap-1 text-foreground"><Star className="h-4 w-4 fill-warning text-warning" />{d.rating.average} <span className="text-muted-foreground">({d.rating.count})</span></span>}
              {m.release_year && <span>{m.release_year}</span>}
              {m.runtime_minutes && <span>{Math.floor(m.runtime_minutes / 60)}h {m.runtime_minutes % 60}m</span>}
              {m.genres.length > 0 && <span>{m.genres.join(" · ")}</span>}
            </div>
            {m.synopsis && <p className="mt-4 leading-relaxed text-foreground/90">{m.synopsis}</p>}
            {m.content_advisory && <p className="mt-3 flex gap-2 text-sm text-warning"><Info className="mt-0.5 h-4 w-4 shrink-0" />{m.content_advisory}</p>}

            <Button size="lg" onClick={watch} disabled={!av.can_stream} className="mt-6 h-13 w-full bg-accent-gradient text-base shadow-glow sm:w-auto sm:px-10">
              <Play className="h-5 w-5 fill-current" /> Watch Now
            </Button>
            {!av.can_stream && <p className="mt-2 text-sm text-muted-foreground">Licensed streaming isn't available for this title yet.</p>}
            {av.can_stream && !user && <p className="mt-2 text-sm text-muted-foreground">Sign in required to watch full movies.</p>}
            <div className="mt-3">
              <Button variant="ghost" onClick={() => setDlOpen(true)} className="text-muted-foreground hover:text-foreground"><Download className="h-4 w-4" /> Download options</Button>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {m.runtime_minutes && <Fact icon={<Clock className="h-5 w-5" />} k="Duration" v={`${Math.floor(m.runtime_minutes / 60)}h ${m.runtime_minutes % 60}m`} />}
              {m.language && <Fact icon={<Languages className="h-5 w-5" />} k="Language" v={m.language} />}
              {m.certification && <Fact icon={<ShieldCheck className="h-5 w-5" />} k="Rating" v={m.certification} />}
              {av.qualities && av.qualities.length > 0 && <Fact icon={<span className="text-xs font-bold">HD</span>} k="Best quality" v={qualityLabel(av.qualities.map((q) => q.quality).sort().reverse()[0] === "720p" ? "720p" : av.qualities[0].quality)} />}
            </dl>
          </div>
        </div>

        {d.screenshots.length > 0 && (
          <section className="mt-10" aria-labelledby="shots-h">
            <h2 id="shots-h" className="mb-3 text-lg font-semibold">Screenshots ({d.screenshots.length})</h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {d.screenshots.map((s, i) => (
                <button key={s.id} onClick={() => setViewer(i)} className="aspect-video overflow-hidden rounded-lg border border-border" aria-label={`Open screenshot ${i + 1}`}>
                  <img src={s.url} alt={s.caption ?? ""} loading="lazy" className="h-full w-full object-cover transition-transform hover:scale-105" />
                </button>
              ))}
            </div>
          </section>
        )}

        {m.trailer_youtube_id && m.trailer_verified && (
          <section className="mt-10" aria-labelledby="tr-h">
            <h2 id="tr-h" className="mb-3 text-lg font-semibold">Official trailer</h2>
            <div className="aspect-video overflow-hidden rounded-xl border border-border">
              <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${m.trailer_youtube_id}`} title={`${m.title} official trailer`} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" />
            </div>
          </section>
        )}

        <div className="mt-10 space-y-2">
          {m.synopsis && <Section title="About movie"><p className="text-sm text-muted-foreground">{m.synopsis}</p>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">{m.release_year && <li>Released: {m.release_year}</li>}{m.language && <li>Language: {m.language}</li>}{m.certification && <li>Certification: {m.certification}</li>}</ul></Section>}
          {d.credits.length > 0 && <Section title="Cast & crew"><ul className="grid gap-2 text-sm sm:grid-cols-2">{d.credits.map((c, i) => <li key={i}><span className="font-medium">{c.person_name}</span> <span className="text-muted-foreground">— {c.credit_role}</span></li>)}</ul></Section>}
          <Section title={`Ratings & reviews${d.rating.count ? ` (${d.rating.count})` : ""}`}><Reviews movieId={m.id} slug={slug} reviews={d.reviews} /></Section>
        </div>
      </div>
      <SiteFooter />
      <ScreenshotViewer shots={d.screenshots} index={viewer} onIndex={setViewer} title={m.title} />
      <DownloadSheet open={dlOpen} onOpenChange={setDlOpen} movieId={m.id} title={m.title} />
    </div>
  );
}

function Fact({ icon, k, v }: { icon: React.ReactNode; k: string; v: string }) {
  return <div className="rounded-xl border border-border bg-card p-3 text-center"><div className="flex justify-center text-muted-foreground">{icon}</div><dd className="mt-1 text-sm font-semibold">{v}</dd><dt className="text-xs text-muted-foreground">{k}</dt></div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Collapsible className="rounded-xl border border-border bg-card">
      <CollapsibleTrigger className="group flex w-full items-center justify-between p-4 text-left font-semibold">
        {title}<ChevronDown className="h-5 w-5 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function WatchlistButton({ movieId }: { movieId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["watchlist", movieId, user?.id],
    enabled: !!user,
    queryFn: async () => !!(await supabase.from("watchlist").select("movie_id").eq("movie_id", movieId).maybeSingle()).data,
  });
  const navigate = useNavigate();
  const toggle = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    const { error } = q.data
      ? await supabase.from("watchlist").delete().eq("movie_id", movieId).eq("user_id", user.id)
      : await supabase.from("watchlist").insert({ movie_id: movieId, user_id: user.id });
    if (error) toast.error("Couldn't update watchlist"); else { toast.success(q.data ? "Removed from watchlist" : "Saved to watchlist"); qc.invalidateQueries({ queryKey: ["watchlist"] }); }
  };
  return (
    <button onClick={toggle} aria-pressed={!!q.data} aria-label={q.data ? "Remove from watchlist" : "Save to watchlist"} className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary">
      <Heart className={`h-5 w-5 ${q.data ? "fill-magenta text-magenta" : ""}`} />
    </button>
  );
}

type Review = { id: string; author_name: string; rating: number; body: string | null; created_at: string; user_id: string };
function Reviews({ movieId, slug, reviews }: { movieId: string; slug: string; reviews: Review[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const mine = reviews.find((r) => r.user_id === user?.id);
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [body, setBody] = useState(mine?.body ?? "");
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["movie", slug] });
  const save = async () => {
    if (!user || rating < 1) return;
    setBusy(true);
    const name = (user.user_metadata?.display_name as string) || user.email?.split("@")[0] || "Viewer";
    const { error } = await supabase.from("reviews").upsert({ user_id: user.id, movie_id: movieId, rating, body: body.trim().slice(0, 2000) || null, author_name: name.slice(0, 60) }, { onConflict: "user_id,movie_id" });
    setBusy(false);
    if (error) toast.error("Couldn't save review"); else { toast.success("Review saved"); refresh(); }
  };
  const del = async () => { if (!user) return; await supabase.from("reviews").delete().eq("user_id", user.id).eq("movie_id", movieId); setRating(0); setBody(""); refresh(); };
  const report = async (id: string) => {
    if (!user) { toast("Sign in to report a review"); return; }
    const reason = window.prompt("Why are you reporting this review? (spam, abuse, spoilers…)");
    if (!reason || reason.trim().length < 3) return;
    const { error } = await supabase.from("review_reports").insert({ review_id: id, reporter_id: user.id, reason: reason.trim().slice(0, 500) });
    toast[error ? "error" : "success"](error ? "Already reported or failed" : "Thanks — our moderators will review it");
  };
  return (
    <div className="space-y-5">
      {user ? (
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)} className="p-1">
                <Star className={`h-6 w-6 ${n <= rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <Textarea className="mt-2" maxLength={2000} placeholder="Share your thoughts (optional)" value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="mt-2 flex gap-2"><Button size="sm" disabled={rating < 1 || busy} onClick={save}>{mine ? "Update review" : "Post review"}</Button>{mine && <Button size="sm" variant="ghost" onClick={del}>Delete</Button>}</div>
        </div>
      ) : <p className="text-sm text-muted-foreground"><Link to="/auth" className="text-primary">Sign in</Link> to rate and review.</p>}
      {reviews.length === 0 ? <p className="text-sm text-muted-foreground">No reviews yet.</p> : (
        <ul className="space-y-4">{reviews.map((r) => (
          <li key={r.id} className="border-t border-border pt-4 first:border-0 first:pt-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{r.author_name} <span className="ml-2 inline-flex items-center gap-0.5 text-warning"><Star className="h-3.5 w-3.5 fill-current" />{r.rating}</span></span>
              {r.user_id !== user?.id && <button onClick={() => report(r.id)} aria-label="Report review" className="p-2 text-muted-foreground hover:text-foreground"><Flag className="h-4 w-4" /></button>}
            </div>
            {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
          </li>
        ))}</ul>
      )}
    </div>
  );
}
