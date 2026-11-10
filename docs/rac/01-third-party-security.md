# §1 — Third-party security assurance

## 1.1 What is being hosted

CEDC Expo is an **in-house web application** (Next.js). It is not a purchased SaaS judging product. Third parties only provide **cloud infrastructure** used by the application:

| Service | Role | Data involvement |
|---------|------|------------------|
| **Supabase** | PostgreSQL database, Auth, Row Level Security, Realtime, Storage (avatars) | Stores and processes application data |
| **Vercel** (current) | Application hosting / edge delivery | Transmits request data; may briefly process env-configured secrets server-side |
| **GitHub** | Source control + CI | Source code; CI secrets (not production user data) |
| **Upstash Redis** (optional) | Shared rate-limit store | IP / username keys only if enabled; **off by default** |

No integrations with CU-SIS, Canvas, email directories, payment processors, or analytics SDKs that receive expo PII.

## 1.2 Subscription plans (fill with screenshots)

Use [`templates/plan-confirmation.md`](./templates/plan-confirmation.md).

| Vendor | Plan in use (fill) | Notes for RAC |
|--------|--------------------|---------------|
| Vercel | TODO | Vercel lists SOC 2 Type II / ISO 27001 on Hobby/Pro/Enterprise. Security *collateral download* is typically for Pro/Enterprise. Confirm current plan in dashboard. |
| Supabase | TODO | Platform asserts SOC 2 Type II. **SOC 2 report PDF is available to Team and Enterprise customers only** ([docs](https://supabase.com/docs/guides/security/soc-2-compliance)). Free/Pro cannot download the report. |

**Production recommendation:** Do not run a live Senior Design Expo on Supabase **Free** (projects pause after inactivity; limited backup story). Use at least **Pro** for operations; use **Team** if RAC requires the SOC 2 PDF while Supabase remains in scope.

## 1.3 How to obtain assurance documents

| Vendor | Where | Action |
|--------|-------|--------|
| Vercel | https://security.vercel.com/ | Sign in / request SOC 2 Type II + ISO 27001 certificate; save PDFs to `evidence/vendor/` |
| Supabase | Dashboard → Legal Documents, or https://forms.supabase.com/soc2 | Requires Team/Enterprise; or submit form |

Email draft: [`templates/vendor-doc-request.md`](./templates/vendor-doc-request.md).

## 1.4 Do certifications cover the plan we use?

| Vendor | Platform controls | Report access |
|--------|-------------------|---------------|
| Vercel | Publicly listed as included across plans | Confirm download access on the active plan; upgrade to Pro if collateral is blocked |
| Supabase | Asserts SOC 2 Type II for the product environment hosting customer data | **Report gated to Team+**. Free/Pro → assurance **gap** unless upgraded or Supabase is removed from production |

### Assurance gap statement (if Supabase Free/Pro)

> Supabase states that its platform is SOC 2 Type II compliant. The written SOC 2 Type II report is available only to Team and Enterprise customers. The project is currently on **[PLAN]**. RAC can either (a) approve temporary upgrade to Team to obtain the report while Supabase remains, or (b) require migration of database/auth to university-managed infrastructure, after which Supabase leaves the production assurance boundary.

## 1.5 Post-migration third-party scope

See hosting options in [`06-hosting-infrastructure.md`](./06-hosting-infrastructure.md).

| Option | Vercel after migration | Supabase after migration |
|--------|------------------------|--------------------------|
| **A — CU app host, keep Supabase** | Removed from production | Remains — still need Supabase docs |
| **B — Full CU stack** | Removed | Removed — CU Postgres + campus auth/IdP |
| **C — Status quo** | Remains | Remains |

**Decision (fill):** _______________ · **Date:** _______________ · **OIT contact:** _______________

## 1.6 Additional processors — none beyond inventory

Unless Upstash is explicitly enabled via `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, no Redis third party processes data.
