# Doctrine gaps — PPRA & DPP&I-35 features still to build

What **PPRA (Public Procurement Rules, 2004 as amended)** and **DPP&I-35
(Defence Procurement Procedures & Instructions)** require, where this app
already covers it (see [`E2E_WORKFLOW_GUIDE.md`](E2E_WORKFLOW_GUIDE.md)), and
what is still missing. Items are ordered by priority for the ZeroLink
compliance engine; each entry includes a thumbnail of the data/UI we'd add.

Legend: ✅ in app · ⚠️ partial · ❌ missing.

---

## A. Pre-award — currently missing

### A1. Annual Procurement Plan (PPRA Rule 8) ✅ *(2026-11-02)*
**What the rule says.** Each procuring agency publishes an annual plan
listing all intended procurements for the fiscal year.

**Shipped.** `AnnualProcurementPlan { fiscalYearId, status (DRAFT /
PUBLISHED / SUPERSEDED), publishedOn, publishedByUserId, totalEstimate,
currency, notes }` + `AnnualProcurementPlanItem { planId, budgetHeadId,
description, estimatedValue, currency, methodHint, categoryHint,
quarterHint }`. One DRAFT + one PUBLISHED per FY (DB unique);
publishing one supersedes any prior PUBLISHED plan in the same
transaction. UI at **/planning/annual-plans**. `Indent.plannedItemId`
column added as an optional link to a plan line.

**Still to do.** Add a compliance check that flags indents whose value
materially exceeds the plan line, or that have no plan link in a
fiscal year that has a PUBLISHED plan.

### A2. Splitting / regrouping check (PPRA Rule 9) ✅ *(2026-11-02)*
Rule 9 forbids splitting a procurement to evade a method threshold.

**Shipped.** `planningReports.findSplittingSuspicions(withinDays)` groups
recent non-cancelled indents by (indenterId, budgetHeadId, fiscalYearId),
and flags groups whose individual values stay below the RFQ ceiling
(PKR 500,000) but whose sum crosses either the RFQ ceiling or the open-
bidding threshold (PKR 3,000,000). Admin view at **/planning/splitting-check**
with a configurable window (7–365 days).

**Still to do.** When the detector fires, auto-raise an `Observation`
on each of the suspected indents so the ADP sees it in the normal
indent flow (currently it is only visible on the splitting-check page).

### A3. Pre-qualification of firms (PPRA Rules 15–16; DPP&I-35 Ch XXVI) ✅ *(2026-11-02)*
Chapter XXVI (pp. 204–238 of DPP&I-35) is a whole workflow in itself:
Registration → Document checklist → Lead-agency vetting →
Issuance of **certificate** with validity → Renewals → Revocation.

**Shipped.** `FirmRegistration { firmId, category (12-value enum),
submittedOn, status (PENDING / APPROVED / REJECTED / EXPIRED / REVOKED),
issuedOn, validUntil, certificateKey, reviewedByUserId, reviewNotes,
revokedOn, revokedReason, version }`. Lifecycle service with submit /
approve / reject / revoke. `assertFirmPreQualified(firmId, category | null,
asOf)` guard wired into `CreateITPerformaUseCase` (currently with
`category = null` — any APPROVED registration qualifies the firm; see
below). UI at **/registration** with inline Approve / Reject / Revoke.

**Still to do.** Bind the IT invite's category to `Indent.category` so the
guard can require a matching registration category rather than any; add
a nightly job that flips APPROVED → EXPIRED when `validUntil` passes.

### A4. Bid validity tracking (PPRA Rule 26) ✅ *(2026-11-02)*
Rule 26: bids must be processed within their validity period.

**Shipped.** `CommercialOffer.bidValidUntil` column; the Commercial Offers
list now shows the date with an EXPIRED pill when past. Admin can extend
validity via **POST /api/commercial-offers/[id]/bid-validity**. A new
page **/commercial-offers/overdue-validity** lists offers currently past
validity.

### A5. Standard Bidding Documents (PPRA Rule 23(4)) ✅ *(2026-11-02)*
Rule 23(4): procuring agencies "shall use" standard bidding documents
issued by PPRA.

**Shipped.** `BiddingDocumentTemplate { kind (GOODS/WORKS/SERVICES/
CONSULTANCY), name, revision, publishedOn, isActive, bodyKey, summary }`
with a unique (kind, revision) index. Admin UI at **/planning/bidding-templates**
with register + retire.

**Still to do.** Attach an optional `biddingDocumentTemplateId` to
`ITPerforma`, require it in `CreateITPerformaUseCase` once templates
exist for the matching kind, and raise a soft warning otherwise.

### A6. Integrity Pact (PPRA Rule 7) ✅ *(2026-11-02)*
Rule 7: all procurements > PKR 10,000,000 must include a signed Integrity
Pact between buyer and bidder.

**Shipped.** `IntegrityPact { indentId, firmId, signedByBuyerUserId,
signedByBuyerOn, signedBySupplierOn, documentKey }`, enforced in
`IssuePRUseCase` when the indent's estimated value exceeds PKR 10 M.
UI at **/compliance/integrity-pacts** (list + register + record
counter-signature).

### A7. Methods of advertisement with threshold enforcement (PPRA Rule 12) ✅ *(2026-11-02)*
Rule 12: procurement > PKR 500,000 on the PPRA website; > PKR 3,000,000 also
in at least one widely-circulated newspaper.

**Shipped.** `preAwardCompliance.assertAdvertisementCoverage(indentId)`
raises a 400 ValidationError if the indent's recorded `Advertisement`
rows do not cover the thresholds for its estimated value. The guard is
wired into `DispatchITUseCase` so dispatch refuses while advertisement
coverage is insufficient.

### A8. Response-time enforcement (PPRA Rule 13) ✅ *(2026-11-02)*
Rule 13: ≥ 15 days NCB, ≥ 45 days ICB between advertisement publication
and bid submission deadline.

**Shipped.** `preAwardCompliance.assertResponseTime(indentId, closingAt)`
compares `closingAt` with the earliest Advertisement's `publishedOn` and
raises when the gap is less than 15 or 45 days (based on
`Indent.isInternational`). The guard is wired into `DispatchITUseCase`.

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

### A10. Rejection of all bids / re-bidding (PPRA Rules 33–34) ✅ *(2026-11-02)*
Rule 33 permits rejection of all bids; Rule 34 defines re-bidding.

**Shipped.** `rebiddingService.rejectAllOffersAndReopen(itPerformaId,
reason)` moves every non-terminal technical and commercial offer to
REJECTED, closes the IT, and returns the indent to IT_PREPARATION — all
in one transaction, with an `AuditLog` entry capturing the reason and
affected counts. UI: inline "Reject all + re-bid" button on each
DISPATCHED IT in **/it-proformas** (requires a 10+ char reason).

**Still to do.** Expose "re-bid" as a specific IT lifecycle event rather
than a plain re-prep (keep a link to the superseded IT for audit).

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

### A12. Mis-procurement audit trail (PPRA Rule 50) ✅ *(2026-11-02)*
`AuditLog` already exists but is not segmented by "mis-procurement incident".

**Shipped.** `MisprocurementIncident { indentId?, ruleReference,
summary, details, severity (LOW/MEDIUM/HIGH/CRITICAL), status (OPEN/
REMEDIATED/REPORTED_TO_PPRA), detectedOn, detectedByUserId,
remediatedOn, reportedToPPRAOn, documentKey, version }` with log /
remediate / report-to-PPRA endpoints. Admin UI at **/transparency/incidents**.

**Still to do.** Auto-log an incident from the compliance guards
(blacklist breach, missing Integrity Pact, Rule 12 shortfall) rather
than only recording them manually.

### A13. Public access to award documents (PPRA Rule 47) ✅ *(2026-11-02)*
As soon as a contract is awarded, all evaluation and award documents must be
public.

**Shipped.** Unauthenticated `GET /api/public/awards/[indentId]` returns
the award evidence (indent subject + estimated value, advertisement
timeline, CST line summary with firm names + prices + rank +
recommended-for-award flag, and the contract: number, firm, value,
awarded/signed dates). Returns 404 unless a Contract exists. The
response carries `cache-control: public, max-age=300`. The endpoint
exposes nothing beyond firm name — no user identifiers. Admin index at
**/transparency/awards** lists every awarded contract with its public URL.

---

## B. Execution — currently missing

### B1. Delivery Period & Liquidated Damages (DPP&I-35 Ch XIII) ✅ *(2026-11-02)*
Chapter XIII (pp. 103–108): LD = (typically) 2% per month of delay, capped at
10% of contract value; the DP(Navy) may extend DP on cause.

**Shipped.** `Contract.originalDP` + `DeliveryPeriodExtension { contractId,
previousDP, newDP, reason, grantedByUserId, grantedOn, documentKey }` chain
(each extension carries the previous DP for audit), and `LiquidatedDamages
{ contractId, assessedOn, periodFrom, periodTo, basis (PER_DAY | PER_WEEK |
PER_MONTH | LUMP_SUM), amount, currency, waivedAmount, waivedReason,
assessedByUserId }`. UI at **/execution/dp-extensions** and
**/execution/liquidated-damages**.

**Still to do.** Compute the 10%-of-contract-value cap automatically and
flag assessments that breach it; integrate the LD policy with Payment
amounts (deduct outstanding LD from the next payment).

### B2. Inspection reports & discrepancies (DPP&I-35 Ch XVI) ✅ *(2026-11-02)*
Chapter XVI (pp. 119–127): inspection by the Inspectorate, acceptance or
discrepancy; discrepancy loop closes before Taking-Over Certificate.

**Shipped.** `Inspection { contractId, performedByUserId, performedOn,
verdict (ACCEPTED | DISCREPANCY | REJECTED), summary, documentKey }` and
`Discrepancy { inspectionId, raisedOn, description, severity (MINOR / MAJOR
/ CRITICAL), status (OPEN | RESOLVED | WAIVED), resolvedOn, resolutionNotes }`.
UI at **/execution/inspections** with inline "+ Discrepancy" and
"Resolve / Waive" buttons. Helper `executionObligations.assertNoOpenDiscrepancies(contractId)`
is wired into the service — ready to call from a future
`IssueTakingOverCertificate` use-case.

**Still to do.** Add a `TakingOverCertificate` use-case on `Contract` that
calls the assertion; today the field is set by hand on the admin create
form for `Contract`.

### B3. Insurance (DPP&I-35 Ch XVII) ✅ *(2026-11-02)*
Chapter XVII (pp. 128–132): for imports, marine + war risk insurance.

**Shipped.** `Insurance { contractId, kind (MARINE/WAR_RISK/TRANSIT/
COMPREHENSIVE/OTHER), policyNumber, insurer, coverFromDate, coverToDate,
premium, currency, documentKey }`. The service enforces coverTo > coverFrom
and matching currency with the contract. UI at **/execution/insurances**
with EXPIRED/ACTIVE pill derived at read time.

### B4. Shipment of defence stores (DPP&I-35 Ch XVIII) ✅ *(2026-11-02)*
Chapter XVIII: approved freight forwarders, inspection pre-dispatch,
Bill of Lading / Airway Bill.

**Shipped.** `Shipment { contractId, invoiceId?, mode (SEA/AIR/ROAD/RAIL/
COURIER), blAwbNumber, dispatchedOn, receivedOn, freightForwarder,
originPort, destinationPort, documentKey }` plus "Mark received" action.
The service enforces receivedOn ≥ dispatchedOn and that any linked invoice
belongs to the same contract. UI at **/execution/shipments**.

### B5. End User Certificate (DPP&I-35 Ch XIX) ✅ *(2026-11-02)*
Chapter XIX (pp. 145–147): EUC issued for imports of controlled goods.

**Shipped.** `EndUserCertificate { contractId, issuedOn,
issuingAuthorityUserId, endUserOrganisation, controlledGoodsDesc,
documentKey }`. Issuable only by DP(N) / DGDP / ADMIN. UI at
**/execution/end-user-certificates**.

### B6. Agent Commission policy (DPP&I-35 Ch XX) ✅ *(2026-11-02)*
Chapter XX (pp. 148–151): agent commission disclosure and limits.

**Shipped.** `AgentCommission { contractId, agentName, agentFirmId?,
percent, amount, currency, disclosedOn, approvedOn, approvedByUserId,
documentKey }`. Two-step: disclose then approve (DP(N)/DGDP/SECY_DP/
ADMIN). Currency must match the contract. UI at **/execution/agent-commissions**.

**Still to do.** Hard-cap on `percent` once a definitive rate is agreed
with DP(N); DPP&I-35 does not fix the percentage so this is left policy-
configurable rather than code-enforced.

### B7. Contract amendments (DPP&I-35 Ch XXI) ✅ *(2026-11-02)*
Chapter XXI (pp. 152–156): formal amendments to quantity, DP, or value.

**Shipped.** `ContractAmendment { contractId, scope (QTY | DP | VALUE |
SPEC | OTHER), summary, deltaValue, deltaCurrency, requestedOn,
approvedOn, approvedByUserId, status (PROPOSED / APPROVED / REJECTED),
rejectionReason, documentKey }`. Approving a VALUE / QTY amendment with a
non-null delta moves the parent `Contract.value` in the same transaction.
UI at **/governance/contract-amendments**.

### B8. Risk purchase (DPP&I-35 Ch XXII) ✅ *(2026-11-02)*
Chapter XXII (pp. 157–163): on supplier failure, re-tender at supplier's
cost and risk.

**Shipped.** `RiskPurchaseCase { originalContractId (unique),
replacementIndentId?, replacementContractId? (unique), triggerReason,
initiatedOn, initiatedByUserId, status (INITIATED/REPLACEMENT_AWARDED/
SETTLED/CLOSED), riskSettled, currency, settledOn, closedOn, notes,
version }` with open / link-replacement / settle / close endpoints.
UI at **/frameworks/risk-purchases**.

**Still to do.** Auto-propose a risk-purchase case when a Contract is
TERMINATED, and surface a "Risk purchase" badge on the terminated
contract's row.

### B9. Rate Running Contracts / Framework agreements (DPP&I-35 Ch XXIII; PPRA Rule 16A) ✅ *(2026-11-02)*
Chapter XXIII (pp. 164–169): framework agreements for repeat purchases;
call-off orders.

**Shipped.** `FrameworkAgreement { reference (unique), kind (OPEN /
CLOSED), name, category, validFrom, validTo, maxValue, currency,
status (DRAFT/ACTIVE/EXPIRED/TERMINATED), signedByUserId, signedOn,
terminatedOn, terminatedReason, documentKey, version }` with
`FrameworkAgreementFirm` join table + `CallOffOrder { callOffNumber
(unique), firmId, description, amount, currency, placedOn,
fulfilledOn, status (DRAFT/PLACED/FULFILLED/CANCELLED), cancelledOn,
cancelledReason, documentKey }`. Services enforce:
- framework kind + category + at least one participating firm on create;
- call-off refuses unless framework is ACTIVE and firm is on it;
- call-off currency must match framework currency.

Lifecycle endpoints: create / activate / terminate on framework,
place / fulfill / cancel on call-off. UI at **/frameworks/agreements**
and **/frameworks/call-offs**.

**Still to do.** A nightly job that flips ACTIVE → EXPIRED when
validTo passes. Linking Indent.plannedItemId or Contract to a
call-off order for traceability.

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

### B13. Record retention (PPRA Rule 46) ✅ *(2026-11-02)*
Rule 46: minimum five-year retention of procurement proceedings.

**Shipped.** `RetentionHold { subjectType, subjectId, reason
(LITIGATION / AUDIT_INQUIRY / INVESTIGATION / REGULATORY_HOLD /
OTHER), placedByUserId, placedOn, releasedOn, releasedByUserId,
notes }`. Place/release endpoints; `transparencyService.isHeld(type,
id)` for callers that need to gate a disposal action. UI at
**/transparency/retention-holds**.

**Still to do.** A nightly purge job that enforces the 5-year
retention floor, skipping subjects with an active hold.

---

## C. Cross-cutting / platform

### C1. Procuring-agency Committee registry ✅ *(2026-11-02)*
PPRA Rule 48 requires a GRC comprising an odd number of members.

**Shipped.** `Committee { kind (GRC | TEC | FEC | INSPECTION | OTHER),
name, termStart, termEnd, isActive, notes, members[] }` with
`CommitteeMember { userId, memberRole, joinedOn, leftOn }`. The service
refuses a GRC with an even-sized membership on create / add / remove.
UI at **/governance/committees**.

**Still to do.** Per-indent assignment (link a GRC to the indent whose
grievance it is deciding) and a 10-working-day SLA alert on PENDING
grievances assigned to a given GRC.

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
