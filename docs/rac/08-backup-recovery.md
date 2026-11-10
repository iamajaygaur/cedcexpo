# §8 — Backup, recovery, and business continuity

## 8.1 What must be recoverable

- Events, teams, student roster fields  
- Judge accounts and assignments  
- Evaluation drafts and submitted scores/comments  
- Criteria configuration  
- Archived event data needed for institutional records  
- (Optional) profile avatars in Storage  

Source code is in GitHub (not a substitute for database backup).

## 8.2 Backup procedures

### If production uses Supabase

| Plan | Backup posture |
|------|----------------|
| Free | **Not acceptable for live expo** (pause risk; weak ops) |
| Pro | Daily backups (document retention days from dashboard) |
| Team+ | Longer retention; obtain SOC report if needed |

**Procedure:**

1. Confirm plan is Pro or higher before expo week  
2. Note PITR / daily backup settings in `evidence/screenshots/`  
3. Restrict dashboard access to maintainers  
4. Quarterly: perform restore test into a **staging** project

### If production uses university Postgres

Follow OIT enterprise backup schedule; document job name and RPO/RTO here once assigned.

**Proposed targets:** RPO ≤ 24 hours · RTO ≤ 4 hours during expo week · RTO ≤ 1 business day otherwise.

## 8.3 Restore procedure (Supabase-shaped)

1. Declare incident with application owner  
2. Create or select staging/recovery project  
3. Restore from daily backup / PITR to timestamp before corruption  
4. Point staging app env at restored DB; verify row counts for `evaluations` / `evaluation_scores`  
5. If validated, plan production cutover (env update + DNS) with OIT  
6. Record restore test evidence (date, operator, success, duration) under `evidence/scans/` or `evidence/screenshots/`

**Restore test status:** PENDING — date ________ · operator ________ · result ________

## 8.4 Expo-day continuity plan

| Risk | Mitigation |
|------|------------|
| Deploy breaks prod | **Code freeze** 48h before expo; only hotfix with dual approval |
| Auth outage | Pre-print judge credentials sheet (secure custody); status page communication |
| Scoring unavailable | Paper rubric backup for critical teams; enter scores after recovery |
| Venue Wi-Fi | Confirm guest network can reach hostname; provide cellular hotspot for admin if needed |
| Single admin unavailable | Two trained admins minimum; documented runbook |

**Expo contacts:** see `10-roles-and-contacts.md`.

## 8.5 Secure backup storage

Backups remain inside the database provider or OIT backup system. Do not download full DB dumps to personal laptops. If a dump is required, encrypt at rest and delete after use.
