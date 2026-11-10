# §6 — Application hosting and infrastructure security

## 6.1 Current production-shaped environment

| Component | Current |
|-----------|---------|
| Web application | Next.js 16 on **Vercel** (Node server) |
| Database / Auth / Storage / Realtime | **Supabase** (hosted Postgres 15+) |
| CI | GitHub Actions |
| Optional rate-limit store | Upstash Redis (off unless configured) |

## 6.2 Intended university hosting (choose one)

### Option A — Recommended near-term

**App** on university-managed Node host (VM/container behind CU reverse proxy + TLS).  
**Data/Auth** remain on Supabase (US region).

| Item | Value |
|------|-------|
| Timeline | TODO — target before next expo: ________ |
| App hostname | e.g. `expo.ucdenver.edu` (TODO) |
| Remains external | Supabase (and optional Upstash) |
| Leaves production | Vercel |

### Option B — Full university stack

CU hosts Node app **and** Postgres; replace Supabase Auth with campus IdP/SSO (+ guest judge strategy). Highest effort.

### Option C — Remain on Vercel + Supabase

Only if OIT/RAC explicitly accept third-party hosting for both tiers.

**Selected option (fill):** ________  
**OIT architecture approval date:** ________  
**Migration owner:** ________

## 6.3 Hardening requirements (any host)

- TLS 1.2+ on public endpoint; HSTS per OIT standard  
- Only ports 80/443 public; app binds localhost or private network behind proxy  
- Secrets in university secret manager / platform env — not in Git  
- OS patching per OIT baseline  
- WAF / firewall rules allowing venue guest Wi-Fi clients to reach the site  
- Disable directory listing; no debug mode in production (`NODE_ENV=production`)

## 6.4 Environment separation

| Environment | Purpose | Data |
|-------------|---------|------|
| Development | Local `npm run dev` | Synthetic / anonymized |
| Staging / test | Pre-prod verification + pen test | Synthetic or subset; separate Supabase project |
| Production | Live expo | Real event data |

**Rule:** Never point local debug tools with service role at production without change ticket. Separate Supabase projects (or CU databases) for staging vs production.

## 6.5 Network / data flow

See diagrams in [`06a-architecture-data-flow.md`](./06a-architecture-data-flow.md).

External connections from the app:

1. HTTPS → Supabase API / Auth / Storage  
2. WSS → Supabase Realtime (admin live monitor)  
3. Optional HTTPS → Upstash  

No connection to SIS, Canvas, or other campus ERPs.

## 6.6 Migration checklist

1. OIT approves Option A/B/C  
2. Provision hostname + TLS  
3. Create prod secrets  
4. Apply SQL migrations  
5. Confirm US region for any remaining cloud DB  
6. Run staging pen test  
7. Cutover DNS; keep Vercel as rollback briefly if needed  
8. Decommission unused Vercel production project  
9. Update RAC with final architecture
