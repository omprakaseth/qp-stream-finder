import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BackHeader, SiteFooter } from "@/components/qp/SiteChrome";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getMyQuota } from "@/lib/media.functions";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Your account — QP Movie" }, { name: "description", content: "Your QP Movie account." }, { property: "og:title", content: "Your account — QP Movie" }, { property: "og:description", content: "Your QP Movie account." }] }),
  component: Account,
});

function Account() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const quotaFn = useServerFn(getMyQuota);
  const quota = useQuery({ queryKey: ["quota"], queryFn: () => quotaFn() });
  const progress = useQuery({ queryKey: ["progress"], queryFn: async () => (await supabase.from("watch_progress").select("movie_id,position_seconds,duration_seconds,last_played_at,movies(slug,title)").order("last_played_at", { ascending: false }).limit(50)).data ?? [] });
  const watchlist = useQuery({ queryKey: ["watchlist", "all"], queryFn: async () => (await supabase.from("watchlist").select("movie_id,movies(slug,title)").order("created_at", { ascending: false })).data ?? [] });
  const downloads = useQuery({ queryKey: ["downloads"], queryFn: async () => (await supabase.from("download_events").select("id,quality,created_at,movies(title)").order("created_at", { ascending: false }).limit(30)).data ?? [] });

  const signOut = async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); };
  const clearHistory = async () => { if (!confirm("Clear your watch history?")) return; await supabase.from("watch_progress").delete().eq("user_id", user!.id); qc.invalidateQueries({ queryKey: ["progress"] }); };
  const requestDeletion = async () => { if (!confirm("Request deletion of your account and data?")) return; const { error } = await supabase.from("profiles").update({ deletion_requested_at: new Date().toISOString() }).eq("id", user!.id); toast[error ? "error" : "success"](error ? "Failed" : "Deletion request recorded"); };
  const exportData = () => { const blob = new Blob([JSON.stringify({ email: user?.email, history: progress.data, watchlist: watchlist.data, downloads: downloads.data }, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "qp-movie-data.json"; a.click(); };

  const card = "rounded-2xl border border-border bg-card p-5";
  return (
    <div className="min-h-screen"><BackHeader title="Account" />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <section className={card}><h2 className="font-semibold">Profile</h2><p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
          <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" onClick={signOut}>Sign out</Button><Button variant="outline" asChild><Link to="/admin">Staff area</Link></Button></div></section>
        <section className={card}><h2 className="font-semibold">Today's quotas</h2>
          {quota.data ? <p className="mt-1 text-sm text-muted-foreground">Watched {quota.data.watchUsed}/{quota.data.watchLimit} movies · Downloaded {quota.data.downloadUsed}/{quota.data.downloadLimit} · Resets {new Date(quota.data.resetsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p> : <p className="text-sm text-muted-foreground">Loading…</p>}</section>
        <section className={card}><div className="flex justify-between"><h2 className="font-semibold">Continue watching & history</h2><button onClick={clearHistory} className="text-sm text-primary">Clear</button></div>
          <ul className="mt-2 space-y-1 text-sm">{(progress.data ?? []).map((p) => { const m = p.movies as unknown as { slug: string; title: string }; return <li key={p.movie_id}><Link to="/watch/$slug" params={{ slug: m.slug }} className="hover:text-primary">{m.title}</Link> <span className="text-muted-foreground">— {Math.round(p.position_seconds / 60)} min</span></li>; })}
            {progress.data?.length === 0 && <li className="text-muted-foreground">Nothing yet. History is private to you.</li>}</ul></section>
        <section className={card}><h2 className="font-semibold">Watchlist</h2>
          <ul className="mt-2 space-y-1 text-sm">{(watchlist.data ?? []).map((w) => { const m = w.movies as unknown as { slug: string; title: string }; return <li key={w.movie_id} className="flex justify-between"><Link to="/movie/$slug" params={{ slug: m.slug }}>{m.title}</Link><button className="text-muted-foreground" onClick={async () => { await supabase.from("watchlist").delete().eq("movie_id", w.movie_id).eq("user_id", user!.id); watchlist.refetch(); }}>Remove</button></li>; })}
            {watchlist.data?.length === 0 && <li className="text-muted-foreground">Empty.</li>}</ul></section>
        <section className={card}><h2 className="font-semibold">Download history</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">{(downloads.data ?? []).map((d) => <li key={d.id}>{(d.movies as unknown as { title: string })?.title} · {d.quality} · {new Date(d.created_at).toLocaleDateString()}</li>)}{downloads.data?.length === 0 && <li>None.</li>}</ul></section>
        <section className={card}><h2 className="font-semibold">Your data</h2><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" onClick={exportData}>Export my data</Button><Button variant="destructive" onClick={requestDeletion}>Request account deletion</Button></div></section>
      </div>
      <SiteFooter />
    </div>
  );
}
