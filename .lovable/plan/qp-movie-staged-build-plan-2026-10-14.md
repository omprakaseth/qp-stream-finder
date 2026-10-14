# QP Movie — Staged Build Plan

The project is currently an empty starter (no QP Movie code exists yet), so everything is built fresh on the existing TanStack Start + Lovable Cloud stack. Work ships in stages; each stage ends in a working, testable app with no fake buttons.

## Stage 1 — Foundation and public catalogue
- Design system: QP monogram + wordmark, charcoal surfaces, violet→magenta accent, warm white text, tokens for type/spacing/radius/elevation/focus, reduced-motion support.
- Enable Lovable Cloud. Migrations for movies, genres/languages, media assets + quality variants, screenshots, trailers, rights records, profiles, roles (separate table + has_role), audit logs. RLS + grants on every table.
- Clearly labelled demo seed rows (no rights, no media → "Unavailable" states).
- Home: header (logo, search, profile), search + filter sheet (genre, language, year, real quality), sort/reset, 2-column mobile grid (poster + title only), server pagination with numbered pages + Go to page, scroll-to-grid arrow, footer + About/Contact/Privacy/Terms/Copyright pages, skeleton/empty/error/retry states.
- Movie details: Watch Now (primary), Download Options (secondary, opens sheet only on click), real screenshots only + full-screen viewer (keyboard/swipe), trailer only when a verified ID exists, expandable About/Cast/Reviews.

## Stage 2 — Accounts and personal area
- Email/password signup, login, logout, reset-password page, verification policy setting (default: verified for full playback). Google sign-in via managed provider.
- Profile: basics, security, watchlist, history, continue watching, reviews, download history, quotas + next IST reset, account deletion request, data export.

## Stage 3 — Quotas, downloads, protected playback
- Private storage bucket; file paths resolved only from database records.
- Atomic Postgres functions (unique constraints on user/guest + movie + IST day) for: 1 unique download/day (guest + user), 5 unique watched movies/day (counted after 2 min validated playback). Quality switches, retries, resumes are idempotent.
- Guest identity: random opaque HttpOnly/Secure/SameSite cookie + server records + IP rate limits.
- Short-lived signed links issued server-side only after rights + quota checks; fail closed on expired/revoked/missing.
- Custom accessible player: seek/buffered bar, configurable skip, double-tap, volume/brightness (CSS filter, explained), speed, quality, tracks, fullscreen, orientation, lock, auto-hide, PiP where supported, offline/expired handling, resume after re-authorisation, heartbeat telemetry with rate limits.

## Stage 4 — Reviews and moderation
- One rating per account per movie, server-computed aggregates, report flow, moderator queue, removal/appeal notes.

## Stage 5 — Admin panel
- Separate /admin area, role-gated server-side (Owner, Content Admin, Media Manager, Moderator).
- Dashboard, movie library, 5-step add/edit wizard, screenshot manager, upload center (resumable uploads, checksum, real progress), rights review, publish approval workflow (Draft → media → rights → integrity check → approval → Published, auto-unpublish on expiry), staff roles, reports, settings, audit log.
- Secure first-owner bootstrap.

## Stage 6 — Optional Google Drive import
- Admin-only per-admin Google connection, minimum scopes, import into private storage with duplicate detection and integrity check. Never used for public streaming. App works without it.

## Stage 7 — Tests and docs
- Unit tests for quota/rights/role policy functions, concurrency and IST-midnight cases, access-control checks; build verification.
- README: env variables, migrations, deployment, admin bootstrap, storage policies, backups/monitoring, and realistic streaming cost notes (storage, egress, transcoding, CDN; recommendation to use a dedicated video provider for serious public streaming).

## Honest limits (stated in app and docs)
- No DRM or screen-recording prevention; signed links can be shared until they expire.
- Guest limits are best-effort (cookies can be cleared).
- No real films, trailers, or rights are included — the owner must upload licensed media and record rights evidence.

## Technical details
- Stack kept: TanStack Start, Tailwind v4 tokens in src/styles.css, shadcn/Radix components, Lucide icons (not Next.js — the project framework is fixed).
- Server logic via createServerFn with auth middleware; admin writes via service client only after role check; webhooks/none public except guest download endpoint with cookie + rate limit.
- Quota day = (now() at time zone 'Asia/Kolkata')::date stored alongside UTC timestamps.
