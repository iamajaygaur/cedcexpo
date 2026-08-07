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

## Stack

Next.js App Router · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Auth, Postgres, RLS, Realtime) · PWA

## Roles

| Role | Entry |
|------|--------|
| Admin | `/admin/dashboard` |
| Judge | `/judge/dashboard` |

Same `/login` page; role comes from `profiles.role` (never from the client).
