# Procurement Management System (DP-Navy)

Enterprise procurement workflow for the Navy Directorate of Procurement (DP-N),
modelled on the two-stage procurement cycle shown in the user-requirements
diagrams (Indent → Multi-level Approval → IT dispatch → Technical/Commercial
offers → CST → Purchase Requisition).

## Stack

| Layer      | Choice                                               |
| ---------- | ---------------------------------------------------- |
| Runtime    | Node.js 20 LTS                                       |
| Framework  | Next.js 14 (App Router) — API + SSR UI               |
| Language   | TypeScript (strict)                                  |
| Database   | MySQL 8                                              |
| ORM        | Prisma 5                                             |
| Auth       | NextAuth v5 (credentials + JWT + RBAC)               |
| Validation | Zod                                                  |
| Logging    | Pino (structured JSON, request-scoped)               |
| Testing    | Vitest + Supertest                                   |
| Observability | OpenTelemetry (OTLP exporter)                     |

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Short version:

- **Clean / Hexagonal + light DDD.** The business rules live in `src/domain/`
  and know nothing about Prisma, HTTP, or Next.js. The application layer
  (`src/application/`) orchestrates use-cases through **ports** (interfaces).
  Prisma, Pino, NextAuth and the HTTP controllers all live behind those
  ports in `src/infrastructure/` and `src/interfaces/`.
- **Aggregates.** `Indent` and `ApprovalChain` are the two aggregate roots.
  Workflow transitions are enforced inside the aggregate; the DB is a
  **persistence detail**.
- **Unit of Work.** Every use-case runs inside a single Prisma `$transaction`
  wrapped by a `UnitOfWork` port, so partial writes can never leak.

## Getting started

```bash
cp .env.example .env
# edit DATABASE_URL and NEXTAUTH_SECRET
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

## Layout

```
prisma/              Prisma schema + migrations + seed
src/
  app/               Next.js App Router (UI + API handlers only)
  domain/            Pure business logic (no I/O)
  application/       Use-cases + ports (interfaces)
  infrastructure/    Prisma, logging, auth, DI composition
  interfaces/http/   HTTP concerns (Zod schemas, error mapping, guards)
  config/            Validated env
tests/               Vitest unit + integration tests
docs/                ARCHITECTURE.md and runbooks
```
sfdsdv