import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowUp } from "lucide-react";

/** Appears while scrolling down past the grid, hides after inactivity; scrolls to grid start. */
export function ScrollToGrid({ target }: { target: RefObject<HTMLElement | null> }) {
  const [show, setShow] = useState(false);
  const last = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const gridTop = (target.current?.getBoundingClientRect().top ?? 0) + y;
      const farFromGrid = y > gridTop + 600;
      if (farFromGrid && Math.abs(y - last.current) > 4) setShow(true);
      if (!farFromGrid) setShow(false);
      last.current = y;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setShow(false), 2200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); window.clearTimeout(timer.current); };
  }, [target]);
  return (
    <button
      aria-label="Back to movie grid"
      onClick={() => target.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
      className={`fixed bottom-5 right-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-gradient text-primary-foreground shadow-glow transition-all duration-300 ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}
      tabIndex={show ? 0 : -1}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
