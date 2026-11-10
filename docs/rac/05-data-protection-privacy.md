# §5 — Data protection and privacy

## 5.1 Data categories

| Category | Examples | Stored where | Exported? |
|----------|----------|--------------|-----------|
| Event metadata | Name, semester, date, location, status | Postgres `events` | Reports |
| Team / project | Number, title, description, category, advisor, booth, QR id | `teams` | Yes (admin) |
| Student roster | Student name, optional email | `team_members` | Possible in admin exports |
| Judge profile | Name, email, org, title, department, notes, active flag | `profiles` + `judges` | Admin views |
| Auth credentials | Password hashes | Supabase Auth (not app tables) | No |
| Scores | Criterion scores, comments, draft/submitted | `evaluations`, `evaluation_scores` | Yes (admin reports) |
| Criteria config | Labels, max scores, ABET links | `evaluation_criteria`, … | Admin |
| Profile photos | Optional JPEG/PNG/WebP/GIF ≤ 2 MB | Supabase Storage bucket `avatars` | URL only |
| Operational | Report job metadata | `report_jobs` | Internal |

**Not collected:** SSN, payment card data, health/PHI, passwords in plaintext, Canvas/SIS grades.

## 5.2 Ownership and FERPA posture (draft for RAC)

- **Data owner:** CEDC faculty sponsor / application owner (see `10-roles-and-contacts.md`)  
- **University ownership:** Operational records of a CU Denver academic event  
- **Student linkage:** Student names (and optional emails) appear on team rosters. Scores are recorded against **teams/projects and judges**, not as an official transcript grade in SIS.  
- **FERPA:** Coordinate with RAC/Registrar. Working position: treat student roster fields as education-related PII; limit access to authorized expo staff; do not publish identifiable student data publicly.

Classification request to RAC: recommend labeling as **Internal / Restricted** pending their determination.

## 5.3 Encryption

| Layer | Control |
|-------|---------|
| In transit | HTTPS / TLS for browser ↔ app and app ↔ Supabase (WSS for Realtime) |
| At rest | Supabase/cloud provider disk encryption for Postgres + Storage; CU host disks if migrated |
| Secrets | Env vars / platform secret store; service role never shipped to browser |

## 5.4 Database access restriction

- Browser clients use **anon key** subject to RLS  
- Service role key only on server (`lib/supabase/admin.ts`)  
- Human DB access limited to application administrators via Supabase dashboard (or CU DBA if migrated)  
- No public Postgres port required for the Next.js app (uses HTTPS API)

## 5.5 Retention and secure deletion

| Data | Default retention (proposed) | Deletion |
|------|------------------------------|----------|
| Active event | Until event archived | Soft via status `archived` |
| Archived event scores | **TODO years** (owner decides; suggest 3–7 academic years) | Delete archive event + cascades / Storage objects |
| Inactive judge accounts | Deactivate immediately after expo; delete Auth user within 90 days if not returning | Admin procedure |
| Profile avatars | With account | Remove object from Storage on account delete |
| Backups | Follow provider retention (e.g. Supabase Pro daily backups) | Expire with backup window |

**Secure deletion steps:**

1. Confirm legal/owner approval  
2. Export any required institutional archive to approved university storage  
3. Delete or anonymize DB rows; remove Storage objects  
4. Record date/actor in remediation or ops log

## 5.6 Export controls

- CSV / report export: **admin only** (`lib/admin/export-csv.ts` + `requireAdminClient`)  
- Rate limited  
- Exports should be stored on university-approved drives, not personal unsanctioned cloud, when containing student names/emails

## 5.7 Clinical / research

**Purpose:** Other — academic event operations (Senior Design Expo judging).  
**Not clinical. Not human-subjects research. IRB:** N/A.
