# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

> **New session — or just cloned this on another device? Read [`HANDOFF.md`](HANDOFF.md) first.**
> It holds the current state, the two-device GitHub sync workflow, and where to continue next.

## Overview

**Procurement Management System (DP-Navy)** — an enterprise procurement workflow for the
Navy Directorate of Procurement (DP-N), modelling the two-stage procurement cycle:

```
Indent → Multi-level Approval → IT dispatch → Technical & Commercial offers
       → TSR → CST → Purchase Requisition → Advertisement → Contract
       → Guarantee → Invoice → Payment → Letter of Credit → LC Amendment
```

It is a real-world test target for the **ZeroLinkAI compliance platform (ZCI)** — see
[ZeroLinkAI compliance context](#zerolinkai-compliance-context) below. That relationship
constrains some UI/data decisions, so read that section before reshaping forms.

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 20 LTS |
| Framework | Next.js 14 (App Router) — API routes + SSR UI, under `src/app/` |
| Language | TypeScript (strict) |
| Database | MySQL 8 |
| ORM | Prisma 5 |
| Auth | NextAuth v5 (credentials + JWT + RBAC) |
| Validation | Zod |
| Logging | Pino (structured JSON, request-scoped) |
| Testing | Vitest (unit/integration) + Playwright (e2e) |
| Observability | OpenTelemetry (OTLP) |

## Getting started

```bash
cp .env.example .env            # set DATABASE_URL + NEXTAUTH_SECRET (openssl rand -base64 32)
npm install                     # runs `prisma generate` via postinstall
npx prisma migrate dev          # create/upgrade the schema
npm run seed                    # seed demo users, fiscal years, indents, approval chains
npm run dev                     # Next dev server → http://localhost:3000
```

A local **MySQL 8** must be reachable at the `DATABASE_URL` (default
`mysql://root:@127.0.0.1:3306/procurement`). The DB + seeded data are **per-machine** — the
repo carries the schema and seed script, not the data (see HANDOFF for the two-device note).

> The default dev port is **3000**; during ZeroLink screen-companion testing the app was run
> on **3200** (`next dev -p 3200`). Either is fine — just match `NEXTAUTH_URL`.

## Common commands

```bash
npm run dev            # dev server
npm run build          # prisma generate && next build
npm run typecheck      # tsc --noEmit  (run before committing)
npm test               # vitest run
npm run test:e2e       # playwright test  (needs a running app + seeded DB)
npm run seed           # tsx prisma/seed.ts
npm run prisma:studio  # browse the DB
npx prisma migrate dev --name <desc>   # new migration after editing prisma/schema.prisma
```

## Architecture — Clean / Hexagonal + light DDD

Business rules do **not** know about Prisma, HTTP, or Next.js. Respect the layer boundaries:

```
prisma/              Prisma schema + migrations + seed.ts
src/
  app/               Next.js App Router — UI pages + API handlers ONLY (thin)
    (app)/           authenticated pages: dashboard, indents, approvals, tsrs, admin, firm, …
    (auth)/          signin, forgot/reset-password
    api/             REST handlers: indents, approvals, csts, prs, tsrs, technical-offers, …
  domain/            PURE business logic — aggregates, invariants, no I/O
                     (approval, cst, indent, itproforma, offers, pr, tsr, shared, errors)
  application/       Use-cases that orchestrate the domain through PORTS (interfaces)
  infrastructure/    Adapters behind the ports: Prisma repos, auth, mail, jobs, logging,
                     ratelimit, storage, DI composition
  interfaces/http/   HTTP concerns: Zod request schemas, error mapping, auth guards
  interfaces/ui/     shared UI building blocks
  config/            validated environment
tests/               Vitest unit + integration
```

**Key rules of the house:**
- **Aggregate roots are `Indent` and `ApprovalChain`.** Workflow state transitions are
  enforced *inside* the aggregate (`src/domain/`), never in a React component or API route.
  The DB is a persistence detail.
- **Unit of Work.** Every use-case runs inside one Prisma `$transaction` behind a `UnitOfWork`
  port, so partial writes can't leak. Add new writes through a use-case, not ad-hoc in a route.
- **Ports & adapters.** New external dependency → define a port in `application/ports`, implement
  it in `infrastructure/`, wire it in `infrastructure/composition`. Don't import Prisma from a
  page or the domain.
- **Validation at the edge.** Every API input is parsed with a Zod schema in `interfaces/http`
  before it reaches a use-case.
- **RBAC.** Roles live in the `Role`/`UserRole` model; guard pages and handlers, don't trust the client.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full write-up and
[`docs/BACKUP_AND_RESTORE.md`](docs/BACKUP_AND_RESTORE.md) for DB ops.

## Domain model (Prisma)

Core entities (full list in `prisma/schema.prisma`):
`User`/`UserRole`/`Section`, `FiscalYear`/`BudgetHead`/`BudgetAllocation`, `Firm`,
`Indent`/`IndentItem`/`IndentStatusHistory`, `ApprovalChain`/`ApprovalStep`,
`ITPerforma`/`ITFirmInvite`, `TechnicalOffer`/`TechnicalScrutinyReport`(TSR)/`TSREvaluation`/`TSRQuery`,
`CommercialOffer`, `CST`/`CSTLine`, `PurchaseRequisition`, plus the **execution half**:
`Advertisement`, `Contract`, `Guarantee`, `Invoice`, `Payment`, `LetterOfCredit`, `LCAmendment`.
Cross-cutting: `Attachment`, `Notification`, `Comment`, `AuditLog`, `DigestRecipient`.

Enums encode the workflow: `IndentStatus`, `ProcurementMethod` (OPEN_COMPETITIVE_BIDDING /
RFQ / …), `ProcurementCategory`, `ApprovalChainStatus`/`ApprovalStepStatus`, `TSRStatus`/`TSRVerdict`,
`CSTStatus`, `PRStatus`, `ExecutionContractStatus`, `GuaranteeType`.

## ZeroLinkAI compliance context

This repo is the procurement system that **ZeroLinkAI's ZCI compliance engine** evaluates against
signed doctrines (**PPRA** rules and **DPP&I-35**). Two ways it reads this app:
1. **DB/API** — the compliance engine maps these tables to its canonical fields/events.
2. **Screen companion** — a browser-extension overlay (the "ZeroLink Companion" 📎) reads the
   **DOM of these pages** (labels + values) and flags compliance issues in place.

**Implications for UI/UX work here:**
- Keep form fields **labelled** (visible `<label>`, `for=`/`aria-label`, `<dt>/<dd>`, or
  clear label→value markup). The companion extracts fields by their on-screen labels; label-less
  or purely visual fields become invisible to it.
- Don't rename a field's user-facing label gratuitously — a saved "field profile" in the
  companion maps labels→canonical keys. A reword can silently break a mapping until re-confirmed.
- Dates and money fields should render unambiguously (textual month like `05 Jan 2026`, numbers
  without lossy formatting) — the engine parses them.

### Known gaps (as of 2026-10-28, from the ZeroLinkAI side)
- The schema now **includes** the execution-half models (advertisement, guarantee, contract,
  invoice, payment, LC, LC amendment) — these were merged in. The remaining gap is **data**:
  only ~**4 of 23** seeded indents proceed to **award + execution**, so execution-stage rules
  (advertisement lead-time, guarantees, invoices/payments, LC amendments) are mostly
  `NOT_EVALUABLE` for lack of seeded cases. **Seeding more cases through award→execution** is the
  highest-leverage data task.
- `ProcurementMethod` matters for rule applicability: e.g. the "≥3 quotations" condition is an
  **RFQ-only** rule; all seeded indents are `OPEN_COMPETITIVE_BIDDING`, so it is *not applicable*
  to them (not a breach). Keep methods accurate when seeding.

## Conventions
- TypeScript strict; `npm run typecheck` must be clean before a commit.
- Match the surrounding layer's style; never reach across a boundary (no Prisma in `app/` or `domain/`).
- New workflow step → model + migration + domain transition + use-case + port/adapter + Zod schema + page/route + test.
- Commit on a feature branch (e.g. `feat/ui-ux`), not `main`. See HANDOFF for the sync flow.
