# Architecture

## 1. Context

The system automates the DP(Navy) procurement workflow. A single procurement
case (an **Indent**) travels through three loosely coupled sub-processes, each
with its own multi-step approval chain:

| Phase | Chain                                     | Trigger                         |
| ----- | ----------------------------------------- | ------------------------------- |
| 1     | AD → DD → DP(N) → DGDP → Secy DP          | Indent approval                 |
| 2     | AD → DD → DP(N)                           | IT Issue Proforma approval      |
| 3     | AD → DD   (full chain if single-quote)    | CST (Comparative Statement)     |

Between the chains the case moves through specialised sections (CR, Budget,
Coord, Concerned ADP, SUPTD, Inspectorate) and interacts with external
**Firms**. A full state inventory is in `prisma/schema.prisma`
(`IndentStatus` enum).

### Non-functional targets

| Attribute        | Target                                                   |
| ---------------- | -------------------------------------------------------- |
| Users            | ~200 concurrent (internal) + a few hundred firm users    |
| p95 API latency  | ≤ 300 ms for list/detail; ≤ 800 ms for approval actions  |
| Availability     | 99.5% (business hours), 99.0% overall                    |
| Audit            | Every state transition + approval decision is auditable  |
| Data residency   | On-prem MySQL (RHEL) with daily full + 15-min PITR dumps |

## 2. Architectural style

**Clean Architecture + light Domain-Driven Design.**

```
┌───────────────────────────────────────────────────────────────────┐
│ interfaces/http (Next.js route handlers, Zod, HTTP errors)        │
├───────────────────────────────────────────────────────────────────┤
│ application  (use-cases, ports, DTOs)                             │
├───────────────────────────────────────────────────────────────────┤
│ domain       (aggregates, value objects, invariants, events)      │
├───────────────────────────────────────────────────────────────────┤
│ infrastructure (Prisma, Pino, NextAuth, object storage adapters)  │
└───────────────────────────────────────────────────────────────────┘
```

Dependencies point **inward only**. The domain layer does not import from
Prisma, Next.js, Pino, or Zod. The application layer defines **ports**
(interfaces) that the infrastructure layer implements. This is enforced in
code review and, in the next iteration, by an ESLint boundary rule.

### Why not "service + repository on Prisma models"?

That style is faster to start but ties the business rules to the ORM. Our
workflow has non-trivial invariants (e.g. _"an ADP cannot start IT preparation
unless the indent-approval chain has a terminal APPROVED status"_). Keeping
those in a pure aggregate makes them unit-testable in-memory and keeps the
Prisma schema a persistence concern we can evolve independently.

## 3. Aggregates

Two aggregate roots carry the workflow:

### `Indent`
Owns the end-to-end case: items, status transitions, observations, link to
the IT proforma. Transitions are enforced inside the aggregate: `submit()`,
`markBudgetVerified()`, `assignControlNumber()`, `startITPreparation()`, etc.
Every transition emits a `DomainEvent` which the application layer persists
to `AuditLog` and `IndentStatusHistory`.

### `ApprovalChain`
A reusable aggregate used by Indent, IT Proforma, and CST approvals. Encodes
the ordered steps and the policy for advancing / rejecting. Any step may
`REJECTED` (chain fails) or `RETURN` (sent back to the originating section for
rework). Only one step is pending at any time.

## 4. Workflow engine

A tiny in-process state machine (`domain/indent/IndentStateMachine.ts`) maps
`(IndentStatus, Event) → IndentStatus`. Illegal transitions throw a
`DomainError` which the HTTP layer renders as `409 CONFLICT`. The state
machine lives in the domain layer and is covered by unit tests enumerating
every edge.

**Why not an off-the-shelf workflow engine (Camunda, Temporal, ...)?**
The workflow is wide but shallow (≤ 25 states, no long waits, no retries,
no human timers beyond business days). The operational cost of running
Temporal would dominate; a typed state machine is clearer and ships faster.

## 5. Concurrency & consistency

- **Row-level optimistic concurrency.** Every mutable aggregate carries a
  `version Int @default(0)`. Repositories issue
  `UPDATE … WHERE id = ? AND version = ?` and raise
  `ConcurrencyConflictError` on 0-row updates, which the HTTP layer renders
  as `409`.
- **Unit of Work.** Every use-case runs inside a single Prisma `$transaction`,
  passed in as a port (`UnitOfWork`). This keeps multi-aggregate writes
  (e.g. _"advance chain + change indent status + append audit log"_)
  atomic.
- **Approval chain assignment is non-exclusive.** A step's `assignedUserId`
  is a hint; any user holding the step's `Role` may act. This matches the
  real-world ops behaviour (ranks rotate) and avoids ticket-queue blockage.

## 6. Security

- **AuthN.** NextAuth v5 with the credentials provider. Passwords are hashed
  with `bcrypt` (cost 12). Sessions are JWT (14-day sliding, 2-hour idle).
- **AuthZ.** Role-Based Access Control. Routes declare required roles via a
  `withAuth({ roles: ['AD','DD'] })` middleware; use-cases also re-check at
  the application layer (defence in depth).
- **Input validation.** Zod schemas at the HTTP boundary. The application
  layer only ever sees validated DTOs.
- **Transport security.** HSTS, strict CSP (set by middleware), SameSite=Lax
  cookies, CSRF double-submit tokens on mutating requests.
- **Audit.** Every mutating use-case writes an `AuditLog` row inside the same
  transaction. Logs are append-only (no update/delete API).
- **Data at rest.** MySQL InnoDB with filesystem-level encryption.
  Attachment blobs live in an S3-compatible object store (encrypted) — only
  signed URLs are handed to the browser.
- **Secrets.** Loaded via `src/config/env.ts` (Zod-validated) from the
  process environment; no secret ever reaches the client bundle.

## 7. Observability

- **Logging.** Pino, JSON output, one line per request. Request ID is set in
  middleware and propagated into every log line via `AsyncLocalStorage`.
- **Metrics.** Prisma metrics preview feature exports counts and query
  histograms; a `/api/health/metrics` route exposes them in Prometheus
  format (gated to the metrics scrape role).
- **Tracing.** OpenTelemetry OTLP exporter. The HTTP handler, the use-case,
  the Prisma call, and outbound HTTP calls are all spans.
- **Error budget.** Any 5xx is counted; alert when ≥ 1% over a rolling
  10-minute window.

## 8. Testing strategy

| Layer           | Tool                 | What runs                                      |
| --------------- | -------------------- | ---------------------------------------------- |
| `domain/`       | Vitest               | Pure unit tests, in-memory, fast               |
| `application/`  | Vitest + in-memory ports | Use-case tests with fake repositories      |
| `infrastructure/` | Vitest + Prisma against disposable MySQL (Testcontainers in CI) | Repository + migration tests |
| HTTP            | Vitest + Next's `app/api` test harness | Contract/integration tests        |
| End-to-end      | Playwright           | Smoke flows against staging                    |

CI runs `typecheck`, `lint`, `test` on every PR; the integration suite runs
on merge to `main`.

## 9. Deployment

- **Build:** `next build` (standalone output).
- **Runtime:** Node 20 LTS under `pm2`. Horizontally scalable; sticky
  sessions are **not** required because sessions are JWT-based.
- **Database:** MySQL 8.0, InnoDB, `utf8mb4`, `tx_isolation = READ COMMITTED`.
- **Migrations:** `prisma migrate deploy` is run as a one-shot pre-start
  job; schema changes are additive-first.
- **CI/CD:** GitHub Actions / Jenkins pipeline runs
  `lint → typecheck → unit → integration → build → security scan → deploy`.

## 10. Trade-offs explicitly accepted

1. **No event sourcing.** We take occasional snapshots in
   `IndentStatusHistory` instead of a full event-store, trading perfect
   history for schema simplicity. Audit requirements are met by `AuditLog`.
2. **In-process workflow engine.** If the workflow grows cross-service or
   gains long human timers, we migrate to Temporal — the aggregate boundary
   makes that a mechanical change.
3. **Prisma coupling.** Repositories are the only Prisma consumers; swapping
   to Drizzle or raw SQL is a focused change in `infrastructure/`.
