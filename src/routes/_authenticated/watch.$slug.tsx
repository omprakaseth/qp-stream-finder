import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, RotateCw, Maximize, Lock, Unlock, Loader2, PictureInPicture2, Sun, Volume2 } from "lucide-react";
import { BackHeader } from "@/components/qp/SiteChrome";
import { Button } from "@/components/ui/button";
import { startPlayback, playbackHeartbeat } from "@/lib/media.functions";

export const Route = createFileRoute("/_authenticated/watch/$slug")({
  head: () => ({ meta: [{ title: "Watch — QP Movie" }, { name: "description", content: "Watch on QP Movie." }, { property: "og:title", content: "Watch — QP Movie" }, { property: "og:description", content: "Watch on QP Movie." }, { name: "robots", content: "noindex" }] }),
  component: Watch,
});

type Auth = Awaited<ReturnType<typeof startPlayback>>;
const fmt = (s: number) => { if (!isFinite(s)) return "0:00"; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60); return (h ? `${h}:${String(m).padStart(2, "0")}` : `${m}`) + `:${String(x).padStart(2, "0")}`; };

function Watch() {
  const { slug } = Route.useParams();
  const start = useServerFn(startPlayback);
  const beat = useServerFn(playbackHeartbeat);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const v = useRef<HTMLVideoElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [buf, setBuf] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [show, setShow] = useState(true);
  const [locked, setLocked] = useState(false);
  const [skip, setSkip] = useState(10);
  const [bright, setBright] = useState(1);
  const [vol, setVol] = useState(1);
  const [speed, setSpeed] = useState(1);
  const hide = useRef<number | undefined>(undefined);

  const authorize = useCallback(async (quality?: string, at?: number) => {
    setErr(null);
    try {
      const r = await start({ data: { slug, quality: quality as "720p" | undefined } });
      setAuth(r);
      if (r.ok) requestAnimationFrame(() => { if (v.current) v.current.currentTime = at ?? r.resumeAt; });
    } catch { setErr("Network problem. Check your connection and retry."); }
  }, [slug, start]);
  useEffect(() => { authorize(); }, [authorize]);

  useEffect(() => {
    if (!auth?.ok) return;
    const id = window.setInterval(async () => {
      const el = v.current; if (!el) return;
      try {
        const r = await beat({ data: { sessionId: auth.sessionId, position: el.currentTime, duration: isFinite(el.duration) ? el.duration : null, playing: !el.paused } });
        if (!r.ok && r.code === "quota") { el.pause(); setErr("Daily watch limit reached (5 movies). Resets at midnight IST."); }
      } catch { /* offline: next beat retries */ }
    }, 15000);
    return () => window.clearInterval(id);
  }, [auth, beat]);

  const poke = () => { setShow(true); window.clearTimeout(hide.current); hide.current = window.setTimeout(() => v.current && !v.current.paused && setShow(false), 3000); };
  const toggle = () => { const el = v.current; if (!el) return; if (el.paused) el.play().catch(() => {}); else el.pause(); };
  const seek = (d: number) => { const el = v.current; if (el) el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + d)); };
  const fs = () => { const w = wrap.current; if (!w) return; if (document.fullscreenElement) document.exitFullscreen(); else w.requestFullscreen?.().then(() => (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })?.lock?.("landscape").catch(() => {})).catch(() => {}); };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (locked || (e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "SELECT") return;
      if (e.key === " " || e.key === "k") { e.preventDefault(); toggle(); }
      if (e.key === "ArrowRight" || e.key === "l") seek(skip);
      if (e.key === "ArrowLeft" || e.key === "j") seek(-skip);
      if (e.key === "f") fs();
      if (e.key === "m" && v.current) v.current.muted = !v.current.muted;
      poke();
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });

  if (err && !auth?.ok) return <Shell msg={err} retry={() => authorize()} />;
  if (!auth) return <Shell msg={<span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Authorising playback…</span>} />;
  if (!auth.ok) return <Shell msg={auth.message} back={slug} />;

  const lastTap = { t: 0 };
  return (
    <div className="min-h-screen bg-background">
      <BackHeader title={auth.movie.title} />
      <div ref={wrap} className="relative mx-auto aspect-video max-h-[calc(100vh-4rem)] w-full max-w-6xl select-none bg-background" onMouseMove={poke}
        onClick={(e) => {
          if (locked) { poke(); return; }
          const now = Date.now(); const x = e.clientX - e.currentTarget.getBoundingClientRect().left; const w = e.currentTarget.clientWidth;
          if (now - lastTap.t < 300) { if (x < w / 3) seek(-skip); else if (x > (2 * w) / 3) seek(skip); }
          lastTap.t = now; poke();
        }}>
        <video ref={v} src={auth.src} className="h-full w-full" style={{ filter: `brightness(${bright})` }} playsInline preload="metadata"
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onWaiting={() => setWaiting(true)} onPlaying={() => setWaiting(false)}
          onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
          onProgress={(e) => { const b = e.currentTarget.buffered; if (b.length) setBuf(b.end(b.length - 1)); }}
          onError={() => { const at = v.current?.currentTime; authorize(auth.quality, at); /* re-authorise: link may have expired */ }} />
        {waiting && <Loader2 className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-spin" />}
        {err && <div className="absolute inset-x-4 top-4 rounded-lg bg-background/90 p-3 text-sm">{err}</div>}
        <div className={`absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-background/90 via-transparent to-background/50 p-3 transition-opacity ${show ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-end gap-2">
            <button aria-label={locked ? "Unlock controls" : "Lock controls"} onClick={() => setLocked(!locked)} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-background/60">{locked ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}</button>
          </div>
          {!locked && <>
            <div className="flex items-center justify-between">
              <label className="flex flex-col items-center gap-1 text-xs"><Sun className="h-4 w-4" /><input aria-label="Brightness (video only)" type="range" min={0.4} max={1.6} step={0.05} value={bright} onChange={(e) => setBright(+e.target.value)} className="h-24 w-6 [writing-mode:vertical-lr] [direction:rtl]" /></label>
              <div className="flex items-center gap-6">
                <button aria-label={`Back ${skip} seconds`} onClick={() => seek(-skip)} className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-background/60"><RotateCcw /></button>
                <button aria-label={playing ? "Pause" : "Play"} onClick={toggle} className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent-gradient">{playing ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 fill-current" />}</button>
                <button aria-label={`Forward ${skip} seconds`} onClick={() => seek(skip)} className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-background/60"><RotateCw /></button>
              </div>
              <label className="flex flex-col items-center gap-1 text-xs"><Volume2 className="h-4 w-4" /><input aria-label="Volume" type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => { setVol(+e.target.value); if (v.current) v.current.volume = +e.target.value; }} className="h-24 w-6 [writing-mode:vertical-lr] [direction:rtl]" /></label>
            </div>
            <div>
              <div className="relative h-1.5 rounded bg-muted"><div className="absolute h-full rounded bg-foreground/30" style={{ width: `${dur ? (buf / dur) * 100 : 0}%` }} />
                <input aria-label="Seek" type="range" min={0} max={dur || 0} step={1} value={t} onChange={(e) => { if (v.current) v.current.currentTime = +e.target.value; }} className="absolute inset-0 w-full accent-[var(--primary)]" /></div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span>{fmt(t)} / {fmt(dur)}</span>
                <div className="ml-auto flex items-center gap-2">
                  <select aria-label="Skip interval" value={skip} onChange={(e) => setSkip(+e.target.value)} className="h-9 rounded bg-background/70 px-1">{[5, 10, 15, 30].map((s) => <option key={s} value={s}>{s}s</option>)}</select>
                  <select aria-label="Speed" value={speed} onChange={(e) => { setSpeed(+e.target.value); if (v.current) v.current.playbackRate = +e.target.value; }} className="h-9 rounded bg-background/70 px-1">{[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => <option key={s} value={s}>{s}x</option>)}</select>
                  {auth.qualities.length > 1 && <select aria-label="Quality" value={auth.quality} onChange={(e) => authorize(e.target.value, v.current?.currentTime)} className="h-9 rounded bg-background/70 px-1">{auth.qualities.map((q) => <option key={q}>{q}</option>)}</select>}
                  {typeof document !== "undefined" && document.pictureInPictureEnabled && <button aria-label="Picture in picture" onClick={() => v.current?.requestPictureInPicture().catch(() => {})} className="p-2"><PictureInPicture2 className="h-5 w-5" /></button>}
                  <button aria-label="Fullscreen" onClick={fs} className="p-2"><Maximize className="h-5 w-5" /></button>
                </div>
              </div>
            </div>
          </>}
        </div>
      </div>
      <p className="mx-auto max-w-6xl px-4 py-3 text-xs text-muted-foreground">Brightness adjusts the video picture only — browsers can't change your device's screen brightness. Shortcuts: Space play/pause, ←/→ skip, F fullscreen, M mute.</p>
    </div>
  );
}

function Shell({ msg, retry, back }: { msg: React.ReactNode; retry?: () => void; back?: string }) {
  return (
    <div className="min-h-screen"><BackHeader />
      <div className="mx-auto max-w-md p-10 text-center">
        <div className="text-muted-foreground">{msg}</div>
        {retry && <Button className="mt-4" onClick={retry}>Retry</Button>}
        {back && <Button asChild variant="outline" className="mt-4"><Link to="/movie/$slug" params={{ slug: back }}>Back to details</Link></Button>}
      </div>
    </div>
  );
}
