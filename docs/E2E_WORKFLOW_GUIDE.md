# End-to-end workflow guide — ProcMS (DP-Navy)

A complete walk-through of every workflow this app models — who does
what, which button they click, what the service writes, which rule it
enforces. Pair with [`DOCTRINE_GAPS.md`](DOCTRINE_GAPS.md), which lists
what's shipped and what's still queued.

> **Started here?** Sign in at <http://localhost:3000/signin> as
> **`admin@dp.navy`** / **`Pr0cur3-DEV!`** — the seed script creates the
> admin account plus one user per role, all with the same dev password.

---

## 0. Day-one — getting the app running

| Step | Command | What it does |
|---|---|---|
| 1 | `cp .env.example .env` | Copies the env template; edit it to set `DATABASE_URL` + `NEXTAUTH_SECRET` (`openssl rand -base64 32`). |
| 2 | `mysql -u root -e "CREATE DATABASE IF NOT EXISTS procurement;"` | Creates the empty DB. |
| 3 | `npx prisma migrate deploy` | Applies every migration in `prisma/migrations/` (there are 14 now, from `init` through today's catch-up). |
| 4 | `npm run seed` | Loads demo users, fiscal years, budget heads, sections, firms, and ~23 seeded indents. |
| 5 | `npm run build && npm start` | Boots production server at <http://localhost:3000>. (`npm run dev` for the hot-reload server if you prefer.) |

Signed-in sanity check: the **Dashboard** shows headline KPIs for your
role; admins also see the **Compliance posture** panel of 14 tiles under
the KPIs. Every nav item in the left rail is reachable.

---

## 1. The complete workflow map

```
┌─────────────────────── Pre-award (planning + bidding) ─────────────────────┐
│                                                                             │
│  Annual Procurement Plan ──┐  (optional link)                               │
│  (publish once per FY)     │                                                │
│                            ▼                                                │
│  Firm Registration    Indent (DRAFT)                                        │
│  (per firm/category)      │                                                 │
│                           ▼                                                 │
│                      Submit → CR → Budget → COORD → ADP (vet, control #)   │
│                           │                                                 │
│                           ▼ Chain #1  SUPTD → AD → DD → DP(N) → DGDP → SDP │
│                           ▼ (CPO branch for propriety indents)             │
│                      IT_PREPARATION                                         │
│                           │                                                 │
│                           ▼                                                 │
│                      Create IT Proforma                                     │
│                      (invite firms — guard: blacklist + pre-qual)          │
│                           │ Chain #2  AD → DD → DP(N)                       │
│                           ▼                                                 │
│                      Record Advertisement (PPRA Rule 12)                   │
│                           │                                                 │
│                           ▼                                                 │
│                      Dispatch IT                                            │
│                      (guard: ad coverage + response time ≥ 15/45d)         │
│                           │                                                 │
│                           ▼                                                 │
│                      Technical offers come in → TSR                        │
│                      (evaluate, raise queries, complete)                   │
│                           │                                                 │
│                           ▼                                                 │
│                      Open commercial offers (ACCEPTED firms only)          │
│                      (set bid validity date — PPRA Rule 26)                │
│                           │                                                 │
│                           ▼                                                 │
│                      Prepare CST → Chain #3 → Issue PR                     │
│                      (guard: blacklist + grievance + integrity pact >10M)  │
│                           │                                                 │
└───────────────────────────┼─────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─ Post-award (execution) ──────────────────────┐
│                                                                            │
│  Contract ─── Guarantees (BID / PERF / APG)                               │
│      │        LC (if import) → amendments                                 │
│      │        Insurance (marine / war-risk)                               │
│      │        Shipments (BL/AWB)                                          │
│      │        EUC (if controlled goods)                                   │
│      │        Agent Commission (disclose → approve)                       │
│      │                                                                     │
│      ├── DP extensions (DP(N) grants on cause)                            │
│      ├── Liquidated Damages (2%/month, 10% cap enforced)                  │
│      ├── Inspection → Discrepancies (resolve/waive → gates TOC)           │
│      ├── Contract Amendments (QTY/DP/VALUE/SPEC → VALUE moves contract)   │
│      ├── Invoice → Payment (hint: deduct outstanding LD)                  │
│      ├── Issue Taking-Over Certificate (refused while discrepancies OPEN) │
│      └── Terminate → auto-opens Risk Purchase case                        │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌─── Cross-cutting controls ────────────────────────────────────────────────┐
│  Blacklists (PPRA Rule 19) · GRC Grievances → Appeals (Rule 48/50)        │
│  Integrity Pacts (Rule 7 — > 10M) · Mis-procurement log (Rule 50)         │
│  Retention Holds (Rule 46)  · Public Awards API (Rule 47)                 │
│  Committees · Framework Agreements → Call-offs · Risk Purchase            │
│  FMS Cases · Disposal of Surplus Stores · Bidding Document Templates      │
└───────────────────────────────────────────────────────────────────────────┘
```

Three approval chains run inside the Indent aggregate:

| Chain | Approves          | Default route                              |
| :---- | :---------------- | :----------------------------------------- |
| #1    | The Indent itself | SUPTD → AD → DD → DP(N) → DGDP → Secy DP   |
| #2    | The IT Proforma   | AD → DD → DP(N)                            |
| #3    | The CST           | AD → DD, or full chain for single-quote    |

---

## 2. Role matrix

| Role               | Can do                                                                              |
| :----------------- | :---------------------------------------------------------------------------------- |
| **ADMIN**          | Everything — plus every list page and every compliance panel                        |
| INDENTER           | Draft + submit indents, resolve ADP observations                                    |
| CR_STAFF           | Receive at CR, forward to Budget                                                    |
| BUDGET_STAFF       | Verify budget allocation, approve or reject                                         |
| COORD_STAFF        | Vet, assign to a concerned ADP, place call-offs, draft annual plans                |
| ADP_STAFF          | Vet, raise observations, control # , prepare IT, dispatch, open commercial, prepare CST, issue PR, record execution rows |
| SUPTD/AD/DD/DP_N/DGDP/SECY_DP | Act on their approval step; senior roles decide grievances, appeals, FMS lifecycle |
| CPO                | Approve propriety indent                                                            |
| INSPECTORATE       | Start TSR, evaluate, record inspections, raise/resolve discrepancies, mark shipments received, issue TOC |
| FIRM_REP           | Accept IT invite, submit technical/commercial offers, answer TSR queries, file grievances/appeals |

Every API handler and page re-checks via `requireAuth` / `requireRoles` —
you cannot bypass by typing the URL.

---

## 3. Nav map (what's where)

| Section | Where | What it does |
|---|---|---|
| Dashboard | `/dashboard` | KPIs + compliance posture (admins see the 14-tile panel) |
| Search | `/search` | Full-text search across indents |
| Indents | `/indents` | The aggregate root — list, filter, create, open any one |
| My approvals | `/approvals` | Queue of pending decisions for your role |
| **IT Proformas** | `/it-proformas` | Admin list of every IT with inline "Reject all + re-bid" on DISPATCHED ones |
| TSR queue | `/tsrs` | Inspectorate queue; "Start TSR" on each un-started row |
| **Commercial offers** | `/commercial-offers` | Every opened offer with bid-validity column + "Overdue validity →" link |
| **CSTs** | `/csts` | Every CST, status, line count, has-PR indicator |
| **PRs** | `/prs` | Every PR, with "+ Award contract" button on each un-awarded one |
| **Execution** | `/execution` | Hub for 11 execution tiles (Advertisement, Contract, Guarantee, DP, LD, Inspection, Invoice, Payment, LC, LC Amendment, Insurance, Shipment, EUC, Agent Commission) |
| **Compliance** | `/compliance` | Hub for Blacklists, Integrity Pacts, Grievances |
| **Pre-qualification** | `/registration` | Firm registration lifecycle (submit → approve/reject → revoke) |
| **Governance** | `/governance` | Committees (GRC/TEC/FEC) + Contract Amendments |
| **Planning** | `/planning` | Annual plans, bidding templates, splitting-check report |
| **Transparency** | `/transparency` | Mis-procurement incidents, retention holds, public-awards index |
| **Frameworks** | `/frameworks` | Framework agreements, call-offs, risk-purchase cases |
| **Special cases** | `/special` | FMS, disposal of surplus, appeals |
| Firm invites | `/firm/invites` | Firm's own view of pending ITs |
| Firm queries | `/firm/queries` | Firm's view of outstanding TSR queries |
| Firm PRs | `/firm/prs` | Firm's view of PRs to acknowledge |
| Security | `/settings/security` | 2FA / TOTP setup, password reset |
| Admin | `/admin` | User, section, fiscal-year, budget-head, firm admin |

---

## 4. The golden-path walk-through

Every stage below lists **actor · where to click · what the service writes
· next status · rule enforced**. Follow these in order the first time to
exercise every guard end-to-end.

### Stage 1 — Draft the indent  (INDENTER)
- **Where:** `/indents` → **+ New indent**
- **Fields:** Subject, Priority (`NORMAL`/`HIGH`/`URGENT`/`LOW`), Section,
  Fiscal Year, Budget head, Procurement method
  (`OPEN_COMPETITIVE_BIDDING` is the default), Estimated value,
  Items[] (lineNo + description + qty + UOM + unit price).
- **Writes:** one `Indent` + many `IndentItem` rows at `status=DRAFT`.
- **Doctrine:** DPP&I-35 Ch IV; PPRA Rule 10 (specs must not favour a vendor).

### Stage 2 — Submit for CR  (INDENTER)
- **Where:** indent detail → **Submit for CR**
- **State:** `DRAFT → SUBMITTED → CR_RECEIVED` (auto).

### Stage 3 — CR forwards to Budget  (CR_STAFF)
- **State:** `CR_RECEIVED → BUDGET_CHECK`.

### Stage 4 — Budget verifies  (BUDGET_STAFF)
- **Decision:** approve → `COORD_VETTING`, or reject → `BUDGET_REJECTED` (terminal).

### Stage 5 — COORD assigns ADP  (COORD_STAFF)
- **Writes:** `Indent.assignedAdpId`.
- **State:** `COORD_VETTING → ADP_VETTING`.

### Stage 6 — ADP vets  (ADP_STAFF)
- **Clean:** writes `controlNumber` → `SUPTD_VETTING → INDENT_APPROVAL`.
- **Observations:** **Raise observation** → state `ADP_OBSERVED`. Indenter
  resolves via **Resolve observations & return**, state returns to
  `ADP_VETTING`. Any number of rounds allowed, each audit-logged.

### Stage 7 — Chain #1 approves the indent
- **Where:** `/approvals` → each approver's row.
- **State:** fully approved → `IT_PREPARATION`. Any rejection → `INDENT_REJECTED`.

### Stage 8 — Prepare IT Proforma  (ADP_STAFF)
- **Where:** indent detail → **Create IT Proforma →** (or `/it-proformas`
  for the global list of every IT ever).
- **Form fields:** IT reference, checklist (JSON), closing date,
  **invited firm IDs**.
- **🛡 Guards fire here (fail-fast before transaction):**
  - **Blacklist** — if any invited firm has an ACTIVE `Blacklist` row
    whose window covers today, refuses with the ground + expiry. Also
    writes a HIGH-severity `MisprocurementIncident` row.
  - **Pre-qualification** — if any invited firm has no APPROVED
    `FirmRegistration` with a valid `validUntil`, refuses.
- **Doctrine:** DPP&I-35 Ch VI (ITB); PPRA Rule 19, Rules 15–16.

### Stage 9 — Chain #2 approves the IT
- **Default route:** AD → DD → DP(N).
- **State:** `IT_PREPARATION → IT_APPROVAL → IT_DISPATCHED` on success.

### Stage 10 — Record Advertisement  (ADP_STAFF or COORD)
- **Where:** `/execution/advertisements/new`.
- **Fields:** medium (`PPRA_WEBSITE` / `NEWSPAPER` / `EPADS` / `OTHER`),
  publishedOn, biddingDocsIssuedOn, bidSubmissionDeadline.
- **Why BEFORE dispatch:** the dispatch step runs threshold + response
  guards against the recorded Advertisement rows.

### Stage 11 — Dispatch IT  (ADP_STAFF or COORD)
- **Where:** indent detail → **Dispatch IT** (prompt for closing date).
- **🛡 Guards fire here:**
  - **PPRA Rule 12 — ad coverage.** For indents > PKR 500k requires a
    `PPRA_WEBSITE` or `EPADS` Advertisement. For > PKR 3M also requires
    a `NEWSPAPER` Advertisement. Refuses otherwise.
  - **PPRA Rule 13 — response time.** `closingAt − earliest Advertisement.publishedOn`
    must be ≥ 15 days (NCB) or 45 days (ICB, when `Indent.isInternational=true`).
- **State:** `IT_DISPATCHED → TECH_OFFERS_OPEN`.

### Stage 12 — Firms submit technical offers  (FIRM_REP)
- **Where:** `/firm/invites` → accept → upload offer.

### Stage 13 — Start TSR  (INSPECTORATE)
- **Where:** `/tsrs` → each un-started row has **Start TSR →** (one click,
  previously only reachable via indent detail).
- **State:** `TECH_OFFERS_OPEN → TSR_IN_PROGRESS`.

### Stage 14 — Evaluate + queries + complete TSR
- Evaluate each offer: `ACCEPTED` / `REJECTED` / `NEEDS_QUERY`.
- Raise queries → firm answers via `/firm/queries` → re-evaluate.
- **Complete TSR** when every offer has a terminal verdict.
- **State:** → `COMMERCIAL_OPEN` (only ACCEPTED firms carry forward).

### Stage 15 — Open commercial offers  (ADP_STAFF or COORD)
- **Where:** indent detail → **Open commercial offer** (one per ACCEPTED firm).
- **Fields:** total price, currency, **bid security amount** (≤5% per
  PPRA Rule 25), **delivery weeks**.
- **🛡 Guard:** `assertFirmNotBlacklisted` — refuses to open an envelope
  from a firm that became blacklisted since the IT was dispatched.
- **PPRA Rule 26 — bid validity.** After opening, hit `/commercial-offers`
  for any offer, use **POST /api/commercial-offers/[id]/bid-validity**
  (admin curl / UI) to set `bidValidUntil`. Expired offers surface on
  **`/commercial-offers/overdue-validity`**.

### Stage 16 — Prepare CST  (ADP_STAFF or COORD)
- **Where:** indent detail → **Prepare CST**. Rank the lines, mark one
  as `recommendedForAward`, write justification.
- `singleQuote=true` means Chain #3 runs the full chain, not the short one.
- Admin global view: `/csts`.

### Stage 17 — Chain #3 approves CST
- Default: AD → DD. Single-quote: AD → DD → DP(N) → DGDP → SECY_DP.
- **State on success:** `CST_APPROVAL → PR_ISSUED` (after PR issue below).
- **PPRA Rule 35:** evaluation report should be published ≥ 15 days
  before contract award — currently manual; see A13 "public awards".

### Stage 18 — Issue PR  (ADP_STAFF or COORD)
- **Where:** indent detail → **Issue PR** (or `/prs` for the admin list,
  which also offers "+ Award contract" when the PR has none).
- **PR number format:** `PR/YYYY/XXXXX`.
- **🛡 Three guards fire together (BEFORE opening the write transaction):**
  - **PPRA Rule 19 — blacklist** on the winning firm.
  - **PPRA Rules 48/50 — grievance** on the indent (PENDING or APPEALED
    pre-award refuses).
  - **PPRA Rule 7 — Integrity Pact** on indents > PKR 10,000,000 (one
    pact per firm per indent required).
  - Each refusal writes a HIGH-severity `MisprocurementIncident`.

### Stage 19 — Send / acknowledge PR
- **Admin:** **Send PR (fax)** → PR status `DRAFT → SENT`.
- **Firm:** acknowledge via `/firm/prs` → `SENT → ACKNOWLEDGED`.

### Stage 20 — Close PR + indent
- **Admin:** indent detail → **Close PR + indent** once acknowledged.
- **State:** `PR_ISSUED → CLOSED`.

That completes the pre-award half. Now execution.

### Stage 21 — Award contract  (ADP_STAFF or COORD)
- **Where:** `/execution/contracts/new` or **+ Award contract** on `/prs`.
- Form pre-fills firm + value from the PR.
- Fields: contract number, awardedOn, signedOn, status (`SIGNED`/`IN_PROGRESS`).
- One contract per indent (DB-enforced).

### Stage 22 — Record Guarantees  (as the firm furnishes them)
- **Where:** `/execution/guarantees/new`.
- Types: `BID_SECURITY` (reduces at award), `PERFORMANCE` (DPP&I-35 Ch XV, 5–10% of contract), `ADVANCE_PAYMENT` (= advance taken).
- Dates: `furnishedOn`, `expiresOn` (the posture tile flags expiring-30d).

### Stage 23 — (Imports only) Record LC + amendments
- `/execution/lcs/new`, then `+ Amendment` per LC as needed.
- DPP&I-35 Ch XIV — confirmed, irrevocable, payable at sight.

### Stage 24 — (Imports only) Insurance + EUC + Shipment
- `/execution/insurances/new` — marine/war-risk/transit; service enforces
  `coverTo > coverFrom` and matching currency.
- `/execution/end-user-certificates/new` — only DP(N)/DGDP/ADMIN can issue.
- `/execution/shipments/new` — mode + BL/AWB; mark received later from
  the list.

### Stage 25 — Record Agent Commission (if applicable)
- `/execution/agent-commissions/new` → discloses.
- Senior staff approves separately before any payment.

### Stage 26 — Running bills + payments
- `/execution/invoices/new` — invoice from supplier.
- `/execution/payments/new` — multiple payments per invoice allowed.
- The payment form shows **outstanding LD** on the invoice's contract
  so the cashier deducts before release.

### Stage 27 — Delivery Period management
- **Extensions:** `/execution/dp-extensions/new` — on DP(N) authority.
  The service enforces new DP > current DP; the chain preserves history.
- **Liquidated damages:** `/execution/liquidated-damages/new` — basis
  (per day/week/month/lump-sum), amount, period.
  **🛡 The service refuses to assess a new LD that would push the net
  LD past 10% of contract value (DPP&I-35 Ch XIII).**

### Stage 28 — Inspection
- **Inspector:** `/execution/inspections/new` with verdict
  (`ACCEPTED`/`DISCREPANCY`/`REJECTED`).
- Non-ACCEPTED inspections get `+ Discrepancy` buttons: raise each with
  severity `MINOR/MAJOR/CRITICAL`.
- **Resolve** or **Waive** each discrepancy with ≥5-char notes.

### Stage 29 — Taking-Over Certificate
- **Where:** `/execution/contracts` → **Issue TOC** on the contract.
- **🛡 Service refuses while any `Discrepancy.status = OPEN` exists on
  the contract.** Issuing TOC also promotes `SIGNED`/`IN_PROGRESS` →
  `COMPLETED`.

### Stage 30 — Contract amendments (if scope changes)
- **Where:** `/governance/contract-amendments/new`.
- Scopes: `VALUE` + `QTY` carry a `deltaValue`; approving them moves
  `Contract.value` in the same transaction. `DP` / `SPEC` / `OTHER` are
  informational.

### Stage 31 — Contract completion
- Once delivery is complete, inspection ACCEPTED, TOC issued, final
  payment made, the Contract status moves `COMPLETED → CLOSED`.
- Alternative path: supplier default → **Terminate + risk purchase**
  (danger button on the contract row) auto-opens a `RiskPurchaseCase`
  pointing at the terminated contract.

---

## 5. Compliance workflows

### 5.1 Blacklist (PPRA Rule 19)
- **Declare:** `/compliance/blacklists/new` (ADMIN/DGDP/SECY_DP). Required:
  firm, ground (one of 8 enum values), reason ≥10 chars, declaredOn,
  effectiveFrom, (optional) effectiveUntil.
- **Revoke:** inline button on `/compliance/blacklists` on each ACTIVE
  row (prompt for revokedReason).
- **Enforced at:** IT invite, commercial-offer open, PR issue — each
  refuses + logs a HIGH-severity incident.

### 5.2 Integrity Pact (PPRA Rule 7)
- **Register:** `/compliance/integrity-pacts/new` once the pact is signed
  by the buyer. Supplier counter-signature can be recorded later.
- **Required for:** any PR on an indent whose `estimatedValue > PKR 10,000,000`.

### 5.3 Grievance → Appeal (PPRA Rules 48/50, DPP&I-35 Ch XXVIII)
- **File grievance:** `/compliance/grievances/new`. Anonymous allowed
  (leave firm blank). Stages: `PRE_AWARD` (blocks award) / `POST_AWARD`
  (informational).
- **Decide:** inline Uphold / Reject on each PENDING row.
- **Appeal:** on a REJECTED or UPHELD grievance, click to
  `/special/appeals/new`. Filing an appeal flips the grievance back to
  APPEALED (which **again** blocks any award on that indent).
- **Decide appeal:** `/special/appeals` → Uphold/Reject/Withdraw. On
  decision, the grievance snaps to the matching terminal state in one
  transaction.

### 5.4 Firm registration (PPRA Rules 15–16; DPP&I-35 Ch XXVI)
- **Submit:** `/registration/new` — pick firm + category (12-value enum).
- **Approve:** inline Approve on PENDING rows (sets issuedOn + validUntil).
- **Reject:** inline Reject with ≥5-char notes.
- **Revoke:** inline Revoke on APPROVED rows.
- **Enforced at:** IT invite — firm must have at least one APPROVED
  registration valid today.

---

## 6. Governance

### 6.1 Committees (PPRA Rule 48)
- **Form:** `/governance/committees/new` — pick kind (`GRC`/`TEC`/`FEC`/
  `INSPECTION`/`OTHER`), name, term, members (user + role + joinedOn).
- **Parity rule:** service refuses a GRC with an even-sized membership
  on create / add / remove.

### 6.2 Contract amendments (DPP&I-35 Ch XXI)
- **Propose:** `/governance/contract-amendments/new`.
- **Approve** (senior staff) or **Reject** inline.
- **Side-effect:** approving a VALUE or QTY amendment with a non-null
  `deltaValue` moves `Contract.value` by that delta in the same transaction.

---

## 7. Planning

### 7.1 Annual Procurement Plan (PPRA Rule 8)
- **Draft:** `/planning/annual-plans/new`. Repeatable item grid with
  budget-head, description, estimate, method hint, category hint, quarter hint.
- **Publish:** inline button on DRAFT rows. Publishing supersedes any
  prior PUBLISHED plan for the same FY in one transaction.
- **Link an indent:** on indent create, `Indent.plannedItemId` can
  reference a plan line (optional).

### 7.2 Bidding Document Templates (PPRA Rule 23(4))
- **Register:** `/planning/bidding-templates/new`.
- **Retire:** inline on ACTIVE templates.
- Unique on (kind, revision).

### 7.3 Splitting detector (PPRA Rule 9)
- **View:** `/planning/splitting-check?days=60`.
- Flags groups of recent indents from the same indenter + budget head +
  FY whose individual values stay under PKR 500,000 but whose sum
  crosses either the RFQ ceiling or the open-bidding threshold (3M).
- Advisory only — no automatic action yet.

---

## 8. Transparency

### 8.1 Mis-procurement log (PPRA Rule 50)
- **Auto-logged:** every compliance-guard refusal writes a
  HIGH-severity `MisprocurementIncident` with the exact rule reference
  and (where known) the indent id.
- **Manual log:** `/transparency/incidents/new`.
- **Lifecycle:** inline Remediate / Report-to-PPRA on OPEN rows.

### 8.2 Retention holds (PPRA Rule 46)
- **Place:** `/transparency/retention-holds/new` (subject type/id +
  reason + placedOn). Service refuses a second active hold on the same
  subject.
- **Release:** inline button on active holds.
- Reasons: `LITIGATION`/`AUDIT_INQUIRY`/`INVESTIGATION`/`REGULATORY_HOLD`/`OTHER`.

### 8.3 Public awards (PPRA Rule 47)
- **Admin index:** `/transparency/awards` — every awarded contract with
  its public URL.
- **Public endpoint:** `GET /api/public/awards/<indentId>` — unauthenticated,
  returns subject + estimated value + advertisement timeline + CST line
  summary + contract (number/firm/value/awarded/signed dates). Returns
  404 unless a Contract exists. Carries `cache-control: public, max-age=300`.

---

## 9. Frameworks

### 9.1 Framework agreements (DPP&I-35 Ch XXIII; PPRA Rule 16A)
- **Create:** `/frameworks/agreements/new`. Kind `OPEN` (mini-competitions)
  or `CLOSED` (fixed-price). Pick ≥1 participating firm.
- **Activate:** inline on DRAFT rows.
- **Terminate:** inline on ACTIVE rows (with ≥5-char reason).

### 9.2 Call-offs
- **Place:** `/frameworks/call-offs/new` — cascading framework → firm pick.
- Service refuses unless framework is ACTIVE and firm is on it; currency
  must match framework currency.
- **Fulfill** / **Cancel** inline on PLACED rows.

### 9.3 Risk purchase (DPP&I-35 Ch XXII)
- **Open:** `/frameworks/risk-purchases/new`, OR automatically when you
  **Terminate + risk purchase** a contract from `/execution/contracts`.
- Workflow: Open → Link replacement (indent/contract) → Settle (amount +
  settledOn) → Close.
- Service refuses a second case per original contract.

---

## 10. Special cases

### 10.1 FMS (DPP&I-35 Ch XXIV)
- **Open:** `/special/fms/new` with an indent that has no FMS case yet.
- **Lifecycle (step-locked):** LOR_SUBMITTED → **Record LOA** →
  LOA_RECEIVED → **Accept LOA** → LOA_ACCEPTED → **Enter implementation**
  → IN_IMPLEMENTATION → **Mark delivery done** → **Close** → CLOSED.
- Side-effect: FMS cases bypass the IT/commercial-offer stage of the
  normal flow — the LOA replaces the contract instrument.

### 10.2 Disposal of surplus (DPP&I-35 Ch XXV)
- **Create case:** `/special/disposals/new` — kind (`AUCTION`/`TENDER`/
  `SCRAP_SALE`/`TRANSFER`), description, lots (lotNumber + description +
  reserve price).
- **Open for bids** → PLANNED → OPEN_FOR_BIDS.
- **Award each lot** inline (winning bid + bidder) — the case
  auto-promotes to AWARDED when every lot is done.
- **Complete** the case: sums winning bids into `totalProceeds`.

### 10.3 Appeals — see §5.3 above.

---

## 11. Dashboard — compliance posture

Admin / DGDP / SECY_DP / DP_N see a 14-tile panel on `/dashboard` showing:

| Tile | Rule / chapter | What triggers warning |
|---|---|---|
| Active blacklists | PPRA R19 | > 0 = danger |
| Pending grievances | PPRA R48 | > 0 = warn (10 wd SLA) |
| Appealed grievances | PPRA R50 | > 0 = warn (blocks award) |
| Pending appeals | PPRA R50 tier-2 | > 0 = warn |
| Open incidents | PPRA R50 | HIGH/CRITICAL = danger |
| Active retention holds | PPRA R46 | > 0 = info |
| Pacts awaiting signature | PPRA R7 | > 0 = warn |
| Expired bid validity | PPRA R26 | > 0 = warn |
| Open risk cases | DPP&I-35 Ch XXII | > 0 = warn |
| Open discrepancies | DPP&I-35 Ch XVI | > 0 = warn (blocks TOC) |
| Commissions awaiting OK | DPP&I-35 Ch XX | > 0 = info |
| Guarantees expiring (30d) | — | > 0 = warn |
| Insurance expiring (30d) | DPP&I-35 Ch XVII | > 0 = warn |
| FMS awaiting acceptance | DPP&I-35 Ch XXIV | > 0 = info |

Each tile links to the admin page that owns the stat.

---

## 12. All scenarios (test these)

### Golden path  (NCB, three bidders, no observations)
Steps 1–20 pre-award + 21–31 post-award, no refusals, no amendments.

### A — ADP observation then resolution
After ADP vetting, ADP raises an observation → indenter resolves → back
to ADP → clean → chain starts. Loops allowed; each round audit-logged.

### B — Budget rejection
Terminal. The indent reaches `BUDGET_REJECTED` and ends. File a new indent.

### C — Chain #1 rejection at DP(N)
Terminal `INDENT_REJECTED`. No further action.

### D — Propriety indent via CPO
Flagged as propriety → after SUPTD diverts to `CPO_APPROVAL`. CPO
approves via `/approvals`; back to `IT_PREPARATION`.

### E — Single-quote CST
Only one commercial offer survives TSR. CST sets `singleQuote=true` →
Chain #3 runs the **full** chain.

### F — TSR query loop
Inspectorate marks offer `NEEDS_QUERY` → firm answers in `/firm/queries`
→ re-evaluate until terminal. TSR won't complete until every offer is
terminal.

### G — Reject all offers / re-bid  (PPRA Rules 33–34)
From `/it-proformas` → **Reject all + re-bid** on a DISPATCHED IT.
Prompt for ≥10-char reason, confirm. Service transactionally marks
every non-terminal offer REJECTED, closes the IT, moves the indent back
to `IT_PREPARATION`, and writes an `AuditLog` entry with counts.

### H — Firm fails to acknowledge PR → PR cancellation
Today, admin cancels manually via indent flow and re-issues. (Dedicated
non-acknowledgement SLA is still-to-do.)

### I — Import contract with LC
Contract → LC → amendments → Insurance → Shipment (BL/AWB) → EUC → the
rest of execution.

### J — Advance Payment Guarantee drawn
Record `ADVANCE_PAYMENT` guarantee equal to the advance. The posture
tile warns if its `expiresOn` falls within 30d.

### K — Partial payments against one invoice
Multiple `Payment` rows per `Invoice`; the invoice view shows paid =
sum of payments.

### L — Supplier default → risk purchase
`/execution/contracts` → **Terminate + risk purchase** (danger button).
One transaction: flips Contract to TERMINATED **and** opens a
`RiskPurchaseCase` with the termination reason.

### M — Blacklist a firm mid-flight
Declare blacklist via `/compliance/blacklists/new`. Any subsequent
attempt to add that firm to an IT invite, open their commercial offer,
or award a PR to them refuses with the ground + a logged incident.

### N — Grievance filed by a bidder
`/compliance/grievances/new` with `stage=PRE_AWARD`. Attempting to issue
a PR on that indent refuses until the grievance reaches a terminal
decision (and even then is blocked while appealed).

### O — GRC decides, bidder appeals
Decide grievance (`UPHELD` / `REJECTED`). Bidder files appeal at
`/special/appeals/new` → grievance snaps to APPEALED → award blocked
again. Senior staff decides the appeal → grievance returns to its
decided state.

### P — Indent > PKR 10M without an Integrity Pact
PR issue refuses with the Rule-7 message until a signed `IntegrityPact`
exists for (indent, winning firm).

### Q — Advertisement coverage mismatch
Attempt to **Dispatch IT** on an indent > PKR 500k without an
Advertisement row. Refused.

### R — Response-time breach
Dispatch IT with `closingAt - firstAd.publishedOn < 15` days (NCB).
Refused.

### S — Overdue bid validity
Set a `bidValidUntil` in the past (or wait past the date). Offer surfaces
on `/commercial-offers/overdue-validity`. The service doesn't auto-reject
these — admin extends via the API or excludes them from the CST.

### T — LD cap exceeded
Try to assess an LD that would push net LD above 10% of contract value.
Service refuses with the computed cap. Waive down or reduce.

### U — Taking-Over refused on open discrepancies
`/execution/contracts` → **Issue TOC** while an Inspection on that
contract has an OPEN Discrepancy. Refused.

### V — Splitting pattern
Submit several small indents from the same indenter + budget head whose
sum crosses PKR 500k. Visit `/planning/splitting-check`; they're flagged.

### W — Expired firm registration
Firm's registration `validUntil` passes. Attempting a fresh IT invite
with that firm refuses.

### X — FMS lifecycle
Open LOR → record LOA → accept → implement → delivery → close.
Each step is state-locked.

### Y — Disposal of surplus
Create case with lots → open for bids → award each lot → auto-moves
case to AWARDED → complete → sums proceeds.

### Z — Framework + call-off
Create framework with ≥1 firm → activate → place call-off (framework
must be ACTIVE, firm must be on it, currency must match) → fulfill /
cancel.

---

## 13. Day-one admin tour (what to click after `npm run seed`)

1. **`/dashboard`** — read KPIs; scroll to **Compliance posture**.
2. **`/indents`** → open any `DRAFT` → **Submit for CR**. Admin can
   impersonate every role step via `/approvals`.
3. **`/registration/new`** — approve one firm registration so the IT
   guard is satisfied for seeded cases.
4. **`/compliance/integrity-pacts/new`** — register a pact for one of
   the > 10M seeded indents, so Stage-18 doesn't refuse.
5. **`/planning/annual-plans/new`** — publish a dummy plan for the
   current FY.
6. **`/planning/bidding-templates/new`** — add one GOODS template.
7. **`/execution/advertisements/new`** — advertise an indent that's in
   `IT_APPROVAL`/`IT_DISPATCHED`.
8. **`/it-proformas`** → confirm the IT shows for the indent.
9. **`/tsrs`** → **Start TSR** on any un-started row.
10. **`/commercial-offers`** → open one; set bid validity via the API.
11. **`/csts`** → walk one through Chain #3.
12. **`/prs`** → **Send PR (fax)** → **Close PR + indent**.
13. **`/execution`** → award a contract, then record a guarantee + LC +
    invoice + payment + inspection + TOC.
14. **`/governance/committees/new`** — form a GRC (odd-numbered).
15. **`/compliance/grievances/new`** — file a test grievance → **Reject**
    → **File appeal** via `/special/appeals/new`.
16. **`/transparency/incidents`** → observe the auto-logged incidents
    from any failed guard above.
17. **`/special/fms/new`** — open an FMS case.
18. **`/special/disposals/new`** — create a 2-lot disposal case → award
    both → complete.
19. **`/frameworks/agreements/new`** — form a framework with 2 firms →
    activate → place one call-off.
20. Visit **`/api/public/awards/<indentId>`** (unauth, any browser) on
    an awarded indent — JSON award evidence.

---

## 14. Troubleshooting

| Symptom | What to check |
|---|---|
| **"No action available for your role in this state."** | Impersonate the correct role via `/admin` or sign in as that user. Admins can act on behalf of everyone. |
| **"Firm is blacklisted on …"** | A guard — see `/compliance/blacklists` for the ACTIVE row. |
| **"PPRA Rule 7: Integrity Pact required"** | Indent value > 10M. Register the pact first at `/compliance/integrity-pacts/new`. |
| **"PPRA Rule 12 … no PPRA_WEBSITE Advertisement"** | Advertise before dispatch at `/execution/advertisements/new`. |
| **"PPRA Rule 13: minimum response time is 15 days"** | Push `closingAt` later, or re-advertise with an earlier `publishedOn`. |
| **"GRC must have an odd number of members"** | Add or remove one member — service enforces parity on create / add / remove. |
| **"Taking-Over Certificate … discrepancy row(s) still OPEN"** | Resolve or waive the discrepancies at `/execution/inspections` first. |
| **"LD cap exceeded"** | Net LD (sum of amount − waivedAmount) + proposed would cross 10% of contract. Waive down or reduce. |
| **"Database `procurement` does not exist"** | Run `mysql -u root -e "CREATE DATABASE procurement;"` then `npx prisma migrate deploy`. |
| **"The column `User.totpSecret` does not exist"** | Run `npx prisma migrate deploy` — the catch-up migrations add missing columns. |
| **TypeScript errors in `.next/types/validator.ts`** | Pre-existing; unrelated to runtime. Build still ships. |
| **Signed in but dashboard crashes with `prisma.notification.count`** | Pre-existing drift — `npx prisma migrate deploy` catch-up migrations create `Notification`, `Comment`, `DigestRecipient`, `PasswordResetToken`. |
| **Any `params.id = undefined` error** | A dynamic page/route is still on the old Next 14 handler shape. Grep for `{ params }: { params: {` under `src/app/` and wrap in `Promise<>`. |
