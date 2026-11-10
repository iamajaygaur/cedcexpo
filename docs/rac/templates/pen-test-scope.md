# Template — Application penetration test scope (CEDC Expo)

## Target

| Item | Value |
|------|-------|
| Application | CEDC Expo |
| Staging URL | TODO |
| Production URL (out of scope for destructive tests) | TODO |
| Auth | Supabase email/password (admin + judge) |
| Test window | TODO |
| Contacts | See `10-roles-and-contacts.md` |

## In scope

1. Login, logout, session timeout, password reset (admin)  
2. Privilege escalation (judge → admin)  
3. Horizontal access (judge A ↔ judge B evaluations / teams)  
4. Admin-only functions: events, criteria, assignments, exports, judge password reset  
5. Server actions / API routes under `/api` and form actions  
6. File upload (avatars) — type/size abuse  
7. Security headers, cookie flags, TLS  
8. Rate-limit bypass attempts on login  

## Out of scope (default)

- Physical venue controls  
- DoS against Supabase/Vercel shared infrastructure  
- Social engineering of faculty/students  
- Source-code-only review already covered separately (attach `02a`)  

## Accounts to provide

| Role | Username | Password | Notes |
|------|----------|----------|-------|
| Admin | staging-admin | (temp) | MFA off on staging only if testing MFA separately |
| Judge A | staging-judge-a | (temp) | Assigned set A |
| Judge B | staging-judge-b | (temp) | Assigned set B (disjoint) |

Rotate/disable after test.

## Deliverables expected from tester

1. Findings report with severity  
2. Reproduction steps  
3. Remediation recommendations  
4. Retest of critical/high after fixes  

Store under `docs/rac/evidence/scans/`.
