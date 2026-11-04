# Indent lifecycle — step-by-step

Every click from "draft the indent" to "close the contract". Numbered, one
line per step, operational only (no theory — see
[`E2E_WORKFLOW_GUIDE.md`](E2E_WORKFLOW_GUIDE.md) for rules, enums, and
rationale).

> **Follow it in order the first time.** Admin can act for every role, so
> you can walk the whole flow yourself as `admin@dp.navy` / `Pr0cur3-DEV!`.
> If a seeded indent is already past a step, skip ahead.

Legend: **🔒 guard** — an automatic refusal if a rule isn't satisfied.

---

## PART A — Pre-award (indent → PR closed)

### Step 1 — Draft the indent
- **Actor:** INDENTER (or ADMIN)
- **Go to:** `/indents` → click **+ New indent**
- **Fill in:** Subject, Priority, Section, Fiscal Year, Budget head,
  Procurement method, Estimated value, one or more line items.
- **Submit.** Indent is created with `status = DRAFT`.

### Step 2 — Submit for CR
- **Actor:** INDENTER (or ADMIN)
- **Go to:** the indent you just created
- **Click:** **Submit for CR**
- Status becomes `SUBMITTED` → auto-advances to `CR_RECEIVED`.

### Step 3 — CR forwards to Budget
- **Actor:** CR_STAFF (or ADMIN)
- **Go to:** the indent
- **Click:** the Forward action
- Status → `BUDGET_CHECK`.

### Step 4 — Budget verifies allocation
- **Actor:** BUDGET_STAFF (or ADMIN)
- **Go to:** the indent
- **Click:** Approve (→ `COORD_VETTING`) **OR** Reject (→ `BUDGET_REJECTED`, terminal)

### Step 5 — COORD assigns an ADP
- **Actor:** COORD_STAFF (or ADMIN)
- **Pick** a Concerned ADP section, click Assign.
- Status → `ADP_VETTING`.

### Step 6a — ADP vets cleanly
- **Actor:** ADP_STAFF (or ADMIN)
- **Writes:** the control number for the case.
- Status → `SUPTD_VETTING → INDENT_APPROVAL`.

### Step 6b — (Optional) ADP raises an observation
- **Click:** **Raise observation** (prompts for note).
- Status → `ADP_OBSERVED`. Indenter now returns to Step 6c.

### Step 6c — (Optional) Indenter resolves the observation
- **Actor:** INDENTER (or ADMIN)
- **Click:** **Resolve observations & return** (describes the resolution).
- Status → back to `ADP_VETTING`. ADP can accept or raise again.

### Step 7 — Chain #1 approves the indent
- **Actors:** SUPTD → AD → DD → DP(N) → DGDP → Secy DP (in order)
- **Each actor:** `/approvals` → open the row → **Approve** (or Reject).
- When the last step approves, status → `IT_PREPARATION`.
- **Propriety indent variant:** after SUPTD, the chain diverts to
  `CPO_APPROVAL`; CPO approves, then back to `IT_PREPARATION`.

### Step 8 — Register / verify firm pre-qualification
- **Actor:** COORD_STAFF or ADP_STAFF (or ADMIN)
- **Go to:** `/registration`
- For every firm you plan to invite in Step 10, confirm there's an
  APPROVED, non-expired row. If missing, **+ Submit registration**, then
  **Approve** it with an `issuedOn` and `validUntil`.
- 🔒 **The IT create in Step 10 refuses firms without this.**

### Step 9 — (If indent value > PKR 10,000,000) Register the Integrity Pact
- **Actor:** ADP_STAFF or COORD_STAFF (or ADMIN)
- **Go to:** `/compliance/integrity-pacts/new`
- Pick the indent + the firm you will award to, record the buyer-signed
  date (supplier counter-signature can be added later).
- 🔒 **PR issue in Step 24 refuses otherwise.**

### Step 10 — Prepare the IT Proforma
- **Actor:** ADP_STAFF (or ADMIN)
- **Go to:** indent detail → **Create IT Proforma →**
  (or `/it-proformas` for the global list)
- Fill in: reference, closing date, invited firm IDs.
- 🔒 **Guards fire now:**
  - any blacklisted firm among the invites → refused;
  - any un-pre-qualified firm → refused.
- IT created at `status = DRAFT`.

### Step 11 — Chain #2 approves the IT
- **Click:** **Start IT approval** on the indent detail page.
- **Actors:** AD → DD → DP(N) via `/approvals`.
- When approved, status → `IT_DISPATCHED` (the Indent moves with it).

### Step 12 — Record the Advertisement
- **Actor:** ADP_STAFF or COORD_STAFF (or ADMIN)
- **Go to:** `/execution/advertisements/new`
- Pick the indent, pick medium (`PPRA_WEBSITE`, `NEWSPAPER`, `EPADS`,
  `OTHER`), record `publishedOn` and `bidSubmissionDeadline`.
- For indents > PKR 3,000,000 record BOTH a `PPRA_WEBSITE` **and** a
  `NEWSPAPER` row.

### Step 13 — Dispatch the IT
- **Actor:** ADP_STAFF or COORD_STAFF (or ADMIN)
- **Go to:** indent detail → **Dispatch IT** (prompt for closing date).
- 🔒 **Guards fire now:**
  - ad coverage doesn't cover the indent's value → refused;
  - `closingAt − first ad publishedOn < 15 days (NCB)` or `< 45 days (ICB)` → refused.
- Status → `TECH_OFFERS_OPEN`.

### Step 14 — Firms accept invite + submit technical offers
- **Actor:** FIRM_REP (each invited firm)
- **Go to:** `/firm/invites` → **Accept** → upload offer.

### Step 15 — Start the TSR
- **Actor:** INSPECTORATE (or ADMIN)
- **Go to:** `/tsrs` → **Start TSR →** on each row that has none.
- Status → `TSR_IN_PROGRESS`.

### Step 16 — Evaluate each technical offer
- **Actor:** INSPECTORATE
- On the TSR detail page, for each offer click one of:
  - **Accept** → verdict `ACCEPTED`
  - **Reject** → verdict `REJECTED`
  - **Raise query** → verdict `NEEDS_QUERY` (prompt for query text).

### Step 17 — (If any query was raised) Firm answers
- **Actor:** FIRM_REP
- **Go to:** `/firm/queries` → answer the query.
- Then back to Step 16 to re-evaluate.

### Step 18 — Complete the TSR
- **Actor:** INSPECTORATE
- **Click:** **Complete TSR** (only enabled when every offer has a
  terminal verdict).
- Status → `COMMERCIAL_OPEN` (only the ACCEPTED firms carry forward).

### Step 19 — Open each commercial offer
- **Actor:** ADP_STAFF or COORD_STAFF (or ADMIN)
- **Go to:** indent detail → **Open commercial offer** (do this once per
  technically-accepted firm).
- Fill in: total price, currency, bid security amount, delivery weeks.
- 🔒 **A newly-blacklisted firm's offer is refused.**

### Step 20 — Set bid validity on each commercial offer
- **Actor:** ADP_STAFF (or ADMIN)
- From `/commercial-offers`, note the offer id.
- Either via the API `POST /api/commercial-offers/[id]/bid-validity`
  `{ "bidValidUntil": "YYYY-MM-DD" }`, or wait — any offer whose date
  passes surfaces at `/commercial-offers/overdue-validity`.

### Step 21 — Prepare the CST
- **Actor:** ADP_STAFF or COORD_STAFF (or ADMIN)
- **Go to:** indent detail → **Prepare CST**
- Add one line per commercial offer, rank them, mark one as
  `recommendedForAward`, write the justification.
- If only one offer survived TSR, check `singleQuote=true`.
- Status → `CST_PREPARATION → CST_APPROVAL`.

### Step 22 — Chain #3 approves the CST
- **Click:** **Start CST approval** on the indent detail page.
- **Actors:** AD → DD (default); for single-quote, full chain.
- When approved, status → `CST_APPROVAL` (holding for PR issue).

### Step 23 — Issue the Purchase Requisition
- **Actor:** ADP_STAFF or COORD_STAFF (or ADMIN)
- **Go to:** indent detail → **Issue PR**
- Give it a PR number (format `PR/YYYY/XXXXX`).
- 🔒 **Three guards fire now, in one shot:**
  - winning firm blacklisted → refused;
  - any PENDING or APPEALED pre-award grievance on the indent → refused;
  - indent > PKR 10M without a signed Integrity Pact → refused.
- Status → `PR_ISSUED`; the PR row is at `DRAFT`.

### Step 24 — Send the PR (fax)
- **Actor:** ADP_STAFF (or ADMIN)
- **Click:** **Send PR (fax)** on the indent detail page.
- PR status `DRAFT → SENT`.

### Step 25 — Firm acknowledges the PR
- **Actor:** FIRM_REP
- **Go to:** `/firm/prs` → **Acknowledge**.
- PR status `SENT → ACKNOWLEDGED`.

### Step 26 — Close the PR + indent
- **Actor:** ADP_STAFF (or ADMIN)
- **Click:** **Close PR + indent** on the indent detail page.
- Indent status → `CLOSED`; PR status → `CLOSED`.

> At this point the pre-award half is done. Continue below for execution.

---

## PART B — Post-award (contract → final payment)

### Step 27 — Award the contract
- **Actor:** ADP_STAFF or COORD_STAFF (or ADMIN)
- **Go to:** `/execution/contracts/new` (or **+ Award contract** on
  `/prs` row).
- Pick the PR (indent, firm, amount pre-fill). Enter contract number,
  awardedOn, signedOn, status `SIGNED`.

### Step 28 — Record bank guarantees as the firm furnishes them
- **Actor:** ADP_STAFF (or ADMIN)
- **Go to:** `/execution/guarantees/new` for each one:
  - `BID_SECURITY` (may already be captured on the commercial offer;
    record anyway if required).
  - `PERFORMANCE` — typically 5–10% of contract value.
  - `ADVANCE_PAYMENT` — equal to any advance paid.
- Fill in amount, `furnishedOn`, `expiresOn`.

### Step 29 — (Imports only) Open the Letter of Credit
- **Go to:** `/execution/lcs/new`
- Record LC number + `openedOn`.
- Later, if the LC needs amending: `/execution/lcs` → **+ Amendment**
  on the LC row.

### Step 30 — (Imports only) Record insurance
- **Go to:** `/execution/insurances/new`
- Kind (`MARINE`/`WAR_RISK`/`TRANSIT`/`COMPREHENSIVE`), policy, insurer,
  cover window, premium.
- 🔒 Service requires `coverToDate > coverFromDate` and currency match
  with the contract.

### Step 31 — (Imports of controlled goods only) Issue End User Certificate
- **Actor:** DP(N) / DGDP / ADMIN
- **Go to:** `/execution/end-user-certificates/new`
- End-user organisation, controlled-goods description, issue date.

### Step 32 — (Optional) Disclose + approve agent commission
- **Disclose:** `/execution/agent-commissions/new` (agent name, % of
  contract, amount, disclosedOn).
- **Approve:** on the commissions list, inline **Approve** by senior staff.
- 🔒 Currency must match contract currency.

### Step 33 — Record the shipment
- **Go to:** `/execution/shipments/new`
- Mode (`SEA`/`AIR`/`ROAD`/`RAIL`/`COURIER`), BL/AWB number, dispatched
  date, freight forwarder, ports.
- When the shipment arrives: `/execution/shipments` → **Mark received**
  on the row.

### Step 34 — Inspect the stores
- **Actor:** INSPECTORATE
- **Go to:** `/execution/inspections/new`
- Pick contract, write summary, choose verdict:
  - `ACCEPTED` — clean, proceed to Step 36.
  - `DISCREPANCY` — one or more issues; proceed to Step 35.
  - `REJECTED` — fails inspection; stop here, the supplier must remediate.

### Step 35 — (If DISCREPANCY) Raise + resolve each discrepancy
- **Raise:** `/execution/inspections` → `+ Discrepancy` button on the
  non-ACCEPTED inspection (description + severity).
- **Resolve** or **Waive** each one inline (requires ≥5-char notes).
- 🔒 **Step 37 (TOC) refuses while any discrepancy is OPEN.**

### Step 36 — Record the invoice
- **Go to:** `/execution/invoices/new`
- Invoice number, received date, amount, currency.

### Step 37 — Record the payment
- **Go to:** `/execution/payments/new`
- Pick invoice, amount, paid date.
- The form shows **outstanding LD** on that contract so you deduct
  before releasing. Multiple partial payments per invoice are allowed.

### Step 38 — (If delivery was late) Assess liquidated damages
- **Go to:** `/execution/liquidated-damages/new`
- Delay window, basis (per day/week/month, default per month), amount,
  waiver (if any) with reason.
- 🔒 **Service refuses if net LD would cross 10% of contract value.**
  If it does, waive down or reduce.

### Step 39 — (If delivery was late and DP is being extended) Record the DP extension
- **Actor:** DP(N) or ADMIN (or ADP/COORD recording the decision)
- **Go to:** `/execution/dp-extensions/new`
- Pick contract, new DP date, reason, grantedOn.
- 🔒 Service requires `newDP > current DP`.

### Step 40 — (If scope / value / quantity changes) Record a contract amendment
- **Propose:** `/governance/contract-amendments/new`
- Scope (`QTY`/`DP`/`VALUE`/`SPEC`/`OTHER`), summary, delta (for VALUE/QTY).
- **Approve** inline from `/governance/contract-amendments`.
- 🔒 Approving a VALUE or QTY amendment with a delta moves
  `Contract.value` in the same transaction.

### Step 41 — Issue the Taking-Over Certificate
- **Go to:** `/execution/contracts` → **Issue TOC** on the contract row
  (prompt for `certifiedOn`).
- 🔒 Service refuses while any inspection discrepancy on this contract
  is OPEN. Resolve them first (Step 35).
- Contract status moves `SIGNED` / `IN_PROGRESS` → `COMPLETED`;
  `takingOverCertifiedOn` is stamped.

### Step 42 — Final close
- Fill in `closedOn` on the contract (via admin edit, future UI).
- Contract status → `CLOSED`. Workflow done.

---

## Alternate ending — supplier defaulted

### Step T1 — Terminate the contract + auto-open risk purchase
- **Go to:** `/execution/contracts` → **Terminate + risk purchase**
  (danger button) on the contract row.
- Prompt for a ≥10-char reason; confirm.
- In one transaction the contract moves to `TERMINATED` **and** a
  `RiskPurchaseCase` is opened pointing at that contract.

### Step T2 — Link a replacement
- **Go to:** `/frameworks/risk-purchases` → **Link replacement** on the
  case (prompt for replacement indent id and/or contract id).
- Status → `REPLACEMENT_AWARDED`.

### Step T3 — Settle the risk amount
- **Click:** **Settle** → prompt for amount + settled date.
- Status → `SETTLED`.

### Step T4 — Close the risk-purchase case
- **Click:** **Close** → prompt for closedOn.
- Status → `CLOSED`.

---

## Quick reference — the 10 state transitions on the Indent

| From | Click | To |
|---|---|---|
| `DRAFT` | Submit for CR | `SUBMITTED` → `CR_RECEIVED` |
| `CR_RECEIVED` | Forward | `BUDGET_CHECK` |
| `BUDGET_CHECK` | Approve / Reject | `COORD_VETTING` / `BUDGET_REJECTED` |
| `COORD_VETTING` | Assign ADP | `ADP_VETTING` |
| `ADP_VETTING` | Vet clean / Raise obs | `SUPTD_VETTING` / `ADP_OBSERVED` |
| `ADP_OBSERVED` | Resolve & return | `ADP_VETTING` |
| `SUPTD_VETTING` | (chain cascades) | `INDENT_APPROVAL` |
| `INDENT_APPROVAL` | Chain #1 completes | `IT_PREPARATION` or `INDENT_REJECTED` |
| `IT_PREPARATION` | Create IT + Chain #2 + Dispatch | `TECH_OFFERS_OPEN` (via `IT_APPROVAL` → `IT_DISPATCHED`) |
| `TECH_OFFERS_OPEN` | Start TSR | `TSR_IN_PROGRESS` |
| `TSR_IN_PROGRESS` | Complete TSR | `COMMERCIAL_OPEN` |
| `COMMERCIAL_OPEN` | Prepare CST + Chain #3 | `CST_PREPARATION` → `CST_APPROVAL` |
| `CST_APPROVAL` | Issue PR | `PR_ISSUED` |
| `PR_ISSUED` | Close PR + indent | `CLOSED` |

---

## What you've exercised when you finish

✅ Three approval chains (Indent / IT / CST)
✅ ADP observations loop
✅ TSR queries loop
✅ All three compliance guards (blacklist / grievance / integrity pact)
✅ Advertisement threshold + response-time guards
✅ Bid validity
✅ All four execution evidence models (Guarantee, LC, Insurance, Shipment, EUC, AgentCommission)
✅ Inspection + Discrepancy + Taking-Over gate
✅ Liquidated Damages with 10% cap
✅ DP extension
✅ Contract Amendment moving the value
✅ Risk purchase on termination

Everything else the app ships (FMS, Disposal, Frameworks, Committees,
Grievance/Appeal, Transparency) is **parallel** to this flow — you
trigger them on their own pages, they don't block the normal indent
lifecycle.
