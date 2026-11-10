# Evidence checklist (master)

Status key: **COMPLETE** · **PARTIAL** · **PENDING** · **N/A**

Update this table as artifacts are attached under `evidence/`.

| # | Deliverable | Status | Artifact / location |
|---|-------------|--------|---------------------|
| 1.1 | Third-party inventory | COMPLETE | `01-third-party-security.md` |
| 1.2 | Vercel plan confirmation | PENDING | Fill `templates/plan-confirmation.md` + screenshot |
| 1.3 | Supabase plan confirmation | PENDING | Same |
| 1.4 | Vercel SOC 2 / ISO docs | PENDING | Download from [security.vercel.com](https://security.vercel.com/); store in `evidence/vendor/` |
| 1.5 | Supabase SOC 2 / ISO docs | PENDING | Report requires Team/Enterprise; see §1 gap statement |
| 1.6 | Post-migration third-party scope | PARTIAL | Decision recorded in `06-hosting-infrastructure.md` (confirm with OIT) |
| 2.1 | Secure SDLC description | COMPLETE | `02-secure-sdlc.md` |
| 2.2 | Documented secure code review | COMPLETE | `02a-secure-code-review.md` |
| 2.3 | Input validation / authz controls | COMPLETE | Implemented; summarized in §2 / §4 |
| 2.4 | SAST (CodeQL) in CI | COMPLETE | `.github/workflows/security.yml` |
| 2.5 | Dependency scanning | COMPLETE | Dependabot + `npm audit` evidence + CI job |
| 2.6 | Secrets not hardcoded | COMPLETE | Env-based; see code review |
| 2.7 | Remediation log for findings | PARTIAL | Start from code review + npm audit; update after scans |
| 3.1 | Vulnerability scan report | PENDING | OIT / approved scanner on staging URL |
| 3.2 | Penetration test report | PENDING | Use `templates/pen-test-scope.md` |
| 3.3 | Critical/high remediation evidence | PENDING | After 3.1 / 3.2 |
| 3.4 | Ongoing assessment process | COMPLETE | Documented in `03-vulnerability-testing.md` |
| 4.1 | Auth for admin + judge | COMPLETE | `04-authentication-access-control.md` |
| 4.2 | MFA for privileged accounts | PARTIAL | **Gap** — plan documented; not shipped yet |
| 4.3 | RBAC / assignment isolation | COMPLETE | App guards + Postgres RLS |
| 4.4 | Session management | COMPLETE | Idle 25 min + cookie modes |
| 4.5 | Provision / deprovision procedures | COMPLETE | Written procedure in §4 |
| 4.6 | Server-side authorization | COMPLETE | Middleware + `requireAdminClient` / judge guards + RLS |
| 5.1 | Data categories inventory | COMPLETE | `05-data-protection-privacy.md` |
| 5.2 | Encryption in transit / at rest | COMPLETE | TLS + cloud provider at-rest (document plan) |
| 5.3 | DB access restriction | COMPLETE | RLS + service role server-only |
| 5.4 | Retention / deletion procedures | COMPLETE | Written; owner must approve retention window |
| 5.5 | Export access control | COMPLETE | Admin-only + rate limit |
| 5.6 | FERPA / classification with RAC | PENDING | Coordinate meeting; draft position in §5 |
| 6.1 | Target hosting + timeline | PARTIAL | Draft in `06-hosting-infrastructure.md` — confirm with OIT |
| 6.2 | Architecture / data-flow diagram | COMPLETE | `06a-architecture-data-flow.md` |
| 6.3 | Components remaining external | PARTIAL | Depends on migration option A/B/C |
| 6.4 | Env separation (dev/test/prod) | PARTIAL | Procedure written; confirm CU project names |
| 7.1 | Security-relevant logging design | PARTIAL | Design in `07-logging-monitoring.md`; app audit table not fully shipped |
| 7.2 | Log access / no secrets in logs | COMPLETE | Policy documented |
| 7.3 | Monitoring / incident response | COMPLETE | Procedure documented |
| 8.1 | Backup procedures | PARTIAL | Documented; requires paid Supabase or CU DB |
| 8.2 | Restore test evidence | PENDING | Run and attach screenshot/notes |
| 8.3 | Expo-day continuity plan | COMPLETE | `08-backup-recovery.md` |
| 9.1 | Change management process | COMPLETE | `09-change-management.md` |
| 9.2 | GitHub access / branch protection | PARTIAL | Process written; enable settings in GitHub UI |
| 9.3 | GitHub Actions secrets hygiene | COMPLETE | Documented; secrets via GitHub Secrets |
| 9.4 | Named owner / maintainers | PENDING | Fill `10-roles-and-contacts.md` |
| 10.1 | Full evidence pack assembled | PARTIAL | This folder; attach pending PDFs |

## Immediate actions for the applicant (before RAC meeting)

1. Fill contacts and owner in `10-roles-and-contacts.md`.
2. Screenshot Vercel + Supabase billing plans → `evidence/screenshots/`.
3. Download Vercel trust-center docs; decide Supabase Team upgrade vs migrate-off for SOC PDF.
4. Ask OIT for vuln scan + pen-test scheduling using `templates/pen-test-scope.md`.
5. Confirm hosting option (A keep Supabase / B full CU / C stay Vercel+Supabase) in writing with OIT.
6. Enable GitHub branch protection on `main` (required PR review).
7. Schedule admin MFA implementation before production go-live.
