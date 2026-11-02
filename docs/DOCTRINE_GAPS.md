# Doctrine gaps — PPRA & DPP&I-35 features still to build

What **PPRA (Public Procurement Rules, 2004 as amended)** and **DPP&I-35
(Defence Procurement Procedures & Instructions)** require, where this app
already covers it (see [`E2E_WORKFLOW_GUIDE.md`](E2E_WORKFLOW_GUIDE.md)), and
what is still missing. Items are ordered by priority for the ZeroLink
compliance engine; each entry includes a thumbnail of the data/UI we'd add.

Legend: ✅ in app · ⚠️ partial · ❌ missing.

---

## A. Pre-award — currently missing

### A1. Annual Procurement Plan (PPRA Rule 8) ❌
**What the rule says.** Each procuring agency must publish an annual plan
listing all intended procurements for the fiscal year within one year of PPRA
Rule 8 commencement; the plan is the first act in a compliant cycle.

**What we have.** `FiscalYear`, `BudgetAllocation`, `BudgetHead` entities — but
no `AnnualProcurementPlan` entity, no "mark indent as planned" link.

**What to add.**
- Prisma model `AnnualProcurementPlan { fiscalYearId, publishedOn, totalEstimateMinor, items[] { description, budgetHeadId, estimateMinor, methodHint } }`.
- Admin page `/admin/annual-plans` with publish + list.
- Indent create form: optional `plannedItemId` to link the indent to a planned item.
- Compliance check: *flag* indents whose value materially exceeds the plan line, or that have no plan link in a fiscal year that has a plan.

### A2. Splitting / regrouping check (PPRA Rule 9) ❌
Rule 9 forbids splitting a procurement to evade a method threshold.

**What to add.** A background job that scans draft/submitted indents of the
same budget head + same section + overlapping description window, grouped by
submitter, in the same fiscal month, and raises a soft warning that evaluation
can promote to a breach.

### A3. Pre-qualification of firms (PPRA Rules 15–16; DPP&I-35 Ch XXVI) ❌
Chapter XXVI (pp. 204–238 of DPP&I-35) is a whole workflow in itself:
Registration → Document checklist → Payment of fees → Lead-agency vetting →
Issuance of **certificate** with validity → Renewals → Revocation.

**What we have.** The `Firm` model with name, legal data, and `FirmInvite`
records — no registration workflow, no certificate, no validity date, no
documents.

**What to add.**
- `FirmRegistration { firmId, submittedOn, documentKey, status, issuedOn, validUntil, categories[] }`
- `FirmPreQualification` similar, scoped to a specific indent's category.
- Admin pages `/admin/firms/[id]/registration` and `/firms/[id]/prequal` with
  issue / renew / revoke actions.
- Compliance check: refuse IT invite to a firm whose registration lapsed.

### A4. Bid validity tracking (PPRA Rule 26) ⚠️
Rule 26: bids must be processed within their validity period; expiring soon →
extension needed.

**What we have.** `CommercialOffer` carries no `validUntil` field.

**What to add.** `CommercialOffer.validUntil`, a filter in `/commercial-offers`
for "expiring in 7 days", and a background notification.

### A5. Standard Bidding Documents (PPRA Rule 23(4)) ❌
Rule 23(4) says procuring agencies **shall use** standard bidding documents
issued by PPRA. Today the IT Proforma is a free-text artefact.

**What to add.** `BiddingDocumentTemplate { kind: GOODS|SERVICES|WORKS, body, publishedOn }`
served by PPRA; attach a template id to each IT Proforma; compliance flags
when the IT is prepared without one.

### A6. Integrity Pact (PPRA Rule 7) ✅ *(2026-11-02)*
Rule 7: all procurements > PKR 10,000,000 must include a signed Integrity
Pact between buyer and bidder.

**Shipped.** `IntegrityPact { indentId, firmId, signedByBuyerUserId,
signedByBuyerOn, signedBySupplierOn, documentKey }`, enforced in
`IssuePRUseCase` when the indent's estimated value exceeds PKR 10 M.
UI at **/compliance/integrity-pacts** (list + register + record
counter-signature).

### A7. Methods of advertisement with threshold enforcement (PPRA Rule 12) ⚠️
`Advertisement` exists (new in this release) but we don't enforce "newspaper
required when > 3M" nor "PPRA website required when > 500k".

**What to add.** On `/execution/advertisements/new` for an indent > 3M, require
**two** entries (PPRA_WEBSITE + NEWSPAPER). Compliance rule: at least one
PPRA_WEBSITE row for every indent > 500k that reached `IT_DISPATCHED`.

### A8. Response-time enforcement (PPRA Rule 13) ⚠️
Rule 13: ≥ 15 days NCB, ≥ 45 days ICB between advertisement publication and
bid submission deadline.

**What to add.** On IT dispatch, read the Advertisement's `publishedOn` for
the same indent and refuse / warn when `closingAt - publishedOn < 15d`
(or 45d for ICB).

### A9. Blacklisting (PPRA Rule 19) ✅ *(2026-11-02)*
Rule 19 defines blacklisting authorities, grounds, and a formal review
petition process.

**Shipped.** `Blacklist { firmId, declaredOn, effectiveFrom,
effectiveUntil, ground, reason, decidedByUserId, documentKey, status,
revokedOn, revokedByUserId, revokedReason }` plus revoke endpoint.
`Firm.isBlacklisted` is kept in sync by the mutator.
`compliancePolicy.assertFirmNotBlacklisted(firmId, asOf)` guard — wired
into `IssuePRUseCase`. UI at **/compliance/blacklists**.

**Still to do.** Hook the guard into `IT invite` and
`openCommercialOffer` so a blacklisted firm is refused earlier in the
pipeline, not only at PR issue.

### A10. Rejection of all bids / re-bidding (PPRA Rules 33–34) ❌
Rule 33 permits rejection of all bids; Rule 34 defines re-bidding (and makes
it an auditable event).

**What to add.** On the IT detail page, a "Reject all offers" action that
pivots the indent to `IT_PREPARATION` with a reason, and keeps a `RejectAllRecord`.

### A11. Grievance Redressal Committee (PPRA Rules 48, 50) ✅ *(2026-11-02)*
Rule 48/50: GRC of odd-number members; written complaints; GRC decides within
10 working days; bidder may appeal to the Authority; a procurement contract
cannot be awarded while a complaint is pending.

**Shipped.** `Grievance { indentId, firmId?, filedByUserId?, filedOn,
basis, stage: PRE_AWARD | POST_AWARD, status: PENDING | UPHELD |
REJECTED | WITHDRAWN | APPEALED, grcDecisionOn, grcDecisionText,
appealedToPPRAOn, documentKey }` plus decide / appeal / withdraw
endpoints. `compliancePolicy.assertNoBlockingGrievance(indentId)`
guard — wired into `IssuePRUseCase`. UI at **/compliance/grievances**.

**Still to do.** Separate Committee registry (odd-numbered members, term
dates) and 10-working-day SLA alerting; wire the same guard into any
future `AwardContractUseCase`.

### A12. Mis-procurement audit trail (PPRA Rule 50) ⚠️
`AuditLog` already exists but is not segmented by "mis-procurement incident".
Any breach that reaches `UPHELD` should produce a `MisprocurementIncident` row
for Authority reporting.

### A13. Public access to award documents (PPRA Rule 47) ❌
As soon as a contract is awarded, all evaluation and award documents must be
public. No `/public/{indentId}/documents` endpoint exists today.

**What to add.** A read-only, un-authed route that returns award + evaluation
docs for a given indent that has a `Contract` and no `withholdingApprovedBy`.

---

## B. Execution — currently missing

### B1. Delivery Period & Liquidated Damages (DPP&I-35 Ch XIII) ❌
Chapter XIII (pp. 103–108): LD = (typically) 2% per month of delay, capped at
10% of contract value; the DP(Navy) may extend DP on cause.

**What to add.**
- `DeliveryPeriod { contractId, originalDP, extendedDP, extensionReason, grantedByUserId, grantedOn }`
- `LiquidatedDamages { contractId, assessedOn, amountMinor, basis }`
- Admin page `/execution/contracts/[id]/dp` with "Extend DP" and "Assess LD".

### B2. Inspection reports & discrepancies (DPP&I-35 Ch XVI) ❌
Chapter XVI (pp. 119–127): inspection by the Inspectorate, acceptance or
discrepancy; discrepancy loop closes before Taking-Over Certificate.

**What to add.**
- `Inspection { contractId, performedByUserId, performedOn, verdict: ACCEPTED|DISCREPANCY, notes, documentKey }`
- `Discrepancy { inspectionId, raisedOn, resolvedOn, resolutionNotes }`
- Inspectorate page under `/inspection`.

### B3. Insurance (DPP&I-35 Ch XVII) ❌
Chapter XVII (pp. 128–132): for imports, marine + war risk insurance.

**What to add.** `Insurance { contractId, policyNumber, coverFromDate, coverToDate, premiumMinor, currency }`.

### B4. Shipment of defence stores (DPP&I-35 Ch XVIII) ❌
Chapter XVIII: approved freight forwarders, inspection pre-dispatch,
Bill of Lading / Airway Bill.

**What to add.** `Shipment { contractId, invoiceId, mode: SEA|AIR|ROAD, blAwbNumber, dispatchedOn, receivedOn, freightForwarderId }`.

### B5. End User Certificate (DPP&I-35 Ch XIX) ❌
Chapter XIX (pp. 145–147): EUC issued for imports of controlled goods.

**What to add.** `EndUserCertificate { contractId, issuedOn, issuingAuthorityUserId, documentKey }`.

### B6. Agent Commission policy (DPP&I-35 Ch XX) ❌
Chapter XX (pp. 148–151): agent commission disclosure and limits.

**What to add.** `AgentCommission { contractId, agentFirmId, percent, amountMinor, approvedOn }`.

### B7. Contract amendments (DPP&I-35 Ch XXI) ⚠️
Chapter XXI (pp. 152–156): formal amendments to quantity, DP, or value. We
have `LCAmendment` for the LC only.

**What to add.** `ContractAmendment { contractId, requestedOn, approvedOn, scope: QTY|DP|VALUE|SPEC, deltaMinor, document }`.

### B8. Risk purchase (DPP&I-35 Ch XXII) ❌
Chapter XXII (pp. 157–163): on supplier failure, re-tender at supplier's cost
and risk.

**What to add.**
- `RiskPurchase { originalContractId, triggerReason, newIndentId, newContractId, riskSettledMinor }`.
- An action on a `TERMINATED` contract: "Initiate risk purchase" that cross-links a replacement indent.

### B9. Rate Running Contracts / Framework agreements (DPP&I-35 Ch XXIII; PPRA Rule 16A) ❌
Chapter XXIII (pp. 164–169): framework agreements for repeat purchases; call-off orders.

**What to add.**
- `FrameworkAgreement { preparedByUserId, firmIds[], validFrom, validTo, maxValueMinor }`.
- `CallOffOrder { frameworkAgreementId, placedOn, amountMinor, lineItems[] }` — replaces the full indent for repeats.

### B10. Foreign Military Sales (DPP&I-35 Ch XXIV) ❌
Chapter XXIV (pp. 170–178): government-to-government procurement under FMS.

**What to add.** A separate indent flavour `IndentKind=FMS` with its own
approval chain and no commercial-offer stage.

### B11. Disposal of surplus defence stores (DPP&I-35 Ch XXV) ❌
Chapter XXV (pp. 179–203): a parallel workflow for scrap sales.

**What to add.** `DisposalCase { kind: AUCTION|TENDER, lots[], receivedBids[], awardedOn, saleProceedsMinor }`. 

### B12. Appeals (DPP&I-35 Ch XXVIII; PPRA Rule 50) ❌
Chapter XXVIII (pp. 248–252): the two-tier appeals mechanism beyond the GRC.

**What to add.** `Appeal { grievanceId, appealedOn, decidedOn, outcome }`.

### B13. Record retention (PPRA Rule 46) ⚠️
Rule 46: minimum five-year retention of procurement proceedings. We retain
in the DB indefinitely, but no explicit retention policy, hold flags for
litigation, or evidence of destruction.

**What to add.** `RetentionHold { subjectKind, subjectId, placedByUserId, reason, placedOn, releasedOn? }`
and an admin page to apply/release.

---

## C. Cross-cutting / platform

### C1. Procuring-agency Committee registry ❌
PPRA Rule 48 requires a GRC comprising an odd number of members; the app has
no committee entity.

**What to add.** `Committee { kind: GRC|TEC|FEC, members[], termStart, termEnd }`
with per-indent assignment.

### C2. Document templates signed-off library ⚠️
The compliance engine looks for template keys on `IndentItem`, `IT`, and
`Contract`. Current attachments are free-form.

**What to add.** `TemplateCatalog` + per-document "which template produced
this attachment" link.

### C3. Dashboard: Compliance view ❌
There's no "which rules fail today" surface for the ADMIN. The ZCI engine
produces findings externally; a lightweight dashboard that embeds its summary
(SLA burn, open grievances, expiring guarantees, late payments) would make
the compliance posture visible in-app.

### C4. Firm scorecard — PPRA/DPP&I signals ⚠️
We already have `FirmScorecardView` for turnaround metrics; extend with
DPP&I-35 Ch XXVI (B) factors: delivery timeliness, LD history, blacklist
history, pending grievances.

---

## D. Priority recommendation

If you can only build a few in the next sprint, pick these in order:

1. **A9. Blacklisting** — the single biggest compliance risk; today an admin
   could silently re-invite a blacklisted firm.
2. **A11. GRC + grievance** — PPR 48/50 is both a hard rule and a legal risk.
3. **B1. DP extensions + LD** — most-often invoked execution rule.
4. **B2. Inspection reports** — gates the Taking-Over Certificate and
   closes the loop between delivery and payment.
5. **A6. Integrity Pact** — simple to add, prevents a mis-procurement finding
   on every indent > 10M.

Everything else can land as separate PRs scoped to one chapter at a time.
