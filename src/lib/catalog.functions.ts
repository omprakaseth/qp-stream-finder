import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const PAGE_SIZE = 12;

const listSchema = z.object({
  q: z.string().trim().max(100).optional(),
  genre: z.string().max(40).optional(),
  language: z.string().max(40).optional(),
  yearFrom: z.number().int().min(1888).max(2100).optional(),
  yearTo: z.number().int().min(1888).max(2100).optional(),
  quality: z.enum(["480p", "720p", "1080p", "2160p"]).optional(),
  sort: z.enum(["popular", "newest", "oldest", "title"]).default("popular"),
  page: z.number().int().min(1).max(10000).default(1),
});
export type CatalogQuery = z.input<typeof listSchema>;

export type MovieCardData = { id: string; slug: string; title: string; poster_url: string | null };

export const listMovies = createServerFn({ method: "GET" })
  .inputValidator((d: CatalogQuery) => listSchema.parse(d))
  .handler(async ({ data }) => {
    const { publicClient } = await import("./server-utils.server");
    const sb = publicClient();
    let q = sb.from("movies").select("id,slug,title,poster_url", { count: "exact" }).eq("status", "published");
    if (data.q) q = q.ilike("title", `%${data.q.replace(/[%_\\,()]/g, " ")}%`);
    if (data.genre) q = q.contains("genres", [data.genre]);
    if (data.language) q = q.eq("language", data.language);
    if (data.yearFrom) q = q.gte("release_year", data.yearFrom);
    if (data.yearTo) q = q.lte("release_year", data.yearTo);
    if (data.quality) {
      const { data: ids } = await sb.rpc("movies_with_quality", { _quality: data.quality });
      const list = ((ids as unknown as string[]) ?? []).slice(0, 1000);
      if (!list.length) return { items: [] as MovieCardData[], total: 0, page: data.page, pageSize: PAGE_SIZE };
      q = q.in("id", list);
    }
    if (data.sort === "popular") q = q.order("popularity", { ascending: false });
    if (data.sort === "newest") q = q.order("release_year", { ascending: false, nullsFirst: false });
    if (data.sort === "oldest") q = q.order("release_year", { ascending: true, nullsFirst: false });
    if (data.sort === "title") q = q.order("title");
    q = q.order("id");
    const from = (data.page - 1) * PAGE_SIZE;
    const { data: rows, count, error } = await q.range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error("Catalogue is temporarily unavailable.");
    return { items: (rows ?? []) as MovieCardData[], total: count ?? 0, page: data.page, pageSize: PAGE_SIZE };
  });

export const getFacets = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("./server-utils.server");
  const sb = publicClient();
  const { data } = await sb.from("movies").select("genres,language,release_year").eq("status", "published").limit(2000);
  const genres = new Set<string>();
  const languages = new Set<string>();
  const years: number[] = [];
  for (const r of data ?? []) {
    r.genres?.forEach((g) => genres.add(g));
    if (r.language) languages.add(r.language);
    if (r.release_year) years.push(r.release_year);
  }
  const { data: featured } = await sb
    .from("movies")
    .select("id,slug,title,genres,release_year,backdrop_url,poster_url,is_demo")
    .eq("status", "published")
    .eq("featured", true)
    .limit(1)
    .maybeSingle();
  return {
    genres: [...genres].sort(),
    languages: [...languages].sort(),
    minYear: years.length ? Math.min(...years) : 1950,
    maxYear: years.length ? Math.max(...years) : new Date().getFullYear(),
    featured,
  };
});

export const getMovie = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().regex(/^[a-z0-9-]{1,80}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { publicClient } = await import("./server-utils.server");
    const sb = publicClient();
    const { data: movie } = await sb.from("movies").select("*").eq("slug", data.slug).eq("status", "published").maybeSingle();
    if (!movie) return null;
    const [shots, credits, avail, rating, reviews] = await Promise.all([
      sb.from("movie_screenshots").select("id,url,caption").eq("movie_id", movie.id).order("sort_order").limit(9),
      sb.from("movie_credits").select("person_name,credit_role").eq("movie_id", movie.id).order("sort_order"),
      sb.rpc("movie_availability", { _movie_id: movie.id }),
      sb.rpc("movie_rating", { _movie_id: movie.id }),
      sb.from("reviews").select("id,author_name,rating,body,created_at,user_id").eq("movie_id", movie.id).eq("status", "visible").order("created_at", { ascending: false }).limit(20),
    ]);
    const { created_by: _c, ...publicMovie } = movie;
    return {
      movie: publicMovie,
      screenshots: shots.data ?? [],
      credits: credits.data ?? [],
      availability: (avail.data ?? { published: true }) as {
        published: boolean;
        can_stream?: boolean;
        can_download?: boolean;
        guest_download?: boolean;
        qualities?: { quality: string; size_bytes: number | null }[];
      },
      rating: (rating.data ?? { average: null, count: 0 }) as { average: number | null; count: number },
      reviews: reviews.data ?? [],
    };
  });

export const submitContentReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      name: z.string().trim().min(2).max(100),
      email: z.string().trim().email().max(255),
      movieSlug: z.string().max(80).optional(),
      claim: z.string().trim().min(20).max(4000),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { admin, rateLimit, ipHash } = await import("./server-utils.server");
    await rateLimit("report:" + (await ipHash()), 3, 3600);
    const a = await admin();
    let movieId: string | null = null;
    if (data.movieSlug) {
      const { data: m } = await a.from("movies").select("id").eq("slug", data.movieSlug).maybeSingle();
      movieId = m?.id ?? null;
    }
    const { error } = await a.from("content_reports").insert({ movie_id: movieId, reporter_name: data.name, reporter_email: data.email, claim: data.claim });
    if (error) throw new Error("Could not submit report. Please try again.");
    return { ok: true };
  });
