# ADR 0001 — Database & API stack

**Status:** Accepted · 2026-08-08  
**Linear:** CB-142

## Decision

Use **PostgreSQL on Neon** + **Prisma 6** + **Next.js Server Actions**, with **Clerk** for auth. Cloud-first Neon (local app → cloud DB).

## Consequences

- Prisma 6 (not 7) for familiar `url`/`directUrl` Neon workflow
- Realtime occupancy deferred (refresh-on-navigate for demo)
- `AUTH_DEV_BYPASS` + `NEXT_PUBLIC_AUTH_DEV_BYPASS` (both required) for UI without Clerk during foundation
