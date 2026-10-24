import { prisma } from '@/infrastructure/db/prisma';
import { decimalToMinor } from '@/infrastructure/common/decimal';

export interface FirmScorecardRow {
  readonly firmId: string;
  readonly code: string;
  readonly name: string;
  readonly city: string | null;
  readonly isBlacklisted: boolean;
  readonly invites: number;
  readonly technicalOffers: number;
  readonly technicalAccepted: number;
  readonly commercialOpened: number;
  readonly prsWon: number;
  readonly awardedMinor: string;
  readonly winRatePct: number;              // prsWon / invites × 100
  readonly technicalAcceptPct: number;      // accepted / submitted × 100
  readonly avgQueryResponseHours: number | null;
}

/**
 * Firm scorecard — one row per firm, with every stage of their funnel plus
 * their query turnaround. Optionally scoped to a fiscal year so execs can
 * compare year-over-year performance.
 */
export async function loadFirmScorecard(opts: { fiscalYearId?: string } = {}): Promise<readonly FirmScorecardRow[]> {
  const fyFilter = opts.fiscalYearId
    ? { itPerforma: { indent: { fiscalYearId: opts.fiscalYearId } } }
    : {};

  const firms = await prisma.firm.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, code: true, name: true, city: true, isBlacklisted: true },
  });
  if (firms.length === 0) return [];
  const firmIds = firms.map((f) => f.id);

  const [invites, techOffers, commOffers, prs, queries] = await Promise.all([
    prisma.iTFirmInvite.findMany({
      where: {
        firmId: { in: firmIds },
        ...(opts.fiscalYearId ? { itPerforma: { indent: { fiscalYearId: opts.fiscalYearId } } } : {}),
      },
      select: { firmId: true },
    }),
    prisma.technicalOffer.findMany({
      where: { firmId: { in: firmIds }, ...fyFilter },
      select: { firmId: true, status: true },
    }),
    prisma.commercialOffer.findMany({
      where: { firmId: { in: firmIds }, ...fyFilter },
      select: { firmId: true },
    }),
    prisma.purchaseRequisition.findMany({
      where: {
        firmId: { in: firmIds },
        ...(opts.fiscalYearId ? { cst: { itPerforma: { indent: { fiscalYearId: opts.fiscalYearId } } } } : {}),
      },
      select: { firmId: true, amount: true },
    }),
    prisma.tSRQuery.findMany({
      where: {
        firmId: { in: firmIds },
        status: { in: ['ANSWERED', 'CLOSED'] },
        askedAt: { not: undefined },
        answeredAt: { not: null },
        ...(opts.fiscalYearId ? { tsr: { itPerforma: { indent: { fiscalYearId: opts.fiscalYearId } } } } : {}),
      },
      select: { firmId: true, askedAt: true, answeredAt: true },
    }),
  ]);

  const invitesBy = countBy(invites, (r) => r.firmId);
  const techBy = countBy(techOffers, (r) => r.firmId);
  const techAcceptBy = countBy(techOffers.filter((o) => o.status === 'ACCEPTED'), (r) => r.firmId);
  const commBy = countBy(commOffers, (r) => r.firmId);
  const prBy = countBy(prs, (r) => r.firmId);

  const awardedBy = new Map<string, bigint>();
  for (const p of prs) {
    awardedBy.set(p.firmId, (awardedBy.get(p.firmId) ?? 0n) + decimalToMinor(p.amount as unknown as string));
  }

  const queryHoursBy = new Map<string, number[]>();
  for (const q of queries) {
    const hours = (q.answeredAt!.getTime() - q.askedAt.getTime()) / 3_600_000;
    if (hours < 0) continue;
    (queryHoursBy.get(q.firmId) ?? queryHoursBy.set(q.firmId, []).get(q.firmId)!).push(hours);
  }

  return firms.map((f) => {
    const invitesN = invitesBy.get(f.id) ?? 0;
    const techN = techBy.get(f.id) ?? 0;
    const techAcceptN = techAcceptBy.get(f.id) ?? 0;
    const commN = commBy.get(f.id) ?? 0;
    const prN = prBy.get(f.id) ?? 0;
    const awarded = (awardedBy.get(f.id) ?? 0n).toString();
    const winRatePct = invitesN > 0 ? Math.round((prN / invitesN) * 1000) / 10 : 0;
    const techAcceptPct = techN > 0 ? Math.round((techAcceptN / techN) * 1000) / 10 : 0;
    const hours = queryHoursBy.get(f.id);
    const avgQuery = hours && hours.length > 0 ? Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10 : null;
    return {
      firmId: f.id,
      code: f.code,
      name: f.name,
      city: f.city,
      isBlacklisted: f.isBlacklisted,
      invites: invitesN,
      technicalOffers: techN,
      technicalAccepted: techAcceptN,
      commercialOpened: commN,
      prsWon: prN,
      awardedMinor: awarded,
      winRatePct,
      technicalAcceptPct: techAcceptPct,
      avgQueryResponseHours: avgQuery,
    };
  }).sort((a, b) => {
    // Prefer firms with activity first, then by awarded value descending.
    const bAw = BigInt(b.awardedMinor);
    const aAw = BigInt(a.awardedMinor);
    if (aAw !== bAw) return bAw > aAw ? 1 : -1;
    return b.invites - a.invites;
  });
}

function countBy<T>(items: readonly T[], key: (t: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}
