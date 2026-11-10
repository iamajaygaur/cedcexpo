# §2a — Secure code review report

**Application:** CEDC Expo  
**Review date:** 2026-11-10  
**Scope:** Application source in repository `cedcexpo` (product paths under `app/`, `lib/`, `components/` excluding BoardUI demo templates under `components/application/` used only as design references)  
**Method:** Manual architecture-aware review against OWASP ASVS-inspired checklist + dependency audit  
**Reviewer:** Development team (technical maintainer)  
**Status:** Complete for current codebase; re-run after major auth/hosting changes

## Summary

| Severity | Open | Notes |
|----------|------|-------|
| Critical | 0 in app authz design | Dependency audit has critical advisories in transitive tree — see remediation log |
| High | MFA not enforced for admins | Tracked as control gap for RAC §4 |
| High | Dependency findings (`xlsx`, `zod`/`undici` tree) | See `evidence/npm-audit-*.txt` |
| Medium | Application-level audit event table incomplete | Compensated partly by Supabase Auth logs |
| Low | BoardUI demo assets not used in production routes | Keep out of production threat model |

## Findings

### F-01 — Admin MFA not enforced (High · control gap)

**Location:** Auth via Supabase email/password; no TOTP/WebAuthn gate on admin  
**Risk:** Privileged account takeover if password leaked  
**Status:** Open — remediation planned before production on university infrastructure  
**Plan:** Enable Supabase MFA for admin accounts and/or CU SSO+MFA for admins; external judges remain password accounts

### F-02 — Legacy `xlsx` advisories (High · dependency)

**Location:** `package.json` → `xlsx` (Excel import for teams/judges)  
**Risk:** Prototype pollution / ReDoS on malicious workbook parse  
**Compensating control:** Import restricted to authenticated **admins** only; files not executed as code in browser for judges  
**Status:** Accepted short-term with replacement evaluation (SheetJS Pro or alternate parser)  
**Owner:** Technical maintainer

### F-03 — Transitive `undici` / nested `zod` advisories (High/Moderate · dependency)

**Evidence:** `docs/rac/evidence/npm-audit-20261110.txt`  
**Action:** Run `npm audit fix` for non-breaking updates; re-audit; record results in remediation log  
**Status:** Open — CI will fail production audit at high once workflow is on `main`

### F-04 — Incomplete immutable app audit trail (Medium)

**Risk:** Harder forensic reconstruction of criteria/assignment changes  
**Status:** Design documented in `07-logging-monitoring.md`; implement `audit_events` (or equivalent) before go-live if RAC requires app-level trails beyond Supabase logs

### F-05 — Positive controls verified (Informational)

| Control | Evidence in code |
|---------|------------------|
| Server admin gate | `lib/admin/guard.ts` → `requireAdminClient()` |
| Judge identity | `lib/judge/actions/evaluations.ts` → `requireJudgeClient()` |
| Middleware role gates | `lib/supabase/middleware.ts` |
| RLS helpers | `supabase/migrations/20260727160100_rls_policies.sql` (`is_admin`, `judge_assigned_to_team`, …) |
| Idle session logout | `components/shared/idle-session-guard.tsx` (25 min / warn at 23) |
| Login rate limits | `lib/auth/login.ts` + `lib/rate-limit` |
| Evaluation validation | `lib/validation/judge.ts` |
| No service role in browser | `lib/supabase/client.ts` comment + `admin.ts` server-only |
| Private cache headers | `next.config.ts` |

### F-06 — SQL injection (Informational · not found)

Parameterized Supabase client usage; no raw string-built SQL in product TypeScript.

### F-07 — XSS via product UI (Informational · not found)

No product use of unsanitized HTML injection identified in reviewed routes.

### F-08 — IDOR on evaluations (Informational · mitigated)

Mutations require active judge and assignment checks; RLS `judge_owns_evaluation` / `judge_assigned_to_team` provide defense in depth. Pen test should still attempt cross-judge IDOR.

## Remediation tracking

All open items continue in [`evidence/remediation-log.md`](./evidence/remediation-log.md).

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Technical maintainer | TODO | | |
| Application owner (faculty) | TODO | | |
