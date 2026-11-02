# HANDOFF — read me first

This file is the running state of the ProcMS UI/UX & workflow effort. It exists so the work can
move between two machines (office + personal laptop) over **GitHub only**, and so a fresh Claude
Code session — on either machine — can pick up exactly where the last one left off.

**Claude: at the start of a session, do this**
1. Read this file and [`CLAUDE.md`](CLAUDE.md) (project guide, stack, architecture, compliance context).
2. `git fetch` and `git status` to see the current branch and whether you're behind the remote.
3. Continue from **[Where to continue next](#where-to-continue-next)**.
4. Before you stop, update the **[Current state](#current-state)** and **Where to continue next**
   sections, then commit + push (see the sync flow). The next device reads this file to resume.

---

## Two-device sync — GitHub only (no SSH)

The git repo on GitHub is the single source of truth. **Conversations do not sync — code does.**
Only **committed and pushed** work travels between machines; uncommitted changes stay put.

**Canonical repo:** `https://github.com/fatima623/procMS.git`
(The sibling repo `fatima623/procurement-system` is kept as a mirror of the same `main`. Pick
`procMS` for day-to-day push/pull so there's one line to follow. Account `ofcthsv` has push access
to both.)

### First time on a machine (e.g. your personal laptop at home)
```bash
git clone https://github.com/fatima623/procMS.git
cd procMS
# Then follow CLAUDE.md "Getting started": cp .env.example .env, set DATABASE_URL + NEXTAUTH_SECRET,
# npm install, npx prisma migrate dev, npm run seed, npm run dev.
# (The DB is local to each machine — the repo carries the schema + seed, not the data.)
```
Open Claude Code in that folder → it auto-reads `CLAUDE.md`, which points back here. Done.

### Every working session (either machine)
```bash
# START — get the latest before touching anything
git checkout feat/ui-ux        # the working branch (create it the first time: git checkout -b feat/ui-ux)
git pull origin feat/ui-ux

# … do the work …

# FINISH — before you leave this machine
npm run typecheck              # keep main-line green
git add -A
git commit -m "…"             # commit even WIP; only committed+pushed work crosses devices
git push origin feat/ui-ux
# …and update this HANDOFF's "Current state" + "Where to continue next" in the same commit.
```

**Golden rule:** *pull before you start, push before you switch machines.* If you forget to push on
one device, that work is simply not on the other — nothing is lost, it's just on the machine you left.

### If the two machines ever conflict
Both pushed to `feat/ui-ux`? `git pull` will merge or ask you to resolve. To avoid it, keep the
discipline above (always pull first). Worst case, the per-file conflict markers are normal git —
resolve, `git add`, `git commit`.

### Keeping the mirror in sync (optional)
This office checkout also has `procurement-system` as remote `origin`. To mirror `main`:
`git push origin main && git push procms-new main`. For feature work you don't need the mirror —
just use `procMS`.

---

## Current state

**As of 2026-11-02 (office machine):**
- Repo understood and documented: `CLAUDE.md` added (overview, stack, hexagonal architecture,
  commands, domain model, ZeroLinkAI-compliance context + known gaps).
- Git housekeeping done: `main` reconciled across both GitHub repos (the throwaway `try` commit on
  `procMS` merged in); `CLAUDE.md` + this `HANDOFF.md` committed to `main` and pushed to **both**
  `procMS` and `procurement-system`, so a fresh clone of either has them immediately.
- The app runs (Next.js 14 + Prisma + MySQL); schema already includes the execution-half models.
- **Branch `feat/admin-workflows`** — kicked off on 2026-11-02. Two commits so far:
  1. `5d514f2` — admin-visible top-level list pages (IT Proformas / Commercial Offers / CSTs /
     PRs), Execution hub with create forms for Advertisement / Contract / Guarantee / Invoice /
     Payment / LC / LC Amendment, "Start TSR" button on `/tsrs`, plus `docs/E2E_WORKFLOW_GUIDE.md`
     and `docs/DOCTRINE_GAPS.md`.
  2. **Compliance controls** — three new workflows per the doctrine gaps:
     - **Blacklist** (PPRA Rule 19) — model, migration, admin service, declare + revoke endpoints,
       UI at `/compliance/blacklists`.
     - **Integrity Pact** (PPRA Rule 7) — model, migration, create + counter-sign endpoints,
       UI at `/compliance/integrity-pacts`.
     - **Grievance / GRC** (PPRA Rules 48 / 50) — model, migration, file + decide + appeal +
       withdraw endpoints, UI at `/compliance/grievances`.
     - Three guards wired into `IssuePRUseCase` so a blacklisted firm, a pending pre-award
       grievance, or a missing Integrity Pact (indent > PKR 10 M) refuses the PR issue.
     - `tests/domain/ComplianceSchemas.test.ts` — 12 passing vitest cases locking the Zod shapes.
     - Prisma migration `20261102120000_add_compliance_controls` — the next machine needs to run
       `npx prisma migrate dev` to apply it.

## Where to continue next

**Branch:** `feat/admin-workflows` (not `feat/ui-ux`). Pull it and build on the three guards
already added. The remaining top-priority items from `docs/DOCTRINE_GAPS.md § D` are:

1. **B1 — DP extensions + Liquidated Damages** (DPP&I-35 Ch XIII). Models
   `DeliveryPeriod { contractId, originalDP, extendedDP, extensionReason, grantedByUserId,
   grantedOn }` and `LiquidatedDamages { contractId, assessedOn, amountMinor, basis }`. UI on
   `/execution/contracts/[id]/dp`. Rule: LD typically 2% per month of delay, capped at 10%.
2. **B2 — Inspection reports + discrepancies** (DPP&I-35 Ch XVI). Gates the Taking-Over
   Certificate on `Contract`. Models `Inspection` and `Discrepancy`; UI under `/inspection`.
3. **Wider blacklist guard integration.** The guard is only in `IssuePRUseCase` today — also
   hook it into IT invite creation and `OpenCommercialOfferUseCase` so a blacklisted firm is
   refused earlier.
4. **Committee registry** for the GRC (odd-numbered members, term dates) — PPRA Rule 48.
5. **Seeding** — the ZeroLink gap note still applies: only ~4 of 23 seeded indents reach
   award + execution; seed more cases through to Contract/Invoice/Payment so execution rules
   stop being `NOT_EVALUABLE`.

Other sensible UI/UX targets that remain unchanged from the earlier handoff:
- **Approval chain screen** (`src/app/(app)/approvals/…`)
- **Indent create/detail** (`src/app/(app)/indents/…`)
- **Dashboard** (`src/app/(app)/dashboard/…`) — add a "compliance posture" tile that reads from
  the new models (active blacklists, pending grievances, pacts awaiting counter-signature).

**Guardrails while changing UI (see CLAUDE.md → ZeroLinkAI compliance context):**
- Keep form fields labelled and values unambiguous — the ZeroLink screen companion reads these
  pages by their on-screen labels. Don't silently rename field labels that a saved mapping relies on.
- Respect the hexagonal boundaries — presentation changes stay in `src/app` / `src/interfaces/ui`;
  don't move business logic out of `src/domain`.
- `npm run typecheck` clean before every commit; add/adjust tests for behavior changes.

**Open data task (if useful for compliance testing):** seed more indents through
award → execution so the execution-stage rules stop being `NOT_EVALUABLE` (only ~4 of 23 reach it).

---

## Quick facts
- **Working branch:** `feat/admin-workflows` (superseded `feat/ui-ux`). `main` stays releasable.
- **Run it:** `npm install && npx prisma migrate dev && npm run seed && npm run dev` → `http://localhost:3000` (companion tests used `-p 3200`).
- **New migration to apply after pull:** `20261102120000_add_compliance_controls` — adds the
  `Blacklist`, `IntegrityPact` and `Grievance` tables. Run `npx prisma migrate dev` once.
- **Before commit:** `npm run typecheck`, `npm test`.
- **Push target:** `git push origin feat/admin-workflows` (on this office machine the remote is
  named `remote`, so `git push remote feat/admin-workflows`; a fresh `procMS` clone names it `origin`).
