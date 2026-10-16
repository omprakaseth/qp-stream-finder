import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Film } from "lucide-react";
import type { MovieCardData } from "@/lib/catalog.functions";

export function Poster({
  src,
  title,
  className = "",
}: {
  src: string | null;
  title: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-accent to-secondary p-3 text-center ${className}`}
      >
        <Film className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">{title} poster unavailable</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`${title} poster`}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}

export function MovieCard({ movie }: { movie: MovieCardData }) {
  return (
    <Link to="/movie/$slug" params={{ slug: movie.slug }} className="group block rounded-md">
      <div className="aspect-[2/3] overflow-hidden rounded-md border border-border bg-card transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:shadow-glow">
        <Poster src={movie.poster_url} title={movie.title} className="h-full w-full" />
      </div>
      <h3 className="mt-1 line-clamp-1 text-xs sm:text-sm font-semibold">{movie.title}</h3>
    </Link>
  );
}

export function MovieCardSkeleton() {
  return (
    <div>
      <div className="aspect-[2/3] animate-pulse rounded-md bg-muted" />
      <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-muted" />
    </div>
  );
}
