# Contributing to Vaikuntham

## Branching

- Branch from `main` using Linear: `cb-###-short-slug`
- Open PRs early; keep them vertical (API module + web UI + shared DTOs)

## Commits

Conventional commits preferred:

- `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`

Reference Linear IDs in the body when useful (`CB-144`).

## Definition of done

1. Prisma migration in `packages/db` if schema changed
2. NestJS endpoint with global auth ( `@AllowMember()` or `@RequirePermissions` ) + hostel scope
3. Web UI wired via `apiFetch` / `useApiClient` with empty/loading/error states
4. `pnpm lint` + `pnpm typecheck` + `pnpm test:integration` (when touching auth/tenancy/allotment)
5. No secrets in the diff

## Code rules

| Area | Rule |
|------|------|
| Purpose | Every change must serve a current story or user ask — no speculative code |
| TypeScript | `strict`; avoid `any` |
| Data | Prisma only in `apps/api` via `@vaikuntham/db` |
| Authz | Global `AuthGuard` (default deny); `@Public()` / `@AllowMember()` / `@RequirePermissions(...)` |
| Mutations | NestJS REST — not Server Actions |
| Money | Integer paise in schema when fee tables exist — no premature helpers |
| Tenancy | Filter by `hostelId` on every query; no auto-join — invites or org bootstrap only |
| Allotment | Partial unique indexes on active bed/resident; use `$transaction` in API |
| UI | One primary CTA per page header; reuse `components/ui` |
| Abstractions | Wait for the second use before extracting |

See `.cursor/rules/purposeful-code.mdc` (always applied in Cursor).

## Environment

Copy `.env.example` → `.env` at repo root. Never commit `.env`.

Run both apps locally: `pnpm dev` (API :3001, web :3000).

**Region:** local Postgres or Supabase project must be in your region. See README “Required operations”.

## PR checklist

- [ ] Linked Linear issue
- [ ] Migration included if needed
- [ ] Roles considered on API
- [ ] No `console.log` of PII
- [ ] Smoke the happy path locally (health + dashboard + rooms)
