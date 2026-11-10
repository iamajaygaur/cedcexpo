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

## Template for future rows

| ID | Source | Severity | Finding | Action | Status |
|----|--------|----------|---------|--------|--------|
| | Pen test / CodeQL / Dependabot | | | | Open/Fixed |
