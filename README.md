# Vaikuntham

Hostel management platform — allotment, fees, occupancy, and operations.

**Stack (locked):** Next.js 15 (web) · NestJS 11 (API) · PostgreSQL on Supabase · Prisma 6 · Clerk · Tailwind

**Demo target:** 2026-09-14 · [Linear project](https://linear.app/cobble-ai/project/vaikuntham-ea7ffff93a0c)

## Monorepo layout

```
apps/
  api/          NestJS REST API (/v1)
  web/          Next.js UI (no Prisma, no domain Server Actions)
packages/
  db/           Prisma schema + client
  shared/       DTOs, permissions, API route constants
```

## Quick start

```bash
cp .env.example .env
# Fill Supabase DATABASE_URL (and optionally Clerk keys)

npm run setup      # or: npx pnpm@9.15.0 install
npm run db:generate
npm run db:migrate   # requires real Supabase URL
npm run dev:fast     # daily dev — skip package rebuilds
npm run dev          # first run / after shared/db changes
```

If you use pnpm directly: `pnpm install && pnpm dev` (enable via `corepack enable` if needed).

Open [http://localhost:3000](http://localhost:3000) · App shell at `/dashboard` · API health at [http://localhost:3001/health](http://localhost:3001/health)

### Performance tips

**Postgres is fast. Remote cloud DB + our split architecture is what you feel.**

Each dashboard page: browser → Next.js (RSC) → NestJS API → Supabase (often 150–400ms RTT from India). That stack is correct for production, but a distant DB region will never feel instant from a laptop.

| Symptom | Cause | Fix |
|---------|-------|-----|
| `@prisma/client` warnings in web dev logs | Was pulling Prisma via shared (fixed — enums live in `@vaikuntham/shared` only) | Restart dev after pull |
| Slow dev startup | Rebuilds db + shared every time | `npm run dev:fast` after first run |
| 1–3s page loads | Remote DB (Tokyo) + Web→API hop | **Local Postgres for dev** (`npm run db:local:setup`); Supabase for shared/prod |
| Lag after every click | `router.refresh()` refetched whole page | Bed status now updates optimistically (no full refresh) |
| Slow mutations (add block) | Still refreshes page to show new data | Expected until client cache layer lands |

**Supabase checklist**

1. Use the **URI** from Project Settings → Database (`sslmode=require`). URL-encode special characters in the password.
2. Prefer a project region near you / near the API.
3. For snappy local UX without cloud latency: point `DATABASE_URL` at local Postgres (`docker run -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:16`) — same schema, ~1ms queries.

**Production:** deploy API + web in the same region as Supabase. Expect ~100–300ms per page, not 10ms — that's normal for SSR + auth + DB.

Architecture note: each dashboard page goes **Web → API → Supabase**. Supabase Auth / RLS / Realtime are **not** used — Nest + Clerk own that layer.

### Cloud-first Supabase (DB only)

1. Create a project at [supabase.com](https://supabase.com)
2. Copy the Postgres connection string → `DATABASE_URL` in `.env`
3. Run `pnpm db:migrate:deploy` (or `pnpm db:migrate` locally)

### Auth & tenancy

| Mode | Config |
|------|--------|
| Clerk (production) | Clerk keys; `AUTH_DEV_BYPASS=false`; link each `Hostel.clerkOrgId` to a Clerk org |
| Provisioning | **No auto-join.** First user in an org → `ADMIN`. Everyone else needs a **membership invite** (email) from an admin |
| Local UI without Clerk | `AUTH_DEV_BYPASS=true` on API + both web bypass flags `true` |

Invites: `POST /v1/memberships/invites` (admin) · list via `GET /v1/memberships/invites`.

Use **email** sign-in in Clerk so invite emails match.

## Required operations (not optional)

Deploy and dev environments **must**:

1. **Co-locate** web, API, and Supabase in the **same region**.
2. Use a valid Supabase `DATABASE_URL` with `sslmode=require` (pooler port 6543 when you need it at scale).
3. Run `pnpm db:migrate:deploy` before API startup in CI/staging/production.

For fast day-to-day dev, use **local Postgres** — same migrations, ~10–100ms page loads:

```bash
npm run db:local:setup
# Set in .env: DATABASE_URL="postgresql://postgres:dev@localhost:5433/vaikuntham"
npm run dev:fast
```

Cloud Supabase (ap-northeast-1 from India) is normal at **300ms–2.5s** per page — physics, not a bug. Use Supabase for shared/staging/prod.

See performance notes above for latency expectations (Web → API → DB).

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | API + web in parallel |
| `pnpm dev:api` | NestJS only (:3001) |
| `pnpm dev:web` | Next.js only (:3000) |
| `pnpm build` | Build all packages |
| `pnpm lint` | ESLint all workspaces |
| `pnpm typecheck` | TypeScript all workspaces |
| `pnpm db:generate` | Prisma client |
| `pnpm db:migrate` | Apply migrations (dev) |
| `pnpm db:migrate:deploy` | Apply migrations (CI/prod) |
| `pnpm test:integration` | API authz, tenancy, allotment constraint tests (requires Postgres) |
| `pnpm db:studio` | Prisma Studio |

## Architecture

- **Mutations:** HTTP REST via NestJS (`apps/api`) — not Server Actions
- **Reads:** Next.js RSC pages fetch API with Clerk JWT (or dev bypass)
- **Tenancy:** every domain write scoped by `hostelId` + role guards
- **Money:** integer paise in DB columns when fee/payment tables land — no money helpers until then

See [docs/ADR-0002-service-split.md](./docs/ADR-0002-service-split.md).

## Coding standards

See [CONTRIBUTING.md](./CONTRIBUTING.md).
