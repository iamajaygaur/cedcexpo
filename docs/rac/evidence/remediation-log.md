# Remediation log

Append-only. Newest entries at the top.

## 2026-11-10 — Initial dependency audit + code review

| ID | Source | Severity | Finding | Action | Status |
|----|--------|----------|---------|--------|--------|
| F-01 | Code review | High | Admin MFA not enforced | Implement Supabase MFA / CU SSO for admins before prod | Open |
| F-02 | npm audit | High | `xlsx` prototype pollution / ReDoS (no upstream fix on community build) | Admin-only import; evaluate paid SheetJS or alternate parser | Accepted (temporary) |
| F-03 | npm audit | High/Crit | Transitive advisories (`undici`, nested `zod`, later `sharp`/`next`) | Ran `npm audit fix` (non-breaking): **31 → 16** remaining; residual needs careful Next upgrade or awaits upstream — see after-fix artifact | Partial |
| F-04 | Code review | Medium | App-level audit events incomplete | Implement audit logging per `07-logging-monitoring.md` | Open |
| — | Process | Info | No Dependabot / CodeQL historically | Added `.github/dependabot.yml` + `.github/workflows/security.yml` | Done |

**Artifacts:** `npm-audit-20261110.txt`, `npm-audit-20261110.json`, `npm-audit-20261110-after-fix.txt`

## 2026-11-10 — CI failures on main (E2E + Security)

| ID | Source | Severity | Finding | Action | Status |
|----|--------|----------|---------|--------|--------|
| CI-E2E | GitHub Actions | High | `next build` typecheck failed on BoardUI demo `data-table` missing `@tanstack/react-table` | Exclude `components/application` from `tsconfig.json` (demos not in product routes) | Fixed |
| CI-AUD | GitHub Actions | High | Security job failed: `npm audit --audit-level=high` (Next CVEs + unfixable `xlsx`) | Upgrade `next`/`eslint-config-next` to 16.4.6; gate via `scripts/check-npm-audit.mjs` with documented `xlsx` allowlist | Fixed |
| — | Dependabot | Info | Major bumps (TS 7 / ESLint 10) opened disruptive PRs | Dependabot ignores semver-major | Fixed |

## Template for future rows

| ID | Source | Severity | Finding | Action | Status |
|----|--------|----------|---------|--------|--------|
| | Pen test / CodeQL / Dependabot | | | | Open/Fixed |
