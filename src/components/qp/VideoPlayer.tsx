import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { Play, Pause, RotateCcw, RotateCw, Maximize, Minimize, Lock, Unlock, Loader2, PictureInPicture2, Sun, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  src: string; title: string; resumeAt: number; quality: string; qualities: string[];
  onQuality: (quality: string, position: number, playing: boolean) => void;
  onHeartbeat: (position: number, duration: number | null, playing: boolean) => Promise<void>;
  onRetry: (position: number, playing: boolean) => void;
  autoPlay?: boolean;
};
type NativeVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };
type Gesture = { id: number; x: number; y: number; value: number; side: "brightness" | "volume"; active: boolean; moved: boolean };
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const formatTime = (seconds: number) => {
  const s = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
  return `${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${String(s % 60).padStart(2, "0")}`;
};

export function VideoPlayer({ src, title, resumeAt, quality, qualities, onQuality, onHeartbeat, onRetry, autoPlay = false }: Props) {
  const video = useRef<NativeVideo>(null), frame = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hudTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [playing, setPlaying] = useState(false), [visible, setVisible] = useState(true);
  const [locked, setLocked] = useState(false), [fullscreen, setFullscreen] = useState(false), [immersive, setImmersive] = useState(false);
  const [position, setPosition] = useState(0), [duration, setDuration] = useState(0), [buffered, setBuffered] = useState(0);
  const [brightness, setBrightness] = useState(1), [volume, setVolume] = useState(1);
  const [waiting, setWaiting] = useState(false), [error, setError] = useState(false);
  const [skip, setSkip] = useState(10), [speed, setSpeed] = useState(1);
  const [pip, setPip] = useState(false), [volumeSupported, setVolumeSupported] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [hud, setHud] = useState<{ side: "brightness" | "volume"; value: number; unsupported?: boolean } | null>(null);
  const expanded = fullscreen || immersive;
  const notify = useCallback((message: string) => {
    setNotice(message); clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  }, []);
  const wake = useCallback(() => {
    setVisible(true); clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (video.current && !video.current.paused && !frame.current?.contains(document.activeElement)) setVisible(false);
    }, 2800);
  }, []);
  const toggle = useCallback(() => {
    const el = video.current; if (!el) return;
    if (el.paused) void el.play().catch(() => notify("Playback could not start. Try again.")); else el.pause();
    wake();
  }, [notify, wake]);
  const seek = useCallback((delta: number) => {
    const el = video.current; if (!el || !Number.isFinite(el.duration)) return;
    el.currentTime = clamp(el.currentTime + delta, 0, el.duration); setPosition(el.currentTime); wake();
  }, [wake]);
  const exit = useCallback(async () => {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    setImmersive(false);
    screen.orientation?.unlock?.(); wake();
  }, [wake]);
  const enterFullscreen = useCallback(async () => {
    if (document.fullscreenElement || immersive) { await exit(); return; }
    const el = frame.current; if (!el) return;
    if (el.requestFullscreen) {
      try {
        await el.requestFullscreen();
        const orientation = screen.orientation as ScreenOrientation & { lock?: (mode: string) => Promise<void> };
        if (orientation?.lock) await orientation.lock("landscape").catch(() => notify("Rotate your device for landscape."));
        else notify("Rotate your device for landscape.");
        wake(); return;
      } catch { /* Fall through to supported native playback or in-page expansion. */ }
    }
    if (video.current?.webkitEnterFullscreen) {
      try { video.current.webkitEnterFullscreen(); return; } catch { /* In-page fallback. */ }
    }
    setImmersive(true); notify("Browser fullscreen unavailable. Expanded within this page; rotate manually."); wake();
  }, [exit, immersive, notify, wake]);

  useEffect(() => {
    setPip(!!document.pictureInPictureEnabled);
    setVolumeSupported(!(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)));
    const changed = () => { setFullscreen(document.fullscreenElement === frame.current); if (!document.fullscreenElement) screen.orientation?.unlock?.(); wake(); };
    document.addEventListener("fullscreenchange", changed);
    return () => {
      document.removeEventListener("fullscreenchange", changed);
      clearTimeout(idleTimer.current); clearTimeout(hudTimer.current); clearTimeout(noticeTimer.current);
      screen.orientation?.unlock?.();
    };
  }, [wake]);
  useEffect(() => {
    if (!immersive) return;
    const old = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = old; };
  }, [immersive]);
  useEffect(() => { setError(false); setWaiting(false); setPosition(0); setDuration(0); setBuffered(0); setPlaying(false); wake(); }, [src, wake]);
  useEffect(() => {
    const timer = setInterval(() => {
      const el = video.current; if (!el || error || el.readyState < 1) return;
      void onHeartbeat(el.currentTime, Number.isFinite(el.duration) ? el.duration : null, !el.paused && !el.ended && !el.seeking && el.readyState >= 3).catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [onHeartbeat, error]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, select, button, textarea, [contenteditable=true]") || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "Escape" && immersive) { void exit(); return; }
      if (locked) return;
      if ([" ", "k", "ArrowRight", "ArrowLeft", "l", "j", "f", "m", "ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault(); else return;
      if (e.key === " " || e.key === "k") toggle();
      if (e.key === "ArrowRight" || e.key === "l") seek(skip);
      if (e.key === "ArrowLeft" || e.key === "j") seek(-skip);
      if (e.key === "f") void enterFullscreen();
      if (e.key === "m" && video.current) { video.current.muted = !video.current.muted; setVolume(video.current.muted ? 0 : video.current.volume); }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") adjustVolume(volume + (e.key === "ArrowUp" ? 0.05 : -0.05));
      wake();
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  });
  const showHud = (side: "brightness" | "volume", value: number, unsupported = false) => {
    setHud({ side, value, unsupported }); clearTimeout(hudTimer.current);
    hudTimer.current = setTimeout(() => setHud(null), 900);
  };
  const adjustVolume = (value: number) => {
    const el = video.current; if (!el) return;
    const next = clamp(value, 0, 1);
    if (!volumeSupported) { showHud("volume", volume, true); return; }
    try {
      el.volume = next; el.muted = next === 0;
      if (Math.abs(el.volume - next) > 0.01) { setVolumeSupported(false); showHud("volume", volume, true); return; }
      setVolume(next); showHud("volume", next);
    } catch { setVolumeSupported(false); showHud("volume", volume, true); }
  };
  const pointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-player-control]") || !e.isPrimary || e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const side = e.clientX - rect.left < rect.width / 2 ? "brightness" : "volume";
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, side, value: side === "brightness" ? brightness : volume, active: false, moved: false };
  };
  const pointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current; if (!g || g.id !== e.pointerId || locked) return;
    const dx = e.clientX - g.x, dy = g.y - e.clientY;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) g.moved = true;
    if (!g.active && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.3) {
      g.active = true; e.currentTarget.setPointerCapture(e.pointerId); clearTimeout(idleTimer.current); setVisible(false);
    }
    if (!g.active) return;
    e.preventDefault();
    const value = g.value + dy / Math.max(120, e.currentTarget.clientHeight * 0.65);
    if (g.side === "brightness") { const next = clamp(value, 0.2, 1.8); setBrightness(next); showHud("brightness", next); }
    else adjustVolume(value);
  };
  const pointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current; if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!g.moved) { if (locked) wake(); else if (visible) { clearTimeout(idleTimer.current); setVisible(false); } else wake(); }
    else if (g.active) { clearTimeout(idleTimer.current); idleTimer.current = setTimeout(() => { if (video.current?.paused) setVisible(true); }, 900); }
  };
  const control = "pointer-events-auto h-11 min-w-11 rounded-md bg-transparent text-player-foreground hover:bg-player-surface [&_svg]:size-5";
  return (
    <div ref={frame} aria-label={`${title} video player`} className={`qp-player ${immersive ? "qp-player-expanded" : ""}`} style={{ "--video-brightness": brightness, "--buffered": `${duration ? clamp(buffered / duration * 100, 0, 100) : 0}%` } as CSSProperties}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { gesture.current = null; }}
      onMouseMove={(e) => { if (e.buttons === 0 && e.movementX + Math.abs(e.movementY) !== 0) wake(); }}>
      <video ref={video} src={src} className="qp-player-video" playsInline preload="metadata"
        onLoadedMetadata={(e) => { const el = e.currentTarget; const d = Number.isFinite(el.duration) ? el.duration : 0; setDuration(d); el.currentTime = clamp(resumeAt, 0, d); el.playbackRate = speed; if (autoPlay) void el.play().catch(() => wake()); }}
        onPlay={() => { setPlaying(true); wake(); }} onPause={() => { setPlaying(false); wake(); }} onEnded={() => { setPlaying(false); wake(); }}
        onWaiting={() => setWaiting(true)} onPlaying={() => setWaiting(false)} onSeeked={() => setWaiting(false)}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)} onVolumeChange={(e) => setVolume(e.currentTarget.muted ? 0 : e.currentTarget.volume)}
        onProgress={(e) => { const b = e.currentTarget.buffered; if (b.length) setBuffered(b.end(b.length - 1)); }}
        onError={() => { setError(true); setWaiting(false); wake(); }} />
      <div className={`qp-player-touch-zone qp-player-touch-left ${locked ? "qp-player-touch-locked" : ""}`} aria-hidden="true" />
      <div className={`qp-player-touch-zone qp-player-touch-right ${locked ? "qp-player-touch-locked" : ""}`} aria-hidden="true" />
      {waiting && !error && <Loader2 aria-label="Buffering" className="pointer-events-none absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 animate-spin" />}
      {hud && <div role="status" className={`qp-player-hud ${hud.side === "brightness" ? "left-[12%]" : "right-[12%]"}`}>
        {hud.side === "brightness" ? <Sun className="size-5" /> : <Volume2 className="size-5" />}
        <span className="text-xs tabular-nums">{hud.unsupported ? "Use device volume" : `${Math.round(hud.value * 100)}%`}</span>
        {!hud.unsupported && <progress aria-label={hud.side === "brightness" ? "Video brightness" : "Media volume"} max={hud.side === "brightness" ? 180 : 100} value={hud.value * 100} className="h-1 w-16 accent-primary" />}
      </div>}
      {notice && <div role="status" className="qp-player-notice">{notice}</div>}
      {error && <div role="alert" data-player-control className="qp-player-error"><p className="text-sm">Video could not load.</p><Button variant="secondary" onClick={() => onRetry(position, playing)}>Retry</Button></div>}
      <div className={`qp-player-chrome ${visible ? "" : "qp-player-chrome-hidden"}`} inert={!visible} aria-hidden={!visible} onFocusCapture={wake}>
        <div className="flex items-center justify-end gap-1" data-player-control>
          <Button variant="ghost" size="icon" className={control} title={locked ? "Unlock controls" : "Lock controls"} aria-label={locked ? "Unlock controls" : "Lock controls"} aria-pressed={locked} onClick={() => { setLocked(!locked); wake(); }}>{locked ? <Lock /> : <Unlock />}</Button>
          <Button variant="ghost" size="icon" className={control} title={expanded ? "Exit fullscreen" : "Fullscreen"} aria-label={expanded ? "Exit fullscreen" : "Fullscreen"} onClick={() => void enterFullscreen()}>{expanded ? <Minimize /> : <Maximize />}</Button>
        </div>
        {!locked && <>
          <div className="flex items-center justify-center gap-4" data-player-control>
            <Button variant="ghost" size="icon" className={control} title={`Back ${skip} seconds`} aria-label={`Back ${skip} seconds`} onClick={() => seek(-skip)}><RotateCcw /></Button>
            <Button variant="ghost" size="icon" className={`${control} h-12 w-12 [&_svg]:size-7`} aria-label={playing ? "Pause" : "Play"} title={playing ? "Pause" : "Play"} disabled={error} onClick={toggle}>{playing ? <Pause /> : <Play className="fill-current" />}</Button>
            <Button variant="ghost" size="icon" className={control} title={`Forward ${skip} seconds`} aria-label={`Forward ${skip} seconds`} onClick={() => seek(skip)}><RotateCw /></Button>
          </div>
          <div className="pointer-events-auto min-w-0" data-player-control onPointerDown={wake}>
            <div className="qp-player-timeline"><input aria-label="Seek" type="range" min={0} max={duration} step={0.1} value={clamp(position, 0, duration)} disabled={!duration || error} onChange={(e) => { if (video.current) { video.current.currentTime = +e.target.value; setPosition(+e.target.value); } wake(); }} className="h-6 w-full accent-primary" /></div>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 text-xs">
              <span className="shrink-0 tabular-nums">{formatTime(position)} / {formatTime(duration)}</span>
              <div className="flex min-w-0 flex-wrap items-center gap-1">
                <select aria-label="Skip interval" title="Skip interval" value={skip} onChange={(e) => { setSkip(+e.target.value); wake(); }} className="qp-player-select">{[5, 10, 15, 30].map(s => <option key={s} value={s}>{s}s</option>)}</select>
                <select aria-label="Speed" title="Playback speed" value={speed} onChange={(e) => { setSpeed(+e.target.value); if (video.current) video.current.playbackRate = +e.target.value; wake(); }} className="qp-player-select">{[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => <option key={s} value={s}>{s}x</option>)}</select>
                {qualities.length > 1 && <select aria-label="Quality" title="Quality" value={quality} onChange={(e) => onQuality(e.target.value, video.current?.currentTime ?? position, playing)} className="qp-player-select">{qualities.map(q => <option key={q}>{q}</option>)}</select>}
                {pip && <Button variant="ghost" size="icon" className={control} aria-label="Picture in picture" title="Picture in picture" onClick={() => { const el = video.current; if (!el) return; void (document.pictureInPictureElement ? document.exitPictureInPicture() : el.requestPictureInPicture()).catch(() => notify("Picture in picture unavailable.")); wake(); }}><PictureInPicture2 /></Button>}
              </div>
            </div>
          </div>
        </>}
      </div>
    </div>
  );
}
