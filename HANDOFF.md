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
- **UI/UX / workflow improvement work has NOT started yet** — this is the kick-off handoff.

## Where to continue next

**Goal:** improve the **workflows and UI/UX** of ProcMS.

The specific first target is the user's call — when you resume, ask (or confirm) which screen /
workflow to tackle first, then work on a `feat/ui-ux` branch. Sensible entry points to offer:
- **Approval chain screen** (`src/app/(app)/approvals/…`) — the multi-step approval UI shown during
  companion testing; a good candidate for clearer step status, actor cues, and the decision form.
- **Indent create/detail** (`src/app/(app)/indents/…`) — the aggregate root; the most-used flow.
- **Dashboard** (`src/app/(app)/dashboard/…`) — KPI cards, navigation, at-a-glance workflow state.
- **TSR / CST** screens — dense tabular review steps that usually benefit most from UX work.

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
- **Working branch:** `feat/ui-ux` (create on first use). `main` stays releasable.
- **Run it:** `npm install && npx prisma migrate dev && npm run seed && npm run dev` → `http://localhost:3000` (companion tests used `-p 3200`).
- **Before commit:** `npm run typecheck`, `npm test`.
- **Push target:** `git push origin feat/ui-ux` on a fresh `procMS` clone (its `origin` = procMS).
