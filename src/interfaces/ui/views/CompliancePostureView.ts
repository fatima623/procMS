import { prisma } from '@/infrastructure/db/prisma';

export interface CompliancePosture {
  readonly activeBlacklists: number;
  readonly pendingGrievances: number;
  readonly appealedGrievances: number;
  readonly pendingAppeals: number;
  readonly openIncidents: number;
  readonly criticalIncidents: number;
  readonly activeHolds: number;
  readonly pactsAwaitingCounterSign: number;
  readonly expiredBidValidity: number;
  readonly openRiskPurchases: number;
  readonly discrepanciesOpen: number;
  readonly agentCommissionsAwaitingApproval: number;
  readonly guaranteesExpiringSoon: number; // within 30 days
  readonly insurancesExpiringSoon: number;
  readonly pendingFMSAcceptance: number;
}

/**
 * Reads a snapshot of the compliance-control stores to render a dashboard
 * posture tile. Pure read, no writes, no mutation.
 */
export async function loadCompliancePosture(): Promise<CompliancePosture> {
  const now = new Date();
  const in30Days = new Date(Date.now() + 30 * 86_400_000);
  const [
    activeBlacklists,
    pendingGrievances,
    appealedGrievances,
    pendingAppeals,
    openIncidents,
    criticalIncidents,
    activeHolds,
    pactsAwaitingCounterSign,
    expiredBidValidity,
    openRiskPurchases,
    discrepanciesOpen,
    agentCommissionsAwaitingApproval,
    guaranteesExpiringSoon,
    insurancesExpiringSoon,
    pendingFMSAcceptance,
  ] = await Promise.all([
    prisma.blacklist.count({ where: { status: 'ACTIVE' } }),
    prisma.grievance.count({ where: { status: 'PENDING' } }),
    prisma.grievance.count({ where: { status: 'APPEALED' } }),
    prisma.appeal.count({ where: { status: 'PENDING' } }),
    prisma.misprocurementIncident.count({ where: { status: 'OPEN' } }),
    prisma.misprocurementIncident.count({ where: { status: 'OPEN', severity: { in: ['HIGH', 'CRITICAL'] } } }),
    prisma.retentionHold.count({ where: { releasedOn: null } }),
    prisma.integrityPact.count({ where: { signedBySupplierOn: null } }),
    prisma.commercialOffer.count({
      where: {
        bidValidUntil: { lt: now },
        status: { in: ['RECEIVED', 'UNDER_REVIEW', 'ACCEPTED'] },
      },
    }),
    prisma.riskPurchaseCase.count({ where: { status: { not: 'CLOSED' } } }),
    prisma.discrepancy.count({ where: { status: 'OPEN' } }),
    prisma.agentCommission.count({ where: { approvedOn: null } }),
    prisma.guarantee.count({ where: { expiresOn: { gte: now, lte: in30Days } } }),
    prisma.insurance.count({ where: { coverToDate: { gte: now, lte: in30Days } } }),
    prisma.fMSCase.count({ where: { status: 'LOA_RECEIVED' } }),
  ]);
  return {
    activeBlacklists, pendingGrievances, appealedGrievances, pendingAppeals,
    openIncidents, criticalIncidents, activeHolds, pactsAwaitingCounterSign,
    expiredBidValidity, openRiskPurchases, discrepanciesOpen,
    agentCommissionsAwaitingApproval, guaranteesExpiringSoon,
    insurancesExpiringSoon, pendingFMSAcceptance,
  };
}
