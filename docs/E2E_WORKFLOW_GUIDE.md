# End-to-end workflow guide — ProcMS (DP-Navy)

A complete walk-through of the procurement workflow this app models — every
stage, who runs it, what buttons they press, where the data lands, and the
PPRA / DPP&I-35 rule each step maps to. Pair with
[`DOCTRINE_GAPS.md`](DOCTRINE_GAPS.md) for the parts the doctrine requires
that this app does **not** yet implement.

> **New in this release.** Admins (and ADP / COORD staff) now have a top-level
> list page for every workflow object — not only indents — plus a dedicated
> **Execution** hub for everything after the Purchase Requisition
> (advertisement, contract, guarantee, invoice, payment, LC, LC amendment).
> The TSR queue also has a one-click **Start TSR** button on each row so an
> admin or inspector can begin a TSR without opening the parent indent first.

---

## 1. The two halves of the cycle

```
                 ┌──── Pre-award (planning) ─────┐  ┌──── Post-award (execution) ─────┐
Indent → Chain1  →  IT Proforma → Chain2 → Dispatch IT
       Tech offers → TSR → Commercial offers → CST → Chain3 → PR
                                                              ↓
                                                        Advertisement*
                                                        Contract
                                                        Guarantees (bid/perf/APG)
                                                        LC (if import) → amendments
                                                        Invoices → Payments
                                                        Taking-over → Contract closure
```
*\* An Advertisement is required for all procurements > PKR 500,000 and is
usually recorded alongside IT dispatch rather than strictly after PR; this app
stores it against the Indent so the compliance engine can evaluate lead-times.*

Three approval chains are enforced inside the Indent aggregate:

| Chain | What it approves                   | Default route                              |
| :---- | :--------------------------------- | :----------------------------------------- |
| #1    | The Indent itself                  | SUPTD → AD → DD → DP(N) → DGDP → Secy DP   |
| #2    | The IT Proforma                    | AD → DD → DP(N)                            |
| #3    | The CST                            | AD → DD, or full chain for single-quote    |

The CPO approval is a side-branch for propriety indents.

---

## 2. Role matrix

| Role            | Can do                                                                 |
| :-------------- | :--------------------------------------------------------------------- |
| INDENTER        | Draft indents, submit, resolve ADP observations                        |
| CR_STAFF        | Receive at CR, forward to Budget                                       |
| BUDGET_STAFF    | Verify budget allocation, approve or reject                            |
| COORD_STAFF     | Vet, assign to a concerned ADP                                         |
| ADP_STAFF       | Vet, raise observations, allocate control number, prepare IT, dispatch, open commercial, prepare CST, issue PR |
| SUPTD / AD / DD / DP_N / DGDP / SECY_DP | Act on their approval step (approve / reject)      |
| CPO             | Approve propriety indent                                               |
| INSPECTORATE    | Start TSR, evaluate offers, raise queries, complete TSR                |
| FIRM_REP        | Accept IT invite, submit technical offer, answer TSR query, submit commercial offer, acknowledge PR |
| **ADMIN**       | Everything above *plus* list every workflow object directly and record execution-half rows (advertisement, contract, guarantee, invoice, payment, LC) |

Non-privileged users see only what their role scope allows. The app does not
rely on the client to enforce this — every API route and every page re-checks
via `requireAuth` / `requireRoles`.

---

## 3. Stage-by-stage walkthrough

Each stage lists: **actor**, **where to click**, **what gets written**, **next status**,
and the **doctrine rule**.

### Stage 1 — Draft the indent
- **Actor:** INDENTER (or ADMIN)
- **Where:** `/indents` → **+ New indent**
- **Form fields (visible labels — the compliance engine reads these):**
  Subject, Priority, Section, Fiscal Year, Budget head, Procurement method
  (`OPEN_COMPETITIVE_BIDDING` / `RFQ` / …), Estimated value (minor units,
  currency), items[] (lineNo, description, qty, UOM, unit price).
- **State change:** none yet — `IndentStatus = DRAFT`.
- **Doctrine:** DPP&I-35 Ch IV (Raising of Indents).

### Stage 2 — Submit for CR
- **Actor:** INDENTER (or ADMIN)
- **Where:** indent detail → **Submit for CR**
- **State change:** `DRAFT → SUBMITTED` → auto-handed to `CR_RECEIVED`.

### Stage 3 — CR Section forwards to Budget
- **Actor:** CR_STAFF (or ADMIN)
- **State:** `CR_RECEIVED → BUDGET_CHECK`.

### Stage 4 — Budget verification
- **Actor:** BUDGET_STAFF
- **Decisions:** approve or `BUDGET_REJECTED` (terminal unless the indenter files a new one).

### Stage 5 — COORD vetting
- **Actor:** COORD_STAFF
- **Writes:** assigns an **ADP section** (the "concerned ADP").
- **State:** `BUDGET_CHECK → COORD_VETTING → ADP_VETTING`.

### Stage 6 — ADP vetting + control number
- **Actor:** ADP_STAFF
- **Branches:**
  - **Clean:** writes `controlNumber` (your traceable id), state → `SUPTD_VETTING → INDENT_APPROVAL`.
  - **Observations raised:** uses **Raise observation** → state `ADP_OBSERVED`. The
    indenter resolves via **Resolve observations & return**, which goes back to `ADP_VETTING`.
- **Doctrine:** DPP&I-35 Ch V (Cross-mandation / vetting).

### Stage 7 — Chain #1: Indent approval
- **Actors:** AD → DD → DP(N) → DGDP → Secy DP (gates based on indent value).
- **Where:** `/approvals` → each actor's row → open and **Approve** / **Reject**.
- **State:** `INDENT_APPROVAL → IT_PREPARATION` on full approval, or
  `INDENT_REJECTED` on any step rejection.
- **CPO branch:** for propriety cases the chain diverts via `CPO_APPROVAL`.

### Stage 8 — Prepare the IT Proforma (Invitation to Tender)
- **Actor:** ADP_STAFF (or ADMIN)
- **Where:** indent detail → **Create IT Proforma →** (status `IT_PREPARATION`).
  Admins and ADPs may also open `/it-proformas` to see every IT across all indents.
- **Form:** firms[], checklist, closing date.
- **Doctrine:** DPP&I-35 Ch VI (ITB); PPRA Rule 10 (specs must not favour a vendor).

### Stage 9 — Chain #2: IT approval
- **Actor:** AD → DD → DP(N).
- **Where:** indent detail → **Start IT approval** then normal `/approvals` flow.
- **State:** `IT_PREPARATION → IT_APPROVAL → IT_DISPATCHED` on success.

### Stage 10 — Dispatch IT (and advertise)
- **Actor:** ADP_STAFF (or ADMIN)
- **Where:** indent detail → **Dispatch IT**. Prompt sets the closing date.
- **State:** `IT_DISPATCHED → TECH_OFFERS_OPEN`.
- **Advertisement:** also record on **Execution → Advertisements → + Record advertisement**:
  - PPRA website for procurements > PKR 500,000 (PPRA Rule 12(1)).
  - At least two widely-circulated newspapers for > PKR 3,000,000 (PPRA Rule 12(2)).
  - Minimum response time: 15 days NCB / 45 days ICB (PPRA Rule 13).

### Stage 11 — Firms submit technical offers
- **Actor:** FIRM_REP
- **Where:** `/firm/invites` → accept → upload offer.
- **Doctrine:** DPP&I-35 Ch VII (Instructions for Bidders), Ch VIII (Submission).

### Stage 12 — Start TSR (Technical Scrutiny Report)
- **Actor:** INSPECTORATE (or ADMIN)
- **Where:** **`/tsrs`** → each un-started row has a **Start TSR →** button
  (newly added; previously only reachable via the indent detail). Click it
  and you land on the TSR detail page.
- **State:** `TECH_OFFERS_OPEN → TSR_IN_PROGRESS`.
- **Doctrine:** DPP&I-35 Ch IX (Opening and Evaluation of Bids).

### Stage 13 — Evaluate / raise queries / complete TSR
- **Actor:** INSPECTORATE
- **On the TSR detail page:**
  - **Evaluate** each technical offer: `ACCEPTED` / `REJECTED` / `NEEDS_QUERY`.
  - **Raise query** → firm answers via `/firm/queries`.
  - **Complete TSR** when every offer has a final verdict and no open query remains.
- **State:** on completion → `COMMERCIAL_OPEN` (only technically-accepted firms carry forward).

### Stage 14 — Open commercial offers
- **Actor:** ADP_STAFF / COORD_STAFF (or ADMIN)
- **Where:** indent detail → **Open commercial offer**, one row per accepted firm.
  Admins can also browse every opened offer at `/commercial-offers`.
- **Fields:** total price, currency, bid security amount, delivery (weeks).
  Bid security ≤ 5% of estimated value (PPRA Rule 25).
- **Doctrine:** DPP&I-35 Ch IX (two-envelope procedure).

### Stage 15 — Prepare the CST
- **Actor:** ADP_STAFF / COORD_STAFF (or ADMIN)
- **Where:** indent detail → **Prepare CST**. Lines, ranks, recommendation
  justification. `singleQuote=true` means Chain #3 runs the full indent chain.
  Admins may browse every CST at `/csts`.
- **State:** `COMMERCIAL_OPEN → CST_PREPARATION → CST_APPROVAL`.
- **Doctrine:** DPP&I-35 Ch X (CST and Price Analysis).

### Stage 16 — Chain #3: CST approval
- **Actors:** AD → DD (default), or AD → DD → DP(N) → DGDP → Secy DP for single-quote.
- **State on success:** `CST_APPROVAL → PR_ISSUED` (after PR issue below).
- **Rule 35:** evaluation report must be announced at least **15 days before** contract award.

### Stage 17 — Issue Purchase Requisition
- **Actor:** ADP_STAFF / COORD_STAFF (or ADMIN)
- **Where:** indent detail → **Issue PR**. PR number format `PR/YYYY/XXXXX`.
  Admins and COORDs may also browse every PR at `/prs`, including "+ Award
  contract" shortcuts for PRs that have no contract yet.
- **State:** `CST_APPROVAL → PR_ISSUED`.
- **Doctrine:** DPP&I-35 Ch XI (Purchase Proposal).

### Stage 18 — Send / acknowledge PR
- **Actor:** ADP_STAFF (send); FIRM_REP (acknowledge via `/firm/prs`).
- **PR status:** `DRAFT → SENT → ACKNOWLEDGED`.

### Stage 19 — Close PR + indent (end of pre-award)
- **Actor:** ADP_STAFF (or ADMIN)
- **Where:** indent detail → **Close PR + indent** once acknowledged.
- **State:** `PR_ISSUED → CLOSED`; PR status → `CLOSED`.

---

## 4. Execution (post-award) — new in this release

Admins and COORD/ADP staff access these from the sidebar's **Execution** tile.

### 4.1 Record contract (**Execution → Contracts → + Award contract**)
- Pick the PR; firm, amount, indent pre-fill.
- Fields: contract number, value, currency, awardedOn, signedOn, status
  (`SIGNED` / `IN_PROGRESS`), takingOverCertifiedOn, closedOn.
- The DB enforces one contract per indent — accidental duplicates raise 400.

### 4.2 Record a bank guarantee (**Execution → Bank guarantees → + Record guarantee**)
- Types: `BID_SECURITY` (should match or ≤ 5% of estimate — PPRA Rule 25),
  `PERFORMANCE` (DPP&I-35 Ch XV; usually 5–10% of contract value),
  `ADVANCE_PAYMENT` (equal to the advance taken).
- Dates: `furnishedOn`, `expiresOn`. Expiries drive compliance alerts.

### 4.3 Letter of Credit (**Execution → Letters of Credit → + Record LC**)
- For imported stores (DPP&I-35 Ch XIV). Confirmed, irrevocable, payable at sight.
- Each LC can carry multiple **amendments** (**+ Amendment** per row).

### 4.4 Invoice (**Execution → Invoices → + Record invoice**)
- Running bills and invoices received from the supplier.
- Must reference a contract; amount can be partial of contract value.

### 4.5 Payment (**Execution → Payments → + Record payment**)
- Multiple partial payments per invoice are allowed.
- PPRA Rule 43: payments within the time stated in the contract — typically
  within 30 days of accepted invoice (also PFM Act §22).

### 4.6 LC amendment (**Execution → LC amendments → + Record amendment**)
- Request date + bank-finalisation date. Supports schedule extensions, value
  changes, shipment-date revisions.

---

## 5. All scenarios

### Golden path (OPEN_COMPETITIVE_BIDDING, three bidders, no observations)
1. Indenter submits → CR forwards → Budget OKs → COORD assigns ADP → ADP vets, allocates control#
2. Chain #1 approves → ADP prepares IT, invites three firms → Chain #2 approves → ADP dispatches
3. Advertisement recorded on PPRA website (also newspaper if > 3M)
4. All three firms submit technical offers before closing date
5. Inspectorate starts TSR, evaluates each, no queries, completes TSR → two technically accepted
6. ADP opens commercial for the two accepted → prepares CST (two lines, L1 recommended)
7. Chain #3 approves → ADP issues PR to L1 firm → firm acknowledges
8. ADP closes PR + indent → records contract on Execution → Contracts
9. Firm furnishes performance bond → recorded
10. Supplier delivers → invoice recorded → payment recorded → contract closed

### Scenario A — ADP observation then resolution
After ADP vetting, observations are raised (`ADP_OBSERVED`). Indenter opens
the indent → **Resolve observations & return**, writes resolution text,
state returns to `ADP_VETTING`. Loops are permitted; each round is audit-logged.

### Scenario B — Budget rejection
At `BUDGET_CHECK`, Budget rejects → `BUDGET_REJECTED` (terminal). Indenter
must file a new indent against a different budget head or wait for a reallocation.

### Scenario C — Chain #1 rejection at DP(N)
Chain #1 progresses through SUPTD → AD → DD, then DP(N) rejects. State →
`INDENT_REJECTED`. No further action; the indent is terminal.

### Scenario D — Propriety indent via CPO
If the indent is flagged as propriety, after SUPTD it diverts to `CPO_APPROVAL`.
The CPO acts via `/approvals`; approval returns the indent to `IT_PREPARATION`.

### Scenario E — Single-source / single-quote CST
Only one commercial offer survives TSR. The CST sets `singleQuote=true`,
Chain #3 then runs the **full** chain (AD→DD→DP(N)→DGDP→Secy DP) instead of
the short two-step.

### Scenario F — TSR query loop
Inspectorate marks an offer `NEEDS_QUERY`, raises a query. Firm answers in
`/firm/queries`. Inspectorate re-evaluates (`ACCEPTED` or `REJECTED`). TSR
only completes when every offer has a terminal verdict.

### Scenario G — No bids / under-subscribed
If zero or one qualifying offer arrives, the IT may be re-dispatched (today
done manually by cancelling the current IT and preparing a new one — see
[DOCTRINE_GAPS § Re-bidding](DOCTRINE_GAPS.md) for the proper flow).

### Scenario H — Firm fails to acknowledge PR
PR is `SENT` for > 7 days (DPP&I-35 default) without acknowledgement. Today
the ADP cancels and re-issues manually; a dedicated **Risk Purchase**
workflow is not yet implemented (see Doctrine Gaps).

### Scenario I — Import contract via LC
Contract recorded → LC opened on Execution → LCs → amendments as needed →
supplier ships → invoice → payment. The LC amendments drive compliance checks
on allowable schedule extensions.

### Scenario J — Advance-payment guarantee drawn
Contract permits advance payment, supplier furnishes `ADVANCE_PAYMENT`
guarantee equal to the advance → the guarantee expiry must cover expected
delivery; alert if `expiresOn < scheduled delivery date`.

### Scenario K — Partial payments against one invoice
Several `Payment` rows under one `Invoice`; the Invoices page shows a
"Paid" column that sums payment amounts. Partial payments < 100% of invoice
indicate retention or dispute.

### Scenario L — Contract taking-over + closure
After supplier delivers and inspection completes (today captured only in
notes — see Doctrine Gaps on Inspection reports), set `takingOverCertifiedOn`,
then `status=COMPLETED`, then `closedOn`.

### Scenario M — Blacklisted firm
Today the Firm model has no `blacklistedAt` column; see Doctrine Gaps for the
PPRA Rule 19 blacklisting workflow we should add.

### Scenario N — Grievance filed by a bidder
Today there is no grievance model. PPRA Rules 48 / 50 require a GRC
(Grievance Redressal Committee) with 10 working days to decide, before the
bidder can go to PPRA. See Doctrine Gaps.

---

## 6. Day-one admin walkthrough (what to click after seeding)

1. **Dashboard** — check KPIs and the burndown.
2. **Indents** → open any `DRAFT`, click **Submit for CR**, impersonate the
   relevant actor at each step (admin can act on behalf of a role).
3. **`/approvals`** — chair the three approval chains.
4. **`/it-proformas`** — confirm the IT shows for the indent in `IT_DISPATCHED`.
5. **`/tsrs`** → **Start TSR** on an un-started row; evaluate the offers;
   complete the TSR.
6. **`/commercial-offers`** — open the price envelopes.
7. **`/csts`** → walk one through Chain #3.
8. **`/prs`** → **Send PR (fax)** → **Close PR + indent**.
9. **`/execution`** → tiles: record one of each (advertisement, contract,
   guarantee, LC, invoice, payment, LC amendment) to exercise execution-stage
   compliance rules.
10. **`/admin/burndown`** or **`/admin/turnaround`** — verify SLAs.

---

## 7. Troubleshooting

- **"No action available for your role in this state."** The user doesn't
  hold a role that can act on the current `IndentStatus`. Admin can impersonate.
- **"HTTP 400 — That PR already has a contract."** The DB enforces
  `Contract.indentId` unique and `Contract.purchaseRequisitionId` unique; use
  Execution → Contracts to find the existing row.
- **"HTTP 404 — Indent/Firm/Contract not found."** The id in the picker is
  stale; refresh the create form.
- **TypeScript errors on `.next/types/validator.ts`** are pre-existing in the
  checked-in codebase (unrelated to this feature) — the user's local
  `package.json` upgrade changed the Next route-handler signature.
