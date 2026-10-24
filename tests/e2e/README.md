# End-to-end tests (Playwright)

## Before you run them

```bash
npm install                       # installs @playwright/test
npx playwright install chromium   # downloads the browser binary (first time only)
npm run seed                      # seeds the dev DB with the expected fixture users
```

## Running

```bash
npm run dev                       # in one terminal
npm run test:e2e                  # in another

# Or interactive mode:
npm run test:e2e:ui
```

## What's covered

| Spec                        | Flow                                                                     |
| --------------------------- | ------------------------------------------------------------------------ |
| `signin.spec.ts`            | Credentials sign-in; role-aware nav; invalid-password rejection          |
| `indent-lifecycle.spec.ts`  | Indenter creates a draft indent → submits → sees SUBMITTED pill          |
| `approval.spec.ts`          | AD opens the queue → decides the first chain → lands back on the queue   |

## Mutations

These tests write to the DB. Re-run `npm run seed` whenever you want a
clean baseline — the seed wipes workflow fixtures (indents, chains, offers,
TSRs, CSTs, PRs) and leaves the user/section/firm registry intact.

## In CI

`playwright.config.ts`'s `webServer` block boots `npm run build && npm run
start` and waits for `/api/health` before the suite runs — so a GitHub
Actions job only needs the MySQL service container we already provision.
