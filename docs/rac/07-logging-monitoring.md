# §7 — Logging, monitoring, and audit trails

## 7.1 What must be logged

| Event class | Minimum fields | Current source | Target |
|-------------|----------------|----------------|--------|
| Login success / failure | Timestamp, username/email attempted, IP, outcome | Supabase Auth logs + app login path | Retain ≥ 30 days prod |
| Logout / session timeout | Timestamp, user id | `/api/auth/logout` | App + Auth |
| Admin: create/update event | Actor, event id | **Gap** — add `audit_events` | App table |
| Admin: criteria changes | Actor, criterion id, before/after summary | **Gap** | App table |
| Admin: judge create / password reset / deactivate | Actor, target judge id | Partially via actions | App table |
| Admin: assignment changes | Actor, group, team | **Gap** | App table |
| Score draft save / submit | Judge id, team id, evaluation id, status | DB row timestamps `updated_at` | Plus audit event on submit |
| Export / report download | Actor, export type | Rate-limited action | Audit event |

## 7.2 Proposed `audit_events` schema (to implement)

```sql
-- Planned; not yet migrated. Implement before university production if RAC requires app-level trails.
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  actor_profile_id uuid references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip text
);
```

Only **admins** may read via RLS; inserts from trusted server actions.

## 7.3 Log content rules

**Never log:** passwords, access tokens, refresh tokens, full session cookies, service role key, raw avatar binaries.  
**Avoid logging:** full student email lists in verbose debug.  
**Do log:** stable ids, action names, success/failure booleans.

## 7.4 Protection of logs

| Environment | Control |
|-------------|---------|
| Supabase | Dashboard access limited to project admins; plan retention (Free 1 day → upgrade for longer) |
| App host | OS syslog / platform logs restricted to OIT + maintainers; immutable where platform allows |
| GitHub Actions | No production PII; secrets masked |

## 7.5 Monitoring and response

| Signal | Response |
|--------|----------|
| Spike in login failures | Check rate limits; disable targeted accounts; rotate passwords |
| Unexpected admin export | Contact actor; revoke session; review audit trail |
| Suspected compromise | Disable users in Supabase; rotate service role key; notify application owner + OIT/RAC per university incident process |
| Expo-day outage | Follow continuity plan in §8 |

**Incident contacts:** fill in `10-roles-and-contacts.md`.

## 7.6 Gap acknowledgment

Application-level audit table is **PARTIAL**. Until shipped, rely on Supabase Auth logs, database `updated_at`, and Git history for code changes. RAC may require F-04 closed before go-live.
