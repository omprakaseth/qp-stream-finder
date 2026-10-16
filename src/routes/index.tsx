import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Search, SlidersHorizontal, Mic, X, RefreshCw, Film } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/qp/SiteChrome";
import { MovieCard, MovieCardSkeleton } from "@/components/qp/MovieCard";
import { PaginationBar } from "@/components/qp/PaginationBar";
import { ScrollToGrid } from "@/components/qp/ScrollToGrid";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { listMovies, getFacets } from "@/lib/catalog.functions";
import { qualityLabel } from "@/lib/quota";

const searchSchema = z.object({
  q: z.string().max(100).optional(),
  genre: z.string().max(40).optional(),
  language: z.string().max(40).optional(),
  yearFrom: z.number().int().optional(),
  yearTo: z.number().int().optional(),
  quality: z.enum(["480p", "720p", "1080p", "2160p"]).optional(),
  sort: z.enum(["popular", "newest", "oldest", "title"]).optional(),
  page: z.number().int().min(1).optional(),
});
type S = z.infer<typeof searchSchema>;

const facetsQuery = queryOptions({
  queryKey: ["facets"],
  queryFn: () => getFacets(),
  staleTime: 60_000,
});
const listQuery = (s: S) =>
  queryOptions({
    queryKey: ["movies", s],
    queryFn: () => listMovies({ data: { ...s, sort: s.sort ?? "popular", page: s.page ?? 1 } }),
    placeholderData: keepPreviousData,
  });

export const Route = createFileRoute("/")({
  validateSearch: (s) => searchSchema.parse(s),
  loaderDeps: ({ search }) => search,
  loader: ({ context }) => context.queryClient.ensureQueryData(facetsQuery),
  head: () => ({
    meta: [
      { title: "QP Movie — Discover licensed movies" },
      {
        name: "description",
        content:
          "Browse, search and watch licensed movies on QP Movie. Mobile-first, fast and accessible.",
      },
      { property: "og:title", content: "QP Movie — Discover licensed movies" },
      {
        property: "og:description",
        content: "Browse, search and watch licensed movies on QP Movie.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const { data: facets } = useSuspenseQuery(facetsQuery);
  const list = useQuery(listQuery(search));
  const gridRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(search.q ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const set = (patch: Partial<S>, scroll = false) => {
    navigate({ search: (p) => ({ ...p, ...patch }), replace: true });
    if (scroll) gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if ((search.q ?? "") !== text) set({ q: text || undefined, page: undefined });
    }, 350);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;
  const activeFilters = [
    search.genre,
    search.language,
    search.yearFrom,
    search.yearTo,
    search.quality,
  ].filter(Boolean).length;
  const f = facets.featured;

  return (
    <div className="min-h-screen">
      <SiteHeader onSearch={() => inputRef.current?.focus()} />
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <label htmlFor="q" className="sr-only">
              Search movies
            </label>
            <input
              id="q"
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search movies…"
              className="h-12 w-full rounded-xl border border-input bg-card pl-10 pr-20 text-sm placeholder:text-muted-foreground"
            />
            <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
              {text && (
                <button
                  onClick={() => setText("")}
                  aria-label="Clear search"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <VoiceSearch onResult={setText} />
            </div>
          </div>
          <button
            onClick={() => setFiltersOpen(true)}
            aria-label="Filters and sorting"
            className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl border border-input bg-card hover:bg-secondary"
          >
            <SlidersHorizontal className="h-5 w-5" />
            {activeFilters > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {f && !search.q && !activeFilters && (search.page ?? 1) === 1 && (
          <section
            aria-label="Featured"
            className="relative mt-5 overflow-hidden rounded-2xl border border-border"
          >
            <div className="aspect-[16/9] sm:aspect-[21/8]">
              {f.backdrop_url ? (
                <img src={f.backdrop_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-[radial-gradient(ellipse_at_top_right,var(--primary),transparent_60%),radial-gradient(ellipse_at_bottom_left,var(--magenta),transparent_55%)] opacity-60" />
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            <div className="absolute bottom-0 p-5 sm:p-8">
              {f.is_demo && (
                <span className="mb-2 inline-block rounded-full border border-border bg-background/70 px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Demo listing
                </span>
              )}
              <h2 className="text-2xl font-semibold sm:text-4xl">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {[...(f.genres ?? []), f.release_year].filter(Boolean).join(" • ")}
              </p>
              <Button asChild className="mt-4 bg-accent-gradient shadow-glow">
                <Link to="/movie/$slug" params={{ slug: f.slug }}>
                  Explore
                </Link>
              </Button>
            </div>
          </section>
        )}

        <section ref={gridRef} aria-labelledby="grid-h" className="scroll-mt-20 pt-5">
          <div className="mb-3 flex items-end justify-between">
            <h2 id="grid-h" className="text-xl font-semibold">
              {search.q ? `Results for “${search.q}”` : "Movies"}
            </h2>
            {list.data && (
              <span className="text-sm text-muted-foreground">{list.data.total} titles</span>
            )}
          </div>
          {list.isError ? (
            <div className="rounded-2xl border border-border p-8 text-center">
              <p>We couldn't load movies. Check your connection.</p>
              <Button variant="outline" className="mt-4" onClick={() => list.refetch()}>
                <RefreshCw className="h-4 w-4" /> Retry
              </Button>
            </div>
          ) : list.isPending ? (
            <div className="grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {Array.from({ length: 12 }, (_, i) => (
                <MovieCardSkeleton key={i} />
              ))}
            </div>
          ) : list.data.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <Film className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">No movies match your search</p>
              <p className="text-sm text-muted-foreground">Try another title or reset filters.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setText("");
                  navigate({ search: {}, replace: true });
                }}
              >
                Reset
              </Button>
            </div>
          ) : (
            <div
              className={`grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 ${list.isPlaceholderData ? "opacity-60" : ""}`}
            >
              {list.data.items.map((m) => (
                <MovieCard key={m.id} movie={m} />
              ))}
            </div>
          )}
          <PaginationBar
            page={search.page ?? 1}
            totalPages={totalPages}
            onChange={(p) => set({ page: p }, true)}
          />
        </section>
      </div>
      <SiteFooter />
      <ScrollToGrid target={gridRef} />
      <FilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        facets={facets}
        value={search}
        onApply={(v) => {
          set({ ...v, page: undefined }, true);
          setFiltersOpen(false);
        }}
      />
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-10 rounded-lg border px-3.5 text-sm transition-colors ${active ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary"}`}
    >
      {children}
    </button>
  );
}

function FilterSheet({
  open,
  onOpenChange,
  facets,
  value,
  onApply,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  facets: { genres: string[]; languages: string[]; minYear: number; maxYear: number };
  value: S;
  onApply: (v: Partial<S>) => void;
}) {
  const [v, setV] = useState<Partial<S>>(value);
  useEffect(() => {
    if (open) setV(value);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const years = Array.from(
    { length: facets.maxYear - facets.minYear + 1 },
    (_, i) => facets.maxYear - i,
  );
  const sel = "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="flex-row items-center justify-between px-0 pr-8">
          <SheetTitle>Filters</SheetTitle>
          <button className="text-sm font-semibold text-primary" onClick={() => setV({})}>
            Reset
          </button>
        </SheetHeader>
        <SheetDescription className="sr-only">Filter and sort the catalogue</SheetDescription>
        <div className="space-y-6 pb-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Genre</h3>
            <div className="flex flex-wrap gap-2">
              <Chip active={!v.genre} onClick={() => setV({ ...v, genre: undefined })}>
                All
              </Chip>
              {facets.genres.map((g) => (
                <Chip key={g} active={v.genre === g} onClick={() => setV({ ...v, genre: g })}>
                  {g}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Language</h3>
            <div className="flex flex-wrap gap-2">
              <Chip active={!v.language} onClick={() => setV({ ...v, language: undefined })}>
                All
              </Chip>
              {facets.languages.map((g) => (
                <Chip key={g} active={v.language === g} onClick={() => setV({ ...v, language: g })}>
                  {g}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Year</h3>
            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="Year from"
                className={sel}
                value={v.yearFrom ?? ""}
                onChange={(e) =>
                  setV({ ...v, yearFrom: e.target.value ? +e.target.value : undefined })
                }
              >
                <option value="">From</option>
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
              <select
                aria-label="Year to"
                className={sel}
                value={v.yearTo ?? ""}
                onChange={(e) =>
                  setV({ ...v, yearTo: e.target.value ? +e.target.value : undefined })
                }
              >
                <option value="">To</option>
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Available quality</h3>
            <div className="flex flex-wrap gap-2">
              <Chip active={!v.quality} onClick={() => setV({ ...v, quality: undefined })}>
                All
              </Chip>
              {(["480p", "720p", "1080p", "2160p"] as const).map((q) => (
                <Chip key={q} active={v.quality === q} onClick={() => setV({ ...v, quality: q })}>
                  {qualityLabel(q)}
                </Chip>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Only titles with verified media in that quality are shown.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Sort by</h3>
            <select
              aria-label="Sort by"
              className={sel}
              value={v.sort ?? "popular"}
              onChange={(e) => setV({ ...v, sort: e.target.value as S["sort"] })}
            >
              <option value="popular">Most popular</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="title">Title A–Z</option>
            </select>
          </div>
          <Button
            size="lg"
            className="w-full bg-accent-gradient"
            onClick={() =>
              onApply({
                genre: v.genre,
                language: v.language,
                yearFrom: v.yearFrom,
                yearTo: v.yearTo,
                quality: v.quality,
                sort: v.sort,
              })
            }
          >
            Apply filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

type SR = {
  start: () => void;
  onresult: (e: { results: { 0: { transcript: string } }[] }) => void;
  onerror: () => void;
  onend: () => void;
  lang: string;
};
function VoiceSearch({ onResult }: { onResult: (t: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  useEffect(() => {
    setSupported(
      !!(
        (window as never as Record<string, unknown>).SpeechRecognition ||
        (window as never as Record<string, unknown>).webkitSpeechRecognition
      ),
    );
  }, []);
  if (!supported) return null;
  return (
    <button
      aria-label={listening ? "Listening" : "Search by voice"}
      aria-pressed={listening}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary ${listening ? "text-primary" : ""}`}
      onClick={() => {
        const W = window as never as Record<string, new () => SR>;
        const r = new (W.SpeechRecognition || W.webkitSpeechRecognition)();
        r.lang = "en-IN";
        r.onresult = (e) => onResult(e.results[0][0].transcript);
        r.onerror = () => setListening(false);
        r.onend = () => setListening(false);
        setListening(true);
        r.start(); // browser asks for microphone permission
      }}
    >
      <Mic className="h-4 w-4" />
    </button>
  );
}
