# §6a / §10 — Architecture and data-flow diagrams

## Logical architecture (current / Option A after app migration)

```mermaid
flowchart TB
  subgraph clients [Clients]
    AdminBrowser[Admin browser / PWA]
    JudgePhone[Judge phone / laptop PWA]
  end

  subgraph edge [Application tier]
    NextApp[Next.js App Router<br/>Vercel today / CU Node later]
    MW[Middleware: session + role gates + rate limit]
  end

  subgraph supabase [Supabase project — US region required]
    Auth[GoTrue Auth]
    API[PostgREST API + RLS]
    DB[(PostgreSQL)]
    Storage[Storage: avatars]
    RT[Realtime]
  end

  subgraph optional [Optional]
    Redis[Upstash Redis rate limits]
  end

  AdminBrowser -->|HTTPS| NextApp
  JudgePhone -->|HTTPS| NextApp
  NextApp --> MW
  MW -->|anon key SSR cookies| Auth
  MW -->|server actions| API
  NextApp -->|service role server-only| API
  API --> DB
  Auth --> DB
  NextApp --> Storage
  AdminBrowser -.->|WSS via client| RT
  RT --> DB
  NextApp -.->|if configured| Redis
```

## Trust boundaries

```mermaid
flowchart LR
  subgraph publicInternet [Public Internet / venue Wi-Fi]
    U[Users]
  end

  subgraph appBoundary [Application security boundary]
    App[Next.js server]
  end

  subgraph dataBoundary [Data security boundary]
    SB[Supabase Auth + DB + Storage]
  end

  U -->|TLS| App
  App -->|TLS + user JWT or service role| SB
```

## Authentication and authorization flow

```mermaid
sequenceDiagram
  participant U as User
  participant App as Next.js
  participant Auth as Supabase Auth
  participant DB as Postgres RLS

  U->>App: POST /api/auth/login
  App->>App: Zod validate + rate limit
  App->>Auth: signInWithPassword
  Auth-->>App: session cookies
  App->>DB: SELECT profiles.role
  alt role admin
    App-->>U: redirect /admin/dashboard
  else role judge and active
    App-->>U: redirect /judge/dashboard
  else
    App-->>U: deny
  end
  U->>App: Mutate evaluation / admin action
  App->>App: requireJudgeClient / requireAdminClient
  App->>DB: write with RLS policies
```

## Data stores and sensitivity

| Store | Contents | Sensitivity |
|-------|----------|-------------|
| `auth.users` | Credentials (hashed) | High |
| `profiles` / `judges` | Identity | Moderate–High |
| `team_members` | Student names/emails | High (education PII) |
| `evaluations` / scores | Judging outcomes | Moderate–High |
| Storage `avatars` | Photos | Moderate |
| App logs | Auth events (no passwords) | Moderate |

## Components remaining external after proposed migration

| If Option A | External | University-managed |
|-------------|----------|--------------------|
| Web app | — | Next.js host |
| DB/Auth/Storage/Realtime | Supabase | — |
| DNS/TLS edge | — | CU reverse proxy |
| Source/CI | GitHub | — |

Update this table when OIT locks the option.
