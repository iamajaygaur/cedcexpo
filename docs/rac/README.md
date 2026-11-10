# CEDC Expo — RAC Security Evidence Pack

**Application:** CEDC Expo (Capstone Design Expo judging and evaluation)  
**Institution:** University of Colorado Denver · College of Engineering, Design and Computing  
**Repository:** `cedcexpo`  
**Current app version:** see root `package.json`  
**Document set version:** 2026-11-10  
**Audience:** Risk Assessment Committee (RAC), OIT, application owner

This folder is the submission packet for hosting / security review. It maps 1:1 to the RAC requirement list.

## How to use this pack

1. Read [`00-evidence-checklist.md`](./00-evidence-checklist.md) — master status of every deliverable.
2. Fill yellow / `TODO` fields in [`10-roles-and-contacts.md`](./10-roles-and-contacts.md) and plan screenshots under `evidence/`.
3. Attach vendor PDFs (Vercel / Supabase) under `evidence/vendor/` when downloaded.
4. Attach scan and pen-test PDFs under `evidence/scans/` when OIT / vendor completes them.
5. Export this folder (or generate a ZIP) for RAC.

## Document index

| # | File | RAC section |
|---|------|-------------|
| 00 | [Evidence checklist](./00-evidence-checklist.md) | All |
| 01 | [Third-party security assurance](./01-third-party-security.md) | §1 |
| 02 | [Secure SDLC](./02-secure-sdlc.md) | §2 |
| 02a | [Secure code review report](./02a-secure-code-review.md) | §2 |
| 03 | [Vulnerability assessment & pen testing](./03-vulnerability-testing.md) | §3 |
| 04 | [Authentication & access control](./04-authentication-access-control.md) | §4 |
| 05 | [Data protection & privacy](./05-data-protection-privacy.md) | §5 |
| 06 | [Hosting & infrastructure](./06-hosting-infrastructure.md) | §6 |
| 06a | [Architecture & data-flow diagrams](./06a-architecture-data-flow.md) | §6 / §10 |
| 07 | [Logging, monitoring & audit](./07-logging-monitoring.md) | §7 |
| 08 | [Backup, recovery & continuity](./08-backup-recovery.md) | §8 |
| 09 | [Change management & maintenance](./09-change-management.md) | §9 |
| 10 | [Roles & contacts](./10-roles-and-contacts.md) | §9 / §10 |

## Templates

| Template | Purpose |
|----------|---------|
| [`templates/plan-confirmation.md`](./templates/plan-confirmation.md) | Record Vercel / Supabase subscription plans |
| [`templates/vendor-doc-request.md`](./templates/vendor-doc-request.md) | Email text to request SOC 2 / ISO docs |
| [`templates/pen-test-scope.md`](./templates/pen-test-scope.md) | Scope brief for OIT / pen-test vendor |

## Evidence folder layout

```
docs/rac/evidence/
  npm-audit-YYYYMMDD.txt          # Dependency scan (generated)
  npm-audit-YYYYMMDD.json
  vendor/                         # SOC2 / ISO PDFs (add when obtained)
  scans/                          # Vuln scan + pen-test reports (add when obtained)
  screenshots/                    # Plan billing screenshots, MFA screenshots, etc.
```

## Honesty rule for RAC

Items marked **COMPLETE** are implemented in the product or written here from source of truth.  
Items marked **PARTIAL** exist but need a named gap closed before production.  
Items marked **PENDING** require OIT, a paid vendor plan, or an external assessment — they are not fabricated.
