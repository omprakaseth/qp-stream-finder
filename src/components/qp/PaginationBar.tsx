import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function pages(cur: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const s = Math.max(2, cur - 1);
  const e = Math.min(total - 1, cur + 1);
  if (s > 2) out.push("…");
  for (let i = s; i <= e; i++) out.push(i);
  if (e < total - 1) out.push("…");
  out.push(total);
  return out;
}

export function PaginationBar({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const [go, setGo] = useState("");
  if (totalPages <= 1) return null;
  const btn = "inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-border px-3 text-sm transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-40";
  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button className={btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" /> <span className="ml-1">Previous</span>
        </button>
        {pages(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-1 text-muted-foreground">…</span>
          ) : (
            <button key={p} aria-current={p === page ? "page" : undefined} onClick={() => onChange(p)}
              className={`${btn} ${p === page ? "border-transparent bg-primary text-primary-foreground hover:bg-primary" : ""}`}>
              {p}
            </button>
          ),
        )}
        <button className={btn} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          <span className="mr-1">Next</span> <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <form
        className="flex items-center gap-2 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const n = parseInt(go, 10);
          if (n >= 1 && n <= totalPages) { onChange(n); setGo(""); }
        }}
      >
        <label htmlFor="goto" className="text-muted-foreground">Go to page</label>
        <input id="goto" inputMode="numeric" value={go} onChange={(e) => setGo(e.target.value.replace(/\D/g, ""))}
          className="h-10 w-16 rounded-lg border border-input bg-transparent px-2 text-center" placeholder={`1–${totalPages}`} />
        <button type="submit" className={btn}>Go</button>
      </form>
    </nav>
  );
}
