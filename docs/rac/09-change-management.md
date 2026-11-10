# §9 — Change management and ongoing security maintenance

## 9.1 Change process

| Stage | Requirement |
|-------|-------------|
| Propose | Issue or PR description: why, risk, rollback |
| Build | Feature branch from `main` |
| Review | At least one human review for security-sensitive paths (`lib/auth/**`, `lib/admin/**`, `supabase/migrations/**`, workflows) |
| Test | CI green (e2e + security workflows) |
| Approve | Maintainer merge; production deploy only from `main` |
| Verify | Smoke login admin + judge on staging/prod |
| Document | Note in CHANGELOG; notify RAC if architecture/integration changes |

**Expo freeze:** No non-hotfix production changes inside the freeze window (§8).

## 9.2 GitHub repository controls (enable in UI)

| Control | Required setting |
|---------|------------------|
| Default branch | `main` |
| Branch protection | Require PR; dismiss stale reviews; no force push |
| Reviews | ≥ 1 approving review for maintainers |
| Status checks | `E2E` / `Security` workflows required when stable |
| Secrets | GitHub Actions secrets only; rotate if leaked |
| Collaborators | Least privilege; remove students after semester if temporary |

**Status:** PARTIAL until branch protection screenshots attached under `evidence/screenshots/github-branch-protection.png`.

## 9.3 GitHub Actions security

- Workflows pin reputable actions (`actions/checkout@v4`, CodeQL v3, etc.)  
- Production credentials never echoed  
- `SUPABASE_SERVICE_ROLE_KEY` only in GitHub Secrets for CI that needs it  
- Fork PRs should not receive production secrets (default GitHub behavior)

## 9.4 Patching and dependencies

- Weekly Dependabot PRs  
- CI `npm audit` on high/critical production deps  
- Remediations logged in `evidence/remediation-log.md`  
- Re-cut production after security fixes during non-freeze periods

## 9.5 Responsibilities

| Function | Role |
|----------|------|
| Application owner (business) | Faculty sponsor — policy, data retention, RAC liaison |
| Technical maintainer | Code, deps, deploys, vulnerability remediation |
| Security incident coordination | Maintainer + owner + OIT per university process |
| Hosting / network | OIT |
| Pen test procurement | OIT / RAC |

Names: [`10-roles-and-contacts.md`](./10-roles-and-contacts.md).

## 9.6 RAC re-engagement triggers

Notify RAC before:

- Replacing Supabase or Vercel  
- Adding SSO / new IdP  
- Connecting any campus system (SIS, Canvas, LDAP)  
- Storing new sensitive data categories  
- Moving data outside the United States
