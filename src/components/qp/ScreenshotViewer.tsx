import { useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Shot = { id: string; url: string; caption: string | null };

export function ScreenshotViewer({ shots, index, onIndex, title }: { shots: Shot[]; index: number | null; onIndex: (i: number | null) => void; title: string }) {
  const touchX = useRef<number | null>(null);
  const open = index !== null;
  const prev = () => index !== null && onIndex((index - 1 + shots.length) % shots.length);
  const next = () => index !== null && onIndex((index + 1) % shots.length);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "ArrowLeft") prev(); if (e.key === "ArrowRight") next(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  if (!open) return null;
  const s = shots[index];
  return (
    <Dialog open onOpenChange={(o) => !o && onIndex(null)}>
      <DialogContent className="max-w-5xl border-none bg-background/95 p-0 [&>button]:hidden">
        <DialogTitle className="sr-only">{title} screenshot {index + 1}</DialogTitle>
        <div className="relative"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 40) (dx > 0 ? prev : next)();
            touchX.current = null;
          }}>
          <img src={s.url} alt={s.caption ?? `${title} screenshot ${index + 1}`} className="max-h-[80vh] w-full rounded-lg object-contain" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
            <span className="rounded-full bg-background/80 px-3 py-1 text-sm" aria-live="polite">{index + 1} / {shots.length}</span>
            <button onClick={() => onIndex(null)} aria-label="Close viewer" className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-background/80"><X className="h-5 w-5" /></button>
          </div>
          {shots.length > 1 && (
            <>
              <button onClick={prev} aria-label="Previous screenshot" className="absolute left-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/80"><ChevronLeft /></button>
              <button onClick={next} aria-label="Next screenshot" className="absolute right-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/80"><ChevronRight /></button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
