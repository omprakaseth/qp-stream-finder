import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, UserRound, Search, Heart } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/auth";

export function IconLink({ to, label, children }: { to: "/account" | "/auth"; label: string; children: ReactNode }) {
  return (
    <Link to={to} aria-label={label} className="inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary">
      {children}
    </Link>
  );
}

export function SiteHeader({ onSearch }: { onSearch?: () => void }) {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-1">
          {onSearch && (
            <button onClick={onSearch} aria-label="Search movies" className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary">
              <Search className="h-5 w-5" />
            </button>
          )}
          <IconLink to={user ? "/account" : "/auth"} label={user ? "Your account" : "Sign in"}>
            <UserRound className="h-5 w-5" />
          </IconLink>
        </div>
      </div>
    </header>
  );
}

export function BackHeader({ title, right }: { title?: string; right?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4">
        <button
          onClick={() => (window.history.length > 1 ? router.history.back() : router.navigate({ to: "/" }))}
          aria-label="Go back"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {title ? <h1 className="truncate font-display text-base font-semibold">{title}</h1> : <Logo />}
        <div className="ml-auto flex items-center gap-1">{right}</div>
      </div>
    </header>
  );
}

export { Heart };

export function SiteFooter() {
  const links = [
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
    { to: "/privacy", label: "Privacy" },
    { to: "/terms", label: "Terms" },
    { to: "/copyright", label: "Copyright & Content Removal" },
  ] as const;
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-foreground">{l.label}</Link>
          ))}
        </nav>
        <p className="mt-8 font-display text-lg">Thank you for visiting <span className="text-accent-gradient font-semibold">QP Movie</span>.</p>
        <p className="mt-1 text-xs text-muted-foreground">© {new Date().getFullYear()} QP Movie. Only licensed content is offered.</p>
      </div>
    </footer>
  );
}

export function StaticPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <BackHeader />
      <article className="mx-auto max-w-2xl px-4 py-10 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_p]:mt-3 [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        <h1 className="text-3xl font-semibold">{title}</h1>
        {children}
      </article>
      <SiteFooter />
    </div>
  );
}
