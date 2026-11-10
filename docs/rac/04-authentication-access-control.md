# §4 — Authentication and access control

## 4.1 Authentication mechanisms

| Actor | How they sign in | Password reset |
|-------|------------------|----------------|
| Administrator | Username/email + password via Supabase Auth | Self-service email link (`/forgot-password` → `/api/auth/callback`) |
| Judge | Username + password (often industry affiliate) | Admin sets password in Judges Management (not email self-service) |

Shared login page: `/login`. After auth, role is loaded from `public.profiles.role` (`admin` | `judge`). The client cannot choose its role.

Relevant code:

- `lib/auth/login.ts`
- `app/api/auth/login/route.ts`
- `lib/supabase/middleware.ts`
- `lib/admin/guard.ts`

## 4.2 Multifactor authentication (MFA)

| Account class | MFA today | Target before university production |
|---------------|-----------|-------------------------------------|
| Admin / privileged | **Not enforced** | Required — Supabase MFA (TOTP) and/or CU SSO with MFA |
| Judge (external) | Not enforced | Optional; password + admin-controlled reset; deactivate after event |

**RAC statement:** MFA for administrators is a **known gap (F-01)** with a committed remediation before production go-live on university infrastructure.

## 4.3 Role-based access control

### Administrators may

- Create/manage events, teams, criteria, groups, assignments
- Create/deactivate judges and reset judge passwords
- View live monitor, results, archive, exports/reports
- Manage own profile avatar

### Judges may

- View only assigned projects
- Save drafts / submit evaluations for assigned teams
- Scan team QR when assigned
- Manage own profile avatar
- **Cannot** access admin routes, exports, or other judges’ evaluations

### Enforcement layers

1. Next.js middleware blocks unauthenticated `/admin` and `/judge` access  
2. `requireAdminClient()` / active judge checks on server actions  
3. Postgres RLS (`is_admin()`, `judge_assigned_to_team()`, `judge_owns_evaluation()`)

## 4.4 Session management

| Control | Setting |
|---------|---------|
| Idle timeout | 25 minutes without intentional activity |
| Warning | At 23 minutes (`IdleSessionGuard`) |
| Logout | `/api/auth/logout` clears cookies; client auth artifacts cleared |
| Session cookies | Default **ephemeral** (cleared when browser session ends); optional “Remember me” persistent mode |
| Cookie flags | `secure` in production |
| Authenticated CDN caching | Disabled via `Cache-Control: private, no-store` |

## 4.5 Rate limiting

- Login: per IP and per username (`lib/rate-limit`)
- Evaluation mutations: per judge
- Exports: rate limited
- Optional shared Redis (Upstash) for multi-instance deployments

## 4.6 Provisioning, review, and deactivation

### New admin

1. Application owner requests account  
2. Technical maintainer creates Supabase Auth user + `profiles.role = admin`  
3. MFA enrolled (once implemented)  
4. Record in access register (spreadsheet or ticket)

### New judge (per expo)

1. Admin creates judge in UI (or Excel import)  
2. Temporary password issued out-of-band  
3. Judge marked `active = true`  
4. Assigned to group → teams via assignments

### After each expo (required)

1. Export final results/archive  
2. Set judges `active = false` (or delete Auth users if policy requires)  
3. Rotate any shared device passwords  
4. Review admin list; remove departed staff  
5. Confirm retention policy for event archive (§5 / §8)

### Access review cadence

- Admins: each semester / before expo  
- Judges: end of each expo (mandatory deprovision)

## 4.7 Server-side authorization (cannot be bypassed by UI)

All privileged mutations go through server actions or route handlers that re-check session + role. Changing client-side React state or hiding buttons does not grant access. Defense in depth via RLS means even a stolen anon key cannot read/write beyond policy.

**Pen-test focus:** attempt to call admin actions as judge; attempt to upsert another judge’s `evaluation_id`; attempt to export CSV without admin session.
