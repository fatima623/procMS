<!-- Describe what this PR changes and why. Keep it short. -->

## What
-

## Why
-

## Risk / blast radius
<!-- Does it touch workflow logic, auth, DB migrations? What's reversible, what's not? -->

## Checklist
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] Prisma schema changes include a migration (`npx prisma migrate dev`), not just `db push`
- [ ] Any new API route enforces authn + role authz
- [ ] Any new mutating API route is covered by the CSRF middleware
- [ ] If a new form posts data, it goes through the browser fetch wrapper (not a `<form action>`)
- [ ] Updated `docs/ARCHITECTURE.md` if a boundary moved
