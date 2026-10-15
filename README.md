# Qp Stream Finder

PROJECT: QP Movie — Complete Full-Stack Implementation

ROLE
Act as a senior product designer, full-stack engineer, database architect, video delivery engineer, accessibility specialist, and application security engineer. Continue from the existing QP Movie project. Inspect all files and preserve working code. Do not merely create a static mockup, design image, or plan. Implement the real application in stages, run available checks, and report honestly what works and what still needs configuration.

PRODUCT VISION
Build QP Movie as a premium, mobile-first movie discovery and licensed media platform. It must feel intuitive, modern, fast, and polished. Use a distinctive QP monogram logo, charcoal/near-black surfaces, restrained violet-to-magenta accent gradients, warm white typography, subtle borders, spacious layouts, accessible contrast, purposeful animation, and high-quality responsive behaviour. Avoid clutter, excessive gradients, generic dashboard aesthetics on user screens, and unnecessary navigation. No bottom navigation bar. Mobile catalogue must have exactly two columns. Keep movie cards limited to poster and title only.

DESIGN SYSTEM
Create a reusable design system: QP logo and wordmark, typography scale, spacing tokens, colours, radius, elevation, focus states, buttons, inputs, cards, modals, bottom sheets, toasts, skeletons, empty states, error states, and responsive breakpoints. Design for touch first, then tablet/desktop. Respect reduced-motion preferences, keyboard access, screen readers, focus visibility, and contrast. Use consistent loading, offline, retry, and validation patterns.

SCREEN 1 — HOME
- Header row: QP logo/name left; search/profile icons on the right. No bottom navbar.
- Search row: text search with optional microphone input only if supported and permission granted; separate filter/sliders control.
- Optional featured movie banner with title and a single Explore/Details action.
- Movie grid: exactly two columns on mobile; more columns on larger screens as appropriate. Every card shows ONLY poster and title. No Watch or Download buttons on cards.
- Search by title and supported metadata; filters for genre, language, year, and actual available quality; sorting and reset.
- Pagination with Previous, numbered pages, Next, and Go to Page input. Use real server/database pagination in production.
- Floating bottom-right scroll-to-grid arrow: appear during downward scrolling, hide after inactivity, reappear on scrolling, and scroll to the first movie grid rather than the absolute page top. Hide when already near the grid.
- Footer: About, Contact, Privacy, Terms, Copyright/Content Removal Policy, and Thank You for Visiting.
- Handle empty search results, slow connections, image failure, loading skeletons, and retry states.

SCREEN 2 — MOVIE DETAILS
- Header with back navigation and optional watchlist/save action.
- Poster/hero, movie title, year, genre, language, duration, rating, synopsis, and content advisory when provided.
- One prominent primary button: Watch Now. Full movie watching requires login.
- A separate, visually secondary Download Options action. Do NOT show a permanent list of download qualities or file sizes on the details screen. Only open the download sheet after the user clicks Download Options.
- Screenshots: show 3–9 genuine, movie-specific screenshots in a three-column grid. If fewer exist, show only the real available images. Never create fake screenshots or empty placeholders. A full-screen viewer must support close, previous/next, image count, keyboard navigation, and mobile swipe.
- Trailer: embed a verified official YouTube trailer only when the ID is real and embedding is allowed. Do not invent trailer IDs or URLs.
- Additional expandable sections: About Movie, Cast & Crew, Ratings & Reviews. Only show verified data.
- Availability, licensing, and actual media assets must be retrieved from the backend. Never claim a quality exists when no asset exists.

SCREEN 3 — DOWNLOAD OPTIONS
- Open as a mobile-friendly bottom sheet and desktop modal only after user interaction.
- Display movie title, available authorized qualities, actual file size when known, selected quality, quota remaining, and a clear Download action.
- Close/cancel controls; loading, expired link, quota reached, network failure, and retry states.
- Daily limit: one unique movie download per day for both guests and logged-in users. Switching quality or retrying the same movie must not consume another unique-movie quota.
- Guest download is permitted only for a movie whose download rights are verified and active. The server must enforce quota and rights before issuing a short-lived signed link.
- Explain personal-use limitations only where applicable and legally reviewed. Never suggest users may redistribute copyrighted material without permission.

SCREEN 4 — ADVANCED WATCH PLAYER
- Build a responsive HTML5 video player with custom, accessible controls and a real authorized video source.
- Play/pause, progress/seek bar, buffered progress, elapsed/total duration, configurable 5/10/15/30-second skip, and double-tap left/right seeking on supported touch devices.
- Brightness gesture/slider on the left and volume gesture/slider on the right when supported. Explain browser/device limitations; do not fake hardware brightness control.
- Fullscreen, supported landscape/orientation handling, auto-hide controls, screen-lock mode, keyboard shortcuts, playback speed 0.5x–2x, quality selection, subtitle/audio tracks when available, and chapters only when real chapter metadata exists.
- Handle buffering, offline/network interruption, retry, source unavailable, and expired access. Resume playback from saved position after re-authorizing access.
- Picture-in-Picture only where supported. Never claim playback works when no source is configured. A UI play button must not simulate a real stream.
- Do not promise DRM or screen-recording prevention unless a real compatible DRM stack is implemented.

SCREEN 5 — AUTHENTICATION
- Signup, login, logout, password reset, email verification when configured, session expiry, and clear validation/errors.
- Use a reputable auth provider; prefer Supabase Auth if compatible with the current project.
- Never store plaintext passwords. No fabricated social-login buttons that do nothing. Enable Google OAuth only after provider credentials and redirect URLs are configured.
- Full-movie streaming requires login. Choose whether email verification is required through a central policy setting; default to verified account for full playback.

SCREEN 6 — USER PROFILE
- Profile basics, account security, watchlist, watch history, continue watching, reviews, and download history.
- Watch history is private by default. Users can clear history, remove watchlist items, edit/delete their own reviews, and request account deletion.
- No bottom navigation bar. Use the header and appropriate page navigation.
- Show the remaining watch/download quotas and next reset time in the account area where useful.

SCREEN 7 — WATCH HISTORY & CONTINUE WATCHING
- Store movie ID, user ID, progress, duration when available, and last-played timestamp.
- Resume from saved progress only after server-side authorization succeeds.
- Resume sessions, refreshes, repeated heartbeats, and multiple quality switches must not count the same movie repeatedly toward daily watch limits.
- Provide clear-history controls and protect records with row-level access policies.

SCREEN 8 — RATINGS & REVIEWS
- One active rating per account per movie, editable by the author.
- Server-calculated aggregate ratings; never trust a client-supplied average.
- Report review, moderate spam/abuse, and provide transparent removal/appeal handling.
- Guest users can read permitted public reviews but cannot submit ratings/reviews unless authenticated.

SCREEN 9 — ADMIN PANEL
Create a separate, responsive admin interface, visually related to the brand but optimized for work. No public access to admin functions.
Roles:
1. Super Admin/Owner: manage roles, verify rights, approve/publish/unpublish, configure security, view audit logs.
2. Content Admin: create/edit metadata, posters, genuine screenshots, synopsis, language, year, genre, runtime, advisory, and official trailer references; submit drafts.
3. Media Manager: upload authorized files, register actual available qualities, check media integrity, and monitor processing.
4. Moderator/Support: review reports and moderate user reviews without publishing movies or destructive media access.
Enforce every role server-side on every protected route. UI hiding is not authorization.
Admin screens: login/MFA-ready flow, dashboard, movie library, add/edit wizard, screenshot manager, upload center, rights/licence review, publish approval, user/staff roles, reviews/reports, settings, and audit logs.
Publishing workflow: Draft → metadata/media upload → rights verification → media integrity/playback check → Super Admin approval → Published. If licence expires/revokes, media is missing, or a check fails, disable playback/download and unpublish as appropriate.

SCREEN 10 — ADD MOVIE & UPLOAD WIZARD
Step 1: metadata. Step 2: poster and real movie-specific screenshots. Step 3: media upload and available qualities. Step 4: rights evidence, expiry, and permitted trailer. Step 5: preview, validation, and submit for approval.
- Show progress, pause/resume when supported, retry, checksum/integrity status, and processing states.
- Use resumable/chunked upload for large files when supported by the chosen storage provider.
- A failed or interrupted upload must never be marked successful or published.
- Require rights holder/reference, verified timestamp, permitted territories/uses if relevant, and expiry where applicable. Never invent licence evidence.

GOOGLE DRIVE INTEGRATION
- Optional admin-only integration via official Google Drive API and secure OAuth, using minimum required scopes and explicit consent.
- Admin may select an authorized source file and import it into configured private media storage.
- Handle cancellation, API errors, large files, resumable import where supported, duplicate detection, and integrity verification.
- Do NOT use Google Drive as the public movie-streaming CDN or expose private Drive URLs/tokens to visitors.
- Keep Drive integration optional so the app works without it. Document Google Cloud OAuth configuration, allowed redirect URIs, API enablement, consent screen, and token security.

STORAGE AND DELIVERY
- Keep movie binaries in private object/video storage; keep metadata and quotas in the database. Do not store large movie binaries in PostgreSQL.
- Prefer Supabase Auth + PostgreSQL + private Storage if compatible. For serious public streaming, evaluate a suitable video delivery provider or object storage plus a supported streaming pipeline. Explain bandwidth, egress, storage, transcoding, and CDN costs before recommending a plan.
- Use private buckets, short-lived signed access, origin restrictions where supported, and server-side authorization. A signed URL can be shared until it expires; it does not prevent screen recording.
- Never accept arbitrary bucket/path/URL from clients. Resolve file references through trusted database records.
- Do not expose service-role keys or OAuth refresh tokens in client bundles, logs, or error messages.

DATABASE
Provide migrations, indexes, foreign keys, unique constraints, Row Level Security policies, and documented relationships for:
- movies and movie metadata
- movie media assets and quality variants
- screenshot assets and trailer references
- rights/licence verification records
- profiles and roles
- guest sessions
- daily quota usage/reservations
- download events and link issuance records
- playback progress and validated playback activity
- watchlists
- ratings/reviews/reports
- admin audit logs
- optional Drive import jobs
Use UTC timestamps internally where appropriate and calculate quota day boundaries using Asia/Kolkata. Keep all privileged writes server-side.

QUOTA RULES — MUST BE ATOMIC AND SERVER-ENFORCED
- Guest download: one unique movie per IST day.
- Authenticated download: one unique movie per IST day.
- Full movie watch: login required, maximum five unique movies per authenticated account per IST day.
- Count a watch after two minutes of validated playback activity for that movie/day. Resume and repeated sessions do not add another unique movie.
- Quality variants of the same movie count as the same unique movie.
- Implement idempotency and database uniqueness/atomic transactions to resist parallel-request races.
- Define a consistent quota reservation/failure policy. Do not claim a signed-link request proves full download completion.
- Guest identity is best-effort using a server-issued random opaque ID in a Secure, HttpOnly, SameSite cookie, server-side records, and reasonable IP-based rate limits. It cannot reliably prove a real person's identity; cookies can be cleared and IPs can change. Avoid invasive fingerprinting.
- Provide clear quota-exceeded responses, retry semantics, remaining quota, and next reset time.
- Client-side playback telemetry can be manipulated. Validate it, rate-limit events, and document residual abuse risks.

SECURITY AND PRIVACY
- Validate inputs on server and client; protect against injection, unauthorized object access, broken access control, CSRF where applicable, abusive requests, and secret leakage.
- Apply rate limits to login, password reset, upload, search abuse, download-link creation, reviews, and playback-session creation.
- Add structured logs without passwords, raw signed URLs, access tokens, or unnecessary personal data.
- Support user data export/deletion where appropriate and publish a truthful privacy notice and retention policy.
- Implement copyright/content removal reporting and an admin resolution workflow.
- Fail closed for unlicensed, expired, revoked, unapproved, or missing assets.

TECH STACK
- Preserve the existing framework if it is sound. Otherwise use Next.js App Router, TypeScript, React, Tailwind CSS, accessible components, and Lucide icons.
- Supabase Auth/PostgreSQL/private Storage is the preferred default if compatible.
- Provide .env.example with placeholders only; no fake credentials. Document every required environment variable.
- Provide local development, migration, testing, and deployment instructions.
- Use real database-backed pagination and search when connected; demo seed data must be clearly labelled and must not imply real film rights or actual downloadable files.

IMPLEMENTATION METHOD
1. Inspect current files, framework, build status, and existing working features.
2. Produce a concise architecture and staged implementation checklist.
3. Implement reusable components and every screen described above, preserving prior decisions. Do not replace working code unnecessarily.
4. Implement migrations, authentication, RBAC, quota enforcement, upload integration, rights approval, protected playback, and download endpoints.
5. Ensure every button works or is clearly disabled with an explanation. No dead buttons, fake upload progress, simulated success, invented media links, or fake authentication.
6. If credentials/media/rights are missing, implement safe setup states and explain exactly what the owner must configure.
7. Run available type checks, lint, unit/integration tests, and production build. Fix failures where possible and report what could not be tested.
8. Test mobile/desktop, accessibility, slow network, retries, guest-cookie deletion, concurrent quota requests, same-movie multiple qualities, midnight IST reset, expired/revoked rights, interrupted uploads, and access-control failures.
9. Give deployment steps, secure admin bootstrap, environment configuration, storage policies, backup/monitoring guidance, and realistic operating cost considerations.

ACCEPTANCE TESTS
- Home has no bottom navbar; mobile grid is exactly two columns; movie cards display poster and title only.
- Movie details has one prominent Watch Now action and a secondary Download Options action; quality list appears only after clicking Download Options.
- Guests cannot stream full movies through any endpoint or direct media path.
- Guests can download one unique authorized movie/day; signed links are short-lived and quota-checked server-side.
- Authenticated users can watch up to five unique movies/day and download one unique movie/day.
- Resume, quality switching, retries, and duplicate requests do not incorrectly consume multiple unique-movie quotas.
- Admin roles and rights checks are server-enforced.
- Google Drive is optional and used for admin import, not as the public streaming CDN.
- No service secrets or private media paths leak to clients.
- Missing licensed media shows a setup/unavailable state rather than fake playback.
- All critical policy functions have tests and the production build is checked.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://qp-stream-finder.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3f893dae-7808-45d2-8ef5-ab52a5ed11b3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
