import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { BackHeader } from "@/components/qp/SiteChrome";
import { VideoPlayer } from "@/components/qp/VideoPlayer";
import { Button } from "@/components/ui/button";
import { startPlayback, playbackHeartbeat } from "@/lib/media.functions";

export const Route = createFileRoute("/_authenticated/watch/$slug")({
  head: () => ({ meta: [{ title: "Watch — QP Movie" }, { name: "description", content: "Watch authorized movies on QP Movie." }, { property: "og:title", content: "Watch — QP Movie" }, { property: "og:description", content: "Watch authorized movies on QP Movie." }, { property: "og:type", content: "video.movie" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Watch,
});

type Auth = Awaited<ReturnType<typeof startPlayback>>;
type Quality = "480p" | "720p" | "1080p" | "2160p";
function isQuality(value: string): value is Quality { return ["480p", "720p", "1080p", "2160p"].includes(value); }

function Watch() {
  const { slug } = Route.useParams();
  const start = useServerFn(startPlayback), beat = useServerFn(playbackHeartbeat);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [resume, setResume] = useState(0), [autoPlay, setAutoPlay] = useState(false);
  const playerHost = useRef<HTMLDivElement>(null), request = useRef(0);
  const authorize = useCallback(async (quality?: string, at?: number, wasPlaying = false) => {
    const sequence = ++request.current; setErr(null);
    try {
      const result = await start({ data: { slug, quality: quality && isQuality(quality) ? quality : undefined } });
      if (sequence !== request.current) return;
      setAuth(result); if (result.ok) { setResume(at ?? result.resumeAt); setAutoPlay(wasPlaying); }
    } catch { if (sequence === request.current) setErr("Network problem. Check your connection and retry."); }
  }, [slug, start]);
  useEffect(() => { setAuth(null); void authorize(); return () => { request.current++; }; }, [authorize]);
  const heartbeat = useCallback(async (position: number, duration: number | null, playing: boolean) => {
    if (!auth?.ok) return;
    const result = await beat({ data: { sessionId: auth.sessionId, position, duration, playing } });
    if (!result.ok && result.code === "quota") {
      playerHost.current?.querySelector("video")?.pause();
      setErr("Daily watch limit reached. Resets at midnight IST.");
    }
  }, [auth, beat]);
  if (err && !auth?.ok) return <Shell msg={err} retry={() => void authorize()} />;
  if (!auth) return <Shell msg={<span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />Authorising playback…</span>} />;
  if (!auth.ok) return <Shell msg={auth.message} back={slug} />;
  return <div className="min-h-screen bg-background"><BackHeader title={auth.movie.title} />
    <div ref={playerHost}>
      <VideoPlayer src={auth.src} title={auth.movie.title} resumeAt={resume} quality={auth.quality} qualities={auth.qualities} autoPlay={autoPlay}
        onQuality={(quality, at, playing) => void authorize(quality, at, playing)} onRetry={(at, playing) => void authorize(auth.quality, at, playing)} onHeartbeat={heartbeat} />
    </div>
    {err && <div role="alert" className="mx-auto max-w-6xl px-4 py-3 text-sm text-destructive">{err}<Button variant="outline" className="ml-3" onClick={() => void authorize(auth.quality)}>Retry</Button></div>}
  </div>;
}
function Shell({ msg, retry, back }: { msg: React.ReactNode; retry?: () => void; back?: string }) {
  return <div className="min-h-screen"><BackHeader /><div className="mx-auto max-w-md p-10 text-center"><div className="text-muted-foreground">{msg}</div>
    {retry && <Button className="mt-4" onClick={retry}>Retry</Button>}
    {back && <Button asChild variant="outline" className="mt-4"><Link to="/movie/$slug" params={{ slug: back }}>Back to details</Link></Button>}
  </div></div>;
}
