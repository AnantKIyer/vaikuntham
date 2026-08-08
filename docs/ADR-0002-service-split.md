# ADR 0002 — NestJS API + Next.js web service split

**Status:** Accepted · 2026-08-08  
**Linear:** CB-143 · Epic CB-144

## Decision

Split Vaikuntham into a **pnpm monorepo** with:

- `apps/api` — NestJS 11 REST API (`/v1`, Swagger at `/docs`)
- `apps/web` — Next.js 15 UI only (Clerk, no Prisma, no domain Server Actions)
- `packages/db` — Prisma 6 + Supabase Postgres schema/migrations
- `packages/shared` — Zod DTOs, permissions, API contracts

Demo target moves **2026-08-31 → 2026-09-14** to harden foundation first.

## Context

The product will grow across residents, allotment, fees, attendance, and resident portals. A proper HTTP service boundary is needed before feature velocity. The initial Next.js monolith used Server Actions as the API layer (ADR-0001 / CB-142).

## Consequences

- Supersedes **Server Actions as API layer** from ADR-0001; Supabase Postgres + Prisma 6 + Clerk remain locked (Supabase Auth/RLS not used)
- All domain writes become NestJS modules + REST endpoints
- Web uses typed `apiFetch` (RSC) and `useApiClient` (client components)
- Clerk JWT verified on API via `@clerk/backend`; dev bypass on both apps for local UI
- **Provisioning:** org-bound (`Hostel.clerkOrgId`); first org member bootstraps as admin; further members via email invite — no demo auto-join
- **Auth:** global `AuthGuard` (default deny); `@Public()` only on `/health`
- Future stories referencing "Server Action" → implement as NestJS endpoint instead

## Operations (required)

- Web, API, and Supabase Postgres **same region**; use pooled URL for runtime when scaling
- Local dev may use Docker Postgres for speed; CI runs integration tests against Postgres 16
- Fee/payment schema and paise columns ship with the fees story — not before

## Non-goals (this ADR)

- GraphQL / gRPC
- Separate production deploy hardening (follows demo freeze)
- Residents / fees features (still backlog; they target Nest modules when built)
