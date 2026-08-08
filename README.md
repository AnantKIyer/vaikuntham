# Vaikuntham

Hostel management platform — allotment, fees, occupancy, and operations.

**Stack (locked):** Next.js 15 · PostgreSQL on Neon · Prisma 6 · Clerk · Tailwind

**Demo target:** 2026-08-31 · [Linear project](https://linear.app/cobble-ai/project/vaikuntham-ea7ffff93a0c)

## Quick start

```bash
cp .env.example .env
# Fill Neon DATABASE_URL + DIRECT_URL (and optionally Clerk keys)

npm install
npm run db:generate
npm run db:migrate   # requires real Neon URLs
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) · App shell at `/dashboard`.

### Cloud-first Neon

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string → `DATABASE_URL` in `.env`
3. Run `npx prisma migrate deploy` (or `npm run db:migrate` for interactive)

Both your laptop and Vercel should point at Neon (use a `dev` branch for day-to-day).

When you switch to Neon **pooled** URLs later, add `directUrl = env("DIRECT_URL")` to `prisma/schema.prisma` and set `DIRECT_URL` to the non-pooled string.

### Auth

| Mode | Config |
|------|--------|
| Clerk | Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` |
| Local UI without Clerk | `AUTH_DEV_BYPASS=true` (never in production) |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Prisma client |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Prisma Studio |
| `npm run db:validate` | Validate schema |

## Project layout

```
src/
  app/           # App Router pages
  components/    # UI + layout
  lib/           # db, utils, permissions
  server/        # auth session, audit
prisma/
  schema.prisma  # Domain model
```

## Coding standards

See [CONTRIBUTING.md](./CONTRIBUTING.md). Highlights:

- Money as integer paise — never float
- Every write scoped by `hostelId` + `requireRole`
- Mutations via Server Actions only — no client DB access
- Prisma migrations required — no `db push` in production

## Phase map

| Week | Focus |
|------|--------|
| W1 (now) | Foundation: scaffold, schema, auth, shell |
| W2 | Rooms, residents, allotment |
| W3 | Fees, payments, dashboards |
| W4 | Seed, deploy, demo freeze |
