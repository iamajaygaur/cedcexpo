# Changelog

All notable changes to CEDC Expo are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- App version badge reads `package.json` directly (and lockfile root stays in sync) so local/dev no longer sticks on a stale `NEXT_PUBLIC_APP_VERSION` from an old `next.config` load
- E2E CI build no longer fails when Supabase GitHub secrets are empty (uses build placeholders; auth specs still skip until secrets are set)
- Vercel install warnings: approve `sharp` / `unrs-resolver` via `allowScripts`, and drop invalid `cache-dir` npm env during install
- Idle logout actually fires after 25 minutes: warning no longer resets the timer, mouse-move jitter no longer counts as activity, and logout clears cookies via `/api/auth/logout`
- Judge evaluation submit requires a score out of max and a comment on every criterion (UI + server)
- Tablet/pad widths use the collapsible drawer + menu button (fixed sidebar starts at `lg`)

### Planned

- Nothing else queued yet — next work lands here before the next tag.

## [1.1.1] — 2026-11-02

### Added

- Admin preview escape hatch on the judge shell: **Admin View** sidebar link (above Dashboard) and gold **Back to Admin** banner

### Changed

- Admin Manage nav labels: Teams Management, Judge Management, Judge Groups, Judging Assignments
- Groups “Manage judges” / create actions use primary gold instead of near-black fill

## [1.1.0] — 2026-11-02

### Added

- Shared animated UI-state kit: empty, loading skeletons, error panel, zero search results, field validation shake, permission denied
- Soft success/error toast host alongside existing feedback dialogs
- Slow-network banner + “still working…” pending cue after 2.5s
- Session-expiry warning dialog 2 minutes before idle logout
- `app/forbidden.tsx` via Next `authInterrupts` / `forbidden()`

### Changed

- Admin/judge route loading uses skeleton grids instead of a frozen spinner
- Teams, Judges, and Live Monitor distinguish true empty vs filter/search zero
- Offline banner covers offline + slow connection with motion enter/exit

## [1.0.1] — 2026-10-29

### Added

- In-app version badge (`vX.Y.Z`) on login, sidebars, footers, and Admin → Settings
- `NEXT_PUBLIC_APP_VERSION` injected from `package.json` so UI always matches the cut

## [1.0.0] — 2026-10-29

Expo-ready release: reliability for judging day, refreshed Groups/Judges admin,
and uniform click/hover affordances.

### Added

- Judge password help flow (`/judge-help`) with notes-based request markers
- Optional Upstash Redis rate limiting (falls back to in-memory)
- Evaluation form **Sync now** control
- Judge Groups KPI / panel cards with soft group tint and live-status progress
- Judges Management group-column board with click-to-detail
- Shared `.ui-interactive` / `.ui-interactive-quiet` affordance utilities
- Password help banner for admins; e2e coverage for judge help

### Changed

- Fixed sidebar width so dialogs no longer shift the shell
- Judge project cards are fully clickable links
- Groups/dashboard/monitor: lift/hover only on real interactive surfaces
- Select/button/nav-link cursor and hover behavior unified

### Fixed

- Search / status filter overlap on Judges Management
- Cramped judge detail modal (wider dialog)
- Misleading hover on non-clickable KPI cards

## [0.3.0] — 2026-10-27

Brand polish, authenticated e2e, and app-wide motion feedback.

### Added

- Authenticated Playwright flows and CI e2e workflow
- In-app admin forgot-password from the login page
- App-wide click and loading motion feedback

### Changed

- Typography: Manrope/Fraunces experiment → DM Sans site-wide
- Group colors retuned for clearer distinction (non-rainbow)
- Soft cream surfaces and metallic gold progress shading
- Live Monitor / dashboard group cards share soft featured shading

### Fixed

- Login submit pending-state deferral and spinner TypeScript syntax

## [0.2.0] — 2026-10-27

Commercial visual redesign across admin, judge, and marketing surfaces.

### Added

- Full-app commercial visual coverage
- Playwright visual baselines for brand/chart motion polish

### Changed

- Admin, judge, and marketing UI elevated to a cohesive commercial look

### Fixed

- Mobile judging UX and home page hydration
- Mobile score-field scroll loop on the evaluation form
- Rate limits hardened for expo-day shared Wi-Fi

## [0.1.0] — 2026-08-07

Initial product baseline.

### Added

- CEDC Capstone Design Expo judging app (admin + judge roles)
- Supabase auth, evaluations, groups, teams, live monitor foundations
- Product rebrand to **CEDC Expo**
- Soft gold/teal mesh home background

### Fixed

- Judge sign-out redirecting to the error page

[Unreleased]: https://github.com/iamajaygaur/cedcexpo/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/iamajaygaur/cedcexpo/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/iamajaygaur/cedcexpo/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/iamajaygaur/cedcexpo/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/iamajaygaur/cedcexpo/compare/v0.3.0...v1.0.0
[0.3.0]: https://github.com/iamajaygaur/cedcexpo/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/iamajaygaur/cedcexpo/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/iamajaygaur/cedcexpo/releases/tag/v0.1.0
