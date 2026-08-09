# ADR 0001 — Database & API stack

**Status:** Accepted · 2026-08-08  
**Linear:** CB-142

## Decision

Use **PostgreSQL on Supabase** + **Prisma 6** + **Clerk** for auth. Cloud-first Postgres (local app → cloud DB). Supabase is used as the **database host only** — not Auth, RLS, or Realtime.

> **2026-08-08 update:** API layer moved to NestJS REST per [ADR-0002](./ADR-0002-service-split.md) (CB-143). Server Actions are no longer the mutation surface.  
> **2026-08-09 update:** Postgres host moved from Neon → Supabase (DB-only). Prisma + Clerk unchanged.

## Consequences

- Prisma 6 (not 7); `DATABASE_URL` points at Supabase (URL-encode special characters in the password; `sslmode=require`)
- Prefer Session/Direct (port 5432) for migrations and day-to-day `DATABASE_URL`; Transaction pooler (6543) only when needed at scale — then set Prisma `directUrl` / `DIRECT_URL` to a 5432 endpoint for migrate
- Never `prisma db push` in this repo (partial indexes)
- Realtime occupancy deferred (refresh-on-navigate for demo)
- `AUTH_DEV_BYPASS` + `NEXT_PUBLIC_AUTH_DEV_BYPASS` (both required) for UI without Clerk during foundation
