import { Link } from "@tanstack/react-router";

export function QPMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="qpg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--magenta)" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#qpg)" />
      <circle cx="15.5" cy="19" r="7" fill="none" stroke="var(--primary-foreground)" strokeWidth="3.2" />
      <path d="M19.5 23.5 23 27" stroke="var(--primary-foreground)" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M26 31V12h4.2a4.6 4.6 0 0 1 0 9.2H26" fill="none" stroke="var(--primary-foreground)" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ to = "/" }: { to?: "/" | "/admin" }) {
  return (
    <Link to={to} className="flex items-center gap-2 rounded-lg" aria-label="QP Movie home">
      <QPMark />
      <span className="font-display text-lg font-semibold tracking-tight">
        QP <span className="text-muted-foreground font-medium">Movie</span>
      </span>
    </Link>
  );
}
