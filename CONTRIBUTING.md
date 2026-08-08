# Contributing to Vaikuntham

## Branching

- Branch from `main` using Linear: `cb-###-short-slug`
- Open PRs early; keep them vertical (schema + action + UI + roles)

## Commits

Conventional commits preferred:

- `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`

Reference Linear IDs in the body when useful (`CB-122`).

## Definition of done

1. Prisma migration if schema changed
2. Server Action / query with `requireRole` / hostel scope
3. UI wired with empty/loading/error states
4. `npm run lint` + `npm run typecheck` pass
5. No secrets in the diff

## Code rules

| Area | Rule |
|------|------|
| Purpose | Every change must serve a current story or user ask — no speculative code |
| TypeScript | `strict`; avoid `any` |
| Data | Prisma only from server code |
| Authz | `requireRole(permission)` on sensitive writes |
| Money | Integer paise (`Int` / `BigInt`) |
| Tenancy | Filter by `hostelId` on every query |
| Allotment | Use `$transaction`; respect unique active constraints |
| UI | One primary CTA per page header; reuse `components/ui` |
| Abstractions | Wait for the second use before extracting |

See `.cursor/rules/purposeful-code.mdc` (always applied in Cursor).

## Environment

Copy `.env.example` → `.env`. Never commit `.env`.

## PR checklist

- [ ] Linked Linear issue
- [ ] Migration included if needed
- [ ] Roles considered
- [ ] No `console.log` of PII
- [ ] Smoke the happy path locally
