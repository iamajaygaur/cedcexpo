# CEDC Expo

Judging and evaluation PWA for **CU Denver College of Engineering, Design and Computing** Capstone Design Expo events.

**Product name:** CEDC Expo  
**Institution:** University of Colorado Denver · CEDC  
**Current version:** [1.0.0](./CHANGELOG.md) · see [Releases](#releases)

## Quick start

```bash
cp .env.local.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# Apply migrations (SQL Editor or supabase db push)
npm install
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login).

### Admin forgot password

From the login page, choose **Administrator** → **Forgot Password?**, or open
`/forgot-password`. Add this Redirect URL in Supabase → Authentication → URL
Configuration:

- `{NEXT_PUBLIC_APP_URL}/api/auth/callback`

Judge passwords are reset by an admin under Judges Management — not via email.

## E2E tests

```bash
npx playwright install chromium   # once
npm run test:e2e                  # public smoke + screenshots
```

Authenticated flows need credentials in `.env.local` (see `.env.local.example`):

- `E2E_ADMIN_USERNAME` / `E2E_ADMIN_PASSWORD`
- `E2E_JUDGE_USERNAME` / `E2E_JUDGE_PASSWORD`

Without them, those specs are skipped. CI runs the same suite; add the matching
GitHub Actions secrets to enable auth coverage on PRs.

## Stack

Next.js App Router · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Auth, Postgres, RLS, Realtime) · PWA

## Roles

| Role | Entry |
|------|--------|
| Admin | `/admin/dashboard` |
| Judge | `/judge/dashboard` |

Same `/login` page; role comes from `profiles.role` (never from the client).

## Releases

We use **trunk-based development** on `main` with [SemVer](https://semver.org/) tags — the usual commercial pattern for a product this size (no long-lived release branches).

| Version | Tag | What it marks |
|---------|-----|----------------|
| 1.0.0 | `v1.0.0` | Expo-ready: reliability, Groups/Judges boards, click affordances |
| 0.3.0 | `v0.3.0` | Brand polish, e2e CI, motion feedback |
| 0.2.0 | `v0.2.0` | Commercial visual redesign |
| 0.1.0 | `v0.1.0` | Initial judging app |

**Ship a new version**

1. Land work on `main` as usual.
2. Update `CHANGELOG.md` (`Unreleased` → new section) and bump `package.json` `version`.
3. Commit, then tag: `git tag -a vX.Y.Z -m "vX.Y.Z"` and `git push origin main --tags`.
4. Publish a GitHub Release from that tag (`gh release create vX.Y.Z`).

Full notes: [CHANGELOG.md](./CHANGELOG.md).
