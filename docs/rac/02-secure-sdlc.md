# §2 — Secure software development and code review

## 2.1 Development model

| Practice | How CEDC Expo does it |
|----------|------------------------|
| Language | TypeScript (strict app code) |
| Framework | Next.js App Router — server actions / route handlers for mutations |
| Validation | Zod schemas on auth and evaluation payloads |
| Authorization | Server session + `profiles.role`; Postgres Row Level Security |
| Secrets | Environment variables only (see `.env.local.example`); never committed |
| UI | React (auto-escapes text); no intentional `dangerouslySetInnerHTML` in product UI |
| Testing | Playwright e2e (`.github/workflows/e2e.yml`) |
| Security CI | `.github/workflows/security.yml` — CodeQL SAST + `npm audit` |
| Dependencies | Dependabot (`.github/dependabot.yml`) weekly |

## 2.2 Input validation

| Surface | Control |
|---------|---------|
| Login | `loginSchema` (Zod) in `lib/validation/auth.ts`; rate limits per IP and username |
| Evaluation draft/submit | `evaluationDraftSchema` / `evaluationSubmitSchema` in `lib/validation/judge.ts`; score ≤ criterion max |
| Admin CSV/Excel import | Parsed server-side; admin-only actions |
| Avatar upload | MIME allow-list, 2 MB body limit (`next.config.ts` serverActions.bodySizeLimit) |

## 2.3 Output encoding / XSS

React JSX encodes string children by default. Product pages render user-supplied comments and names as text nodes. Any future HTML rendering must use an allow-listed sanitizer (policy: do not introduce raw HTML without review).

## 2.4 SQL injection

No dynamic SQL string concatenation in application code. Data access uses the Supabase/PostgREST client with parameterized filters. Database policies are defined in versioned SQL migrations under `supabase/migrations/`.

## 2.5 Broken access control protections

| Layer | Mechanism |
|-------|-----------|
| Edge middleware | Session refresh; unauthenticated users redirected from `/admin` and `/judge` |
| Role gate | Admin routes require `profiles.role = admin`; judges require active judge row |
| Server actions | `requireAdminClient()` / `requireJudgeClient()` before mutations |
| Assignment check | Judge can only mutate evaluations for assigned teams (`getJudgeTeamAccess` / RLS `judge_assigned_to_team`) |
| Database | RLS enabled on all application tables (`20260727160100_rls_policies.sql`) |
| Cache | `Cache-Control: private, no-store` on `/admin`, `/judge`, `/api` |

Role is **never** taken from client-controlled claims alone; it is read from `profiles` after `auth.getUser()`.

## 2.6 Secrets handling

| Secret | Location | Client exposure |
|--------|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Env | Public (RLS still applies) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Env | Public (RLS still applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server env only | **Never** `NEXT_PUBLIC_`; used only via `lib/supabase/admin.ts` |
| Upstash tokens | Server env optional | Not public |

Evidence: `.env.local.example` documents names without values; `.gitignore` excludes `.env*`.

## 2.7 Automated security checks

| Check | Tool | Where |
|-------|------|-------|
| SAST | GitHub CodeQL (`security-extended`) | `.github/workflows/security.yml` |
| Dependency vulns | `npm audit --omit=dev --audit-level=high` | Same workflow |
| Dependency PRs | Dependabot | `.github/dependabot.yml` |
| Functional regression | Playwright | `.github/workflows/e2e.yml` |

## 2.8 Third-party library remediation process

1. Dependabot opens PRs weekly for npm and GitHub Actions.
2. CI `npm audit` fails on high/critical production findings.
3. Maintainer triages within **14 days** for high/critical, **30 days** for moderate.
4. Findings and fixes are logged in [`evidence/remediation-log.md`](./evidence/remediation-log.md).
5. Libraries with no upstream fix (e.g. legacy `xlsx` advisories) are tracked as accepted risk with compensating controls or replacement plan.

## 2.9 Code review evidence

- Documented security review: [`02a-secure-code-review.md`](./02a-secure-code-review.md)
- Ongoing: GitHub pull request reviews (enable required reviewers on `main` — see §9)
- CI run history: GitHub Actions → Security + E2E workflows (attach screenshots after first green run on `main`)
