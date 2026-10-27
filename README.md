# CEDC Expo

Judging and evaluation PWA for **CU Denver College of Engineering, Design and Computing** Capstone Design Expo events.

**Product name:** CEDC Expo  
**Institution:** University of Colorado Denver · CEDC

## Quick start

```bash
cp .env.local.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# Apply migrations (SQL Editor or supabase db push)
npm install
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login).

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
