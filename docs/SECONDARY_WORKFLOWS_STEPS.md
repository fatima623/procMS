# Secondary workflows — step-by-step tester guide

Companion to [INDENT_LIFECYCLE_STEPS.md](./INDENT_LIFECYCLE_STEPS.md). The
indent lifecycle is the spine of the system; this file walks the 19 **side**
workflows a tester clicks through once the spine is understood.

Each section follows the same shape:

- **Purpose** — what the workflow is for, with the PPRA / DPP&I-35 reference.
- **Who** — the roles that can act.
- **Pre-requisites** — what must already exist in the DB.
- **Walkthrough** — the ordered clicks.
- **End state** — what row(s) exist and what status(es) they have.

> **Compliance note.** None of these workflows run compliance refusals of
> their own in ProcMS (per the ZeroLinkAI architecture). The four pre-award
> guards + three refusals that already exist stay, but new workflows record
> state and let ZeroLinkAI observe. See `memory/procms_compliance_architecture.md`.

---

## 1. Grievances (PPRA Rule 48; DPP&I-35 Ch XXVIII)

**Purpose.** A bidder who objects to the award or any upstream decision files
a grievance; the GRC rules on it. A pending grievance blocks any contract
award on that indent.

**Who.** FIRM_REP files via the public form; ADMIN / COORD_STAFF / ADP_STAFF
act as the GRC and decide.

**Pre-requisites.** An indent exists and is at least past IT dispatch so the
firm has something to grieve about. The GRC committee should exist
(see §17 below) and have an odd membership.

**Walkthrough.**

1. Go to `/compliance/grievances` → click **+ File grievance**.
2. Pick the indent, pick the firm, choose a `kind` (e.g. `BID_EVALUATION`),
   type a clear description, click **File grievance**. Row lands as `PENDING`.
3. Back on `/compliance/grievances`, in the row's actions:
   - **Uphold** — enter decision text (≥10 chars), row → `UPHELD`, blocks award.
   - **Reject** — same, row → `REJECTED`, unblocks.
   - **Withdraw** — optional reason, row → `WITHDRAWN`.
4. After `UPHELD` or `REJECTED`, a **Mark appealed** button appears — click
   when the firm notifies that it has escalated to the PPRA (§2 below).

**End state.** `Grievance.status` in `{PENDING, UPHELD, REJECTED, WITHDRAWN, APPEALED}`,
`grcDecisionOn` + `grcDecisionText` filled for the two decision terminals.

---

## 2. Appeals (PPRA Rule 50; DPP&I-35 Ch XXVIII)

**Purpose.** A bidder dissatisfied with the GRC's decision may appeal to the
PPRA Authority. Filing an appeal returns the parent grievance to `APPEALED`.

**Who.** ADMIN / DGDP / SECY_DP / ADP_STAFF / COORD_STAFF.

**Pre-requisites.** A grievance in `UPHELD` or `REJECTED` status.

**Walkthrough.**

1. Go to `/special/appeals` → click **+ File appeal**.
2. Pick the grievance, set `filedOn`, type the `basis` (≥10 chars),
   click **File appeal**. Row lands as `PENDING`; the parent grievance
   flips to `APPEALED`.
3. Back on `/special/appeals`, in the row's actions:
   - **Decide → Upheld** — the PPRA upheld the firm. Enter `decisionText`.
   - **Decide → Rejected** — the PPRA sided with the agency.
   - **Withdraw** — if the firm backs out.

**End state.** `Appeal.status` in `{PENDING, UPHELD, REJECTED, WITHDRAWN}`;
`decidedOn` + `decisionText` filled for the decision terminals.

---

## 3. Blacklist (PPRA Rule 19; DPP&I-35 Ch XXVI)

**Purpose.** Declare a firm untrustworthy for a stated ground. Blacklisted
firms are refused by the pre-award guards (`IssuePR`, `CreateITPerforma`,
`OpenCommercialOffer`).

**Who.** ADMIN / DGDP / SECY_DP / ADP_STAFF / COORD_STAFF.

**Walkthrough.**

1. `/compliance/blacklists` → **+ Declare blacklist**.
2. Pick firm, pick ground (`CORRUPT_PRACTICE`, `COLLUSION`, …), set
   `effectiveFrom` and optional `effectiveUntil`, type the order reference,
   click **Declare**. Row lands as `ACTIVE`.
3. Back on the list, each `ACTIVE` row shows a **Revoke** button — the firm
   filed a review petition inside the 30-day window and won. Enter revoke
   date + reason; row → `REVOKED`.

**End state.** `Blacklist.status` in `{ACTIVE, REVOKED, LAPSED}`
(`LAPSED` is derived at read time from `effectiveUntil`).

---

## 4. Risk purchases (DPP&I-35 Ch XV)

**Purpose.** After a contract is `TERMINATED`, the shortfall is bought at the
defaulter's cost. The system opens a `RiskPurchaseCase` automatically on
termination; this workflow walks its own lifecycle (link replacement, close,
settle).

**Who.** ADMIN / ADP_STAFF / COORD_STAFF.

**Pre-requisites.** A terminated contract — either click **Terminate** on
the contracts page or create the case manually via `/frameworks/risk-purchases/new`.

**Walkthrough.**

1. `/frameworks/risk-purchases` lists open cases.
2. **Link replacement** — tie this risk case to the replacement contract
   once awarded. Prompts for the replacement contract id.
3. **Close** — the file is formally closed.
4. **Settle** — enter the recovered amount (from the defaulter). Row updates
   `recoveredAmount` + `recoveredOn`.

**End state.** `RiskPurchaseCase.status` in `{OPEN, LINKED, CLOSED}` with
settlement figures stamped.

---

## 5. Framework agreements (DPP&I-35 Ch XXIII)

**Purpose.** A standing agreement with one or more firms at fixed prices.
Call-off orders (§6) draw against it.

**Who.** ADMIN / ADP_STAFF / COORD_STAFF.

**Walkthrough.**

1. `/frameworks/agreements` → **+ New framework agreement**.
2. Fill reference, scope description, `validFrom` / `validUntil`, pick
   the firm(s) to invite onto the panel, click **Create**. Row lands as `DRAFT`.
3. Back on the list, each `DRAFT` row shows **Activate** — enter `signedOn`,
   row → `ACTIVE`.
4. Each `ACTIVE` row shows **Terminate** — prompt for reason, row → `TERMINATED`.
5. Rows whose `validUntil` has passed render as `EXPIRED` automatically.

**End state.** `FrameworkAgreement.status` in `{DRAFT, ACTIVE, EXPIRED, TERMINATED}`.

---

## 6. Framework call-offs (DPP&I-35 Ch XXIII)

**Purpose.** A single order against an active framework agreement.

**Who.** ADMIN / ADP_STAFF / COORD_STAFF.

**Pre-requisites.** At least one `ACTIVE` framework agreement.

**Walkthrough.**

1. `/frameworks/call-offs` → **+ New call-off order**.
2. Pick the parent framework, pick the firm (must be on the panel), fill
   quantity / price / currency, click **Create**. Row lands as `OPEN`.
3. Back on the list, each `OPEN` row shows:
   - **Fulfill** — delivery complete. Row → `FULFILLED`.
   - **Cancel** — prompt for reason. Row → `CANCELLED`.

**End state.** `CallOffOrder.status` in `{OPEN, FULFILLED, CANCELLED}`.

---

## 7. FMS cases (DPP&I-35 Ch XXII)

**Purpose.** Foreign Military Sales — government-to-government procurement.
Separate lifecycle because the counter-party is a foreign authority, not a
commercial firm.

**Who.** ADMIN / DP_N / ADP_STAFF / COORD_STAFF.

**Walkthrough.**

1. `/special/fms` → **+ New FMS case**.
2. Fill reference, counter-party country, description, click **Create**.
   Row lands as `LOR_SUBMITTED` (Letter of Request sent).
3. On the list, actions become available one per phase:
   - **Record LOA** (status = `LOR_SUBMITTED`) — prompt for value + currency.
     Row → `LOA_RECEIVED`.
   - **Accept LOA** (status = `LOA_RECEIVED`) — row → `LOA_ACCEPTED`.
   - **Enter implementation** (status = `LOA_ACCEPTED`) — row → `IN_IMPLEMENTATION`.
   - **Delivery done** (status = `LOA_ACCEPTED` or `IN_IMPLEMENTATION`) —
     stamps `deliveryCompletedOn`.
   - **Close** (any non-LOR state) — row → `CLOSED`.

**End state.** `FMSCase.status` in `{LOR_SUBMITTED, LOA_RECEIVED, LOA_ACCEPTED,
IN_IMPLEMENTATION, CLOSED, CANCELLED}`.

---

## 8. Disposal cases (DPP&I-35 Ch XXV)

**Purpose.** Auction / tender / scrap-sale / transfer of surplus stores.

**Who.** ADMIN / ADP_STAFF / COORD_STAFF.

**Walkthrough.**

1. `/special/disposals` → **+ New disposal case**.
2. Fill reference, kind (AUCTION / TENDER / SCRAP_SALE / TRANSFER),
   description, add at least one **lot** with description + reserve price.
   Click **Create**. Case lands as `PLANNED`.
3. Back on the list, click **Open for bids** on the `PLANNED` case — prompt
   for `bidOpensOn` + `bidClosesOn`. Case → `OPEN_FOR_BIDS`.
4. For each lot, click **Award** — enter winning bid, bidder name, (optional)
   bidder firm id, awarded-on. Lot row updates. When **all** lots are
   awarded, the case flips to `AWARDED` automatically.
5. With case = `AWARDED`, click **Mark completed** — stamps `completedOn`
   and computes `totalProceeds` from the sum of winning bids.
6. **Cancel** is available at any non-terminal state — prompt for reason.

**End state.** `DisposalCase.status` in `{PLANNED, OPEN_FOR_BIDS, AWARDED,
COMPLETED, CANCELLED}` with per-lot `winningBid` + `awardedOn` filled.

---

## 9. Misprocurement incidents (PPRA Rule 50)

**Purpose.** A procedural lapse serious enough to be recorded and reported
to the PPRA. Compliance guards auto-create these for existing rule breaches;
manual creation is for lapses ZeroLinkAI flagged externally.

**Who.** ADMIN / DGDP / SECY_DP / COORD_STAFF.

**Walkthrough.**

1. `/transparency/incidents` → **+ Record incident**.
2. Pick the indent (optional), fill `kind` (`BLACKLISTED_FIRM_AWARDED`,
   `NO_INTEGRITY_PACT`, …), description, severity, click **Create**.
   Row lands as `OPEN`.
3. Back on the list:
   - **Mark remediated** — the underlying issue is fixed. Row → `REMEDIATED`.
   - **Report to PPRA** — the Authority has been formally notified. Row
     → `REPORTED_TO_PPRA`.

**End state.** `MisprocurementIncident.status` in `{OPEN, REMEDIATED,
REPORTED_TO_PPRA}`.

---

## 10. Retention holds (DPP&I-35 Ch XIII)

**Purpose.** Hold back a portion of payment until a specified condition is
met (warranty expiry, defect-liability period, …).

**Who.** ADMIN / ADP_STAFF / COORD_STAFF.

**Walkthrough.**

1. `/transparency/retention-holds` → **+ New retention hold**.
2. Pick contract, enter amount + currency + `conditionText`, click **Create**.
   Row lands as `HELD`.
3. On the list, each `HELD` row shows **Release** — prompt for release date
   + notes. Row → `RELEASED`.

**End state.** `RetentionHold.status` in `{HELD, RELEASED}`.

---

## 11. Annual Procurement Plan (PPRA Rule 8)

**Purpose.** Publish the agency's annual procurement intentions. Required
by PPRA rule — a prerequisite for several award paths.

**Who.** ADMIN / DP_N / SECY_DP.

**Walkthrough.**

1. `/planning/annual-plans` → **+ New annual plan**.
2. Pick the fiscal year, add items (budget head + estimated value + target
   quarter), click **Create**. Plan lands as `DRAFT`.
3. On the list, click **Publish** on the `DRAFT` plan. Plan → `PUBLISHED`
   with `publishedOn` stamped.

**End state.** `AnnualProcurementPlan.status` in `{DRAFT, PUBLISHED}`
with items in child table.

---

## 12. Bidding-document templates

**Purpose.** Standard IT / tender templates. Used as references when an IT
Proforma is drafted.

**Who.** ADMIN / ADP_STAFF.

**Walkthrough.**

1. `/planning/bidding-templates` → **+ New template**.
2. Fill name, kind, body text, click **Create**. Row lands as `ACTIVE`.
3. On the list, each `ACTIVE` row shows **Retire** — prompts for `retiredOn`.
   Row → `RETIRED`.

**End state.** `BiddingDocumentTemplate.status` in `{ACTIVE, RETIRED}`.

---

## 13. Inspections (DPP&I-35 Ch XVI)

**Purpose.** On-site or document-review inspections of delivered stores.

**Who.** ADMIN / ADP_STAFF / COORD_STAFF / INSPECTORATE.

**Pre-requisites.** A contract exists.

**Walkthrough.**

1. `/execution/inspections` → **+ Record inspection**.
2. Pick contract, enter `performedOn`, verdict (`ACCEPTED`, `DISCREPANCY`,
   `REJECTED`), summary, click **Create**.
3. On the list, each inspection row with verdict ≠ `ACCEPTED` shows
   **Raise discrepancy** — fill description + severity. See §14.

**End state.** `Inspection` row with verdict + optional child discrepancies.

---

## 14. Discrepancies (DPP&I-35 Ch XVI)

**Purpose.** Open issues found during an inspection. The contract's Taking-Over
Certificate is refused while any discrepancy is `OPEN` (existing hard guard —
stays per compliance decision).

**Walkthrough.** (Driven from the inspections page.)

1. On an inspection row, **Raise discrepancy** → enter description + severity.
   Row lands as `OPEN`.
2. Each `OPEN` discrepancy shows **Resolve** — pick outcome (`RESOLVED` or
   `WAIVED`), enter resolution notes + `resolvedOn`. Row → the chosen outcome.
3. Once all discrepancies on a contract are closed, **Issue TOC** on the
   contract page (§15 in `INDENT_LIFECYCLE_STEPS.md`) becomes callable.

**End state.** `Discrepancy.status` in `{OPEN, RESOLVED, WAIVED}`.

---

## 15. Agent commissions (DPP&I-35 Ch XIX)

**Purpose.** Disclose any commission paid to an agent on a contract.
Required for transparency — the commission must be disclosed and approved
by competent authority.

**Who.** ADMIN / DP_N / DGDP / ADP_STAFF / COORD_STAFF.

**Walkthrough.**

1. `/execution/agent-commissions` → **+ Disclose commission**.
2. Pick contract, fill agent name, (optional) agent firm id, percent,
   amount, currency, `disclosedOn`, click **Create**. Row lands pending
   approval.
3. On the list, each pending row shows **Approve** — stamps `approvedOn`
   with the acting user.

**End state.** `AgentCommission` row with `approvedOn` + `approvedByUserId`
filled for approved items.

---

## 16. Shipments (DPP&I-35 Ch XVII)

**Purpose.** Record international shipments of imported stores.

**Who.** ADMIN / ADP_STAFF / COORD_STAFF.

**Walkthrough.**

1. `/execution/shipments` → **+ Record shipment**.
2. Pick contract, enter `mode` (SEA / AIR / ROAD / RAIL / COURIER),
   port-of-loading, port-of-discharge, `dispatchedOn`, expected-arrival,
   click **Create**. Row lands as `IN_TRANSIT`.
3. On the list, each `IN_TRANSIT` row shows **Mark received** — prompt for
   `receivedOn`. Row → `RECEIVED`.

**End state.** `Shipment.status` in `{IN_TRANSIT, RECEIVED}`.

---

## 17. Committees (PPRA Rule 48)

**Purpose.** GRC (Grievance Redressal), TEC (Tender Evaluation), FEC (Finance
Evaluation), and INSPECTION committees. GRC **must** have an odd number of
members (the service refuses an even add or remove that leaves even parity).

**Who.** ADMIN / DGDP / SECY_DP.

**Walkthrough.**

1. `/governance/committees` → **+ Form committee**.
2. Pick kind, name, term start/end, add at least one member (user picker +
   role + joined-on). For GRC, add an odd number. Click **Create**.
3. Back on the list, each **active** committee card now shows:
   - **Add member** form — picker filtered to non-active users. The form
     enforces GRC parity (adding one that would make the count even is
     refused with the message telling you to add two).
   - **× member-name** chips — click to stamp `leftOn` on that member
     (prompts for the leave date).
   - **Deactivate committee** — confirm, committee → `isActive = false`
     (member history preserved).

**End state.** `Committee` + many `CommitteeMember` rows with joined/left
ranges.

---

## 18. Contract amendments (DPP&I-35 Ch XXI)

**Purpose.** Post-award changes to a signed contract (scope, value, DP,
terms). Each amendment is proposed, then approved or rejected.

**Who.** ADMIN / DP_N / ADP_STAFF / COORD_STAFF (propose); ADMIN / DGDP /
SECY_DP (approve/reject).

**Walkthrough.**

1. `/governance/contract-amendments` → **+ Propose amendment**.
2. Pick contract, scope (`SCOPE` / `VALUE` / `DP` / `OTHER`), summary
   (≥10 chars), optional delta value/currency, `requestedOn`, click
   **Propose**. Row lands as `PROPOSED`.
3. On the list, each `PROPOSED` row shows:
   - **Approve** — stamps `approvedOn`. Row → `APPROVED`.
   - **Reject** — prompt for reason. Row → `REJECTED`.

**End state.** `ContractAmendment.status` in `{PROPOSED, APPROVED, REJECTED}`.

---

## 19. Integrity pacts (PPRA Rule 7)

**Purpose.** Signed pact between agency and bidder — mandatory for every
procurement over PKR 10 M, signed before award. Existing guard refuses `IssuePR`
without one above the threshold.

**Who.** ADMIN / ADP_STAFF / COORD_STAFF.

**Walkthrough.**

1. `/compliance/integrity-pacts` → **+ Register pact**.
2. Pick indent, pick firm, enter `signedByBuyerOn`, (optional) document
   key, click **Create**. Row lands with only buyer-side signed.
3. On the list, each row without a supplier signature shows
   **Record counter-signature** — prompts for `signedBySupplierOn`. Row's
   status pill flips `Awaiting` → `Complete`.

**End state.** `IntegrityPact` with both signature dates filled.

---

## 20. Liquidated Damages waiver (DPP&I-35 Ch XIII) — added `ba216c6`

**Purpose.** Grant a (partial or full) waiver on an LD *after* it was
assessed, when competent authority decides the delay was excusable.

**Who.** ADMIN / ADP_STAFF / COORD_STAFF.

**Walkthrough.**

1. `/execution/liquidated-damages` → an existing LD row shows a **Waive**
   button on the far right (label becomes **Revise waiver** if one is
   already recorded).
2. Click → enter waiver amount (same currency as the LD) → enter reason
   (≥5 chars). Row's `waivedAmount` + `waivedReason` columns update, and
   the outstanding LD used by the Payment form shrinks accordingly.

Service refuses a waiver larger than the assessed amount, or non-positive.

---

## Workflows that are intentionally record-only

These four pages record a decision taken offline by a competent authority.
They have a create form but no lifecycle actions, because the model has no
state fields to transition and adding them requires a schema migration that
has not been commissioned:

| Workflow | Why record-only |
|---|---|
| **DP Extensions** (`/execution/dp-extensions`) | A DP extension is granted by DP(N) offline and recorded here. No `requested → granted` cycle in-system. |
| **End-User Certificates** (`/execution/end-user-certificates`) | Issued once per controlled-goods import. No revoke/expire in schema. |
| **Insurance** (`/execution/insurances`) | Marine / war-risk cover. `EXPIRED` is derived from `coverToDate`. No cancel/claim in schema. |
| **Guarantees / Invoices / Payments / LCs / LC amendments** | All evidence rows. Lifecycle (if any) is driven by the parent contract. |

If any of these need a real lifecycle (DP ext approval cycle, EUC revocation,
insurance cancellation, …), the next step is a schema migration — flag which
one and we build it like §20 above.

---

## Quick cross-reference: workflow → URL → action API

| § | Workflow | URL | Primary mutating API |
|---|---|---|---|
| 1 | Grievances | `/compliance/grievances` | `POST /api/grievances/[id]/{decide,withdraw,appeal}` |
| 2 | Appeals | `/special/appeals` | `POST /api/appeals/[id]/{decide,withdraw}` |
| 3 | Blacklist | `/compliance/blacklists` | `POST /api/blacklists/[id]/revoke` |
| 4 | Risk purchases | `/frameworks/risk-purchases` | `POST /api/risk-purchases/[id]/{close,settle,link-replacement}` |
| 5 | Framework agreements | `/frameworks/agreements` | `POST /api/framework-agreements/[id]/{activate,terminate}` |
| 6 | Call-offs | `/frameworks/call-offs` | `POST /api/call-offs/[id]/{fulfill,cancel}` |
| 7 | FMS cases | `/special/fms` | `POST /api/fms-cases/[id]/{loa,accept-loa,implement,complete-delivery,close}` |
| 8 | Disposals | `/special/disposals` | `POST /api/disposals/[id]/{open-bids,complete,cancel}` + `POST /api/disposal-lots/[id]/award` |
| 9 | Incidents | `/transparency/incidents` | `POST /api/misprocurement-incidents/[id]/{remediate,report-to-ppra}` |
| 10 | Retention holds | `/transparency/retention-holds` | `POST /api/retention-holds/[id]/release` |
| 11 | Annual plans | `/planning/annual-plans` | `POST /api/annual-plans/[id]/publish` |
| 12 | Bidding templates | `/planning/bidding-templates` | `POST /api/bidding-templates/[id]/retire` |
| 13 | Inspections | `/execution/inspections` | `POST /api/inspections` |
| 14 | Discrepancies | (on inspections page) | `POST /api/discrepancies/[id]/resolve` |
| 15 | Agent commissions | `/execution/agent-commissions` | `POST /api/agent-commissions/[id]/approve` |
| 16 | Shipments | `/execution/shipments` | `POST /api/shipments/[id]/receive` |
| 17 | Committees | `/governance/committees` | `POST /api/committees/[id]/{members,deactivate}` + `POST /api/committee-members/[id]/remove` |
| 18 | Contract amendments | `/governance/contract-amendments` | `POST /api/contract-amendments/[id]/{approve,reject}` |
| 19 | Integrity pacts | `/compliance/integrity-pacts` | `POST /api/integrity-pacts/[id]/counter-sign` |
| 20 | LD waiver | `/execution/liquidated-damages` | `POST /api/liquidated-damages/[id]/waive` |

---

## Suggested test order

Independent workflows the tester can walk in isolation (no indent required):

- §3 Blacklist (just needs a firm)
- §11 Annual plan (just needs a fiscal year)
- §12 Bidding templates (nothing required)
- §17 Committees (just needs users)

Indent-dependent (need the IND/2026/X1QBBGBB5F indent or any other that
reached contract / pre-award):

- §1 Grievance → §2 Appeal
- §19 Integrity pact (requires the indent's firm to be blacklist-free and
  pre-qualified — same guard as IT Create)
- §13 Inspection → §14 Discrepancy → TOC → §20 LD waive
- §15 Agent commission → §16 Shipment → §10 Retention hold → §18 Amendment
  → close contract

Terminated-contract-dependent:

- §4 Risk purchase (needs a terminated contract)

Standalone cases (no indent):

- §5 Framework agreement → §6 Call-off
- §7 FMS case
- §8 Disposal case
- §9 Misprocurement incident
