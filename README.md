# CEDC Capstone Design Expo — Judging PWA

Progressive Web App for the College of Engineering, Design and Computing (CU Denver) Capstone Design Expo judging system.

**Phase:** 10 — Reliability & Production (complete).

## Quick start

```bash
cp .env.local.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# Apply migrations (SQL Editor or supabase db push) — see AUTH_SETUP.md
npm install
npm run dev
```

Create users and promote an admin — see [`.planning/AUTH_SETUP.md`](.planning/AUTH_SETUP.md).

Open [http://localhost:3000/login](http://localhost:3000/login).

## Docs

- Architecture: [`.planning/PHASE1_ARCHITECTURE.md`](.planning/PHASE1_ARCHITECTURE.md)
- Security checklist: [`.planning/SECURITY.md`](.planning/SECURITY.md)
- Auth setup: [`.planning/AUTH_SETUP.md`](.planning/AUTH_SETUP.md)
- Production / Vercel: [`.planning/PRODUCTION.md`](.planning/PRODUCTION.md)
- Stitch designs: [`stitch/stitch_cedc_expo_judge_pro/`](stitch/stitch_cedc_expo_judge_pro/)

## Stack

Next.js App Router · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Auth, Postgres, RLS, Realtime) · PWA (manifest + safe static-only service worker)

## Roles

| Role | Entry |
|------|--------|
| Admin | `/admin/dashboard` |
| Judge | `/judge/dashboard` |

Same `/login` page; role comes from `profiles.role` (never from the client).
