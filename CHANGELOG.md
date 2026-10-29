# Changelog

All notable changes to CEDC Expo are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- Nothing queued yet — next work lands here before the next tag.

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

[Unreleased]: https://github.com/iamajaygaur/cedcexpo/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/iamajaygaur/cedcexpo/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/iamajaygaur/cedcexpo/compare/v0.3.0...v1.0.0
[0.3.0]: https://github.com/iamajaygaur/cedcexpo/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/iamajaygaur/cedcexpo/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/iamajaygaur/cedcexpo/releases/tag/v0.1.0
