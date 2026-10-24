import { prisma } from '@/infrastructure/db/prisma';
import { decimalToMinor } from '@/infrastructure/common/decimal';

export interface BurndownRow {
  readonly budgetHeadCode: string;
  readonly description: string;
  readonly allocatedMinor: string;
  readonly committedMinor: string;
  readonly awardedMinor: string;
  readonly remainingMinor: string;
  readonly utilizationPct: number;      // (awarded + committed) / allocated × 100
  readonly awardedPct: number;          // awarded / allocated × 100
  readonly projectedEOYMinor: string;   // extrapolated end-of-year spend using current run-rate
  readonly projectedOverrunMinor: string; // projectedEOY - allocated (positive = over budget)
  readonly riskLevel: 'ok' | 'watch' | 'warn' | 'critical';
}

export interface BurndownForFy {
  readonly fiscalYearId: string;
  readonly fiscalYearLabel: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly daysElapsed: number;
  readonly daysInYear: number;
  readonly elapsedPct: number;
  readonly rows: readonly BurndownRow[];
  readonly totals: {
    readonly allocatedMinor: string;
    readonly committedMinor: string;
    readonly awardedMinor: string;
    readonly remainingMinor: string;
    readonly utilizationPct: number;
  };
}

/**
 * Reconciles allocation vs commitment vs spend per budget head for a given
 * fiscal year, then extrapolates end-of-year spend using the current burn
 * rate. Risk tiers:
 *   - ok        : projected EOY ≤ 90 % of allocation
 *   - watch     : 90 – 100 %
 *   - warn      : 100 – 120 % (over budget on current trajectory)
 *   - critical  : > 120 %
 */
export async function loadBurndown(fiscalYearId: string): Promise<BurndownForFy | null> {
  const fy = await prisma.fiscalYear.findUnique({ where: { id: fiscalYearId } });
  if (!fy) return null;

  const now = Date.now();
  const startMs = fy.startsOn.getTime();
  const endMs = fy.endsOn.getTime();
  const daysInYear = Math.max(1, Math.round((endMs - startMs) / 86_400_000));
  const daysElapsedRaw = Math.round((Math.min(now, endMs) - startMs) / 86_400_000);
  const daysElapsed = Math.max(1, daysElapsedRaw);          // at least 1 to avoid div-by-zero
  const elapsedPct = Math.round((daysElapsed / daysInYear) * 100);

  const [allocations, prs, activeIndents, budgetHeads] = await Promise.all([
    prisma.budgetAllocation.findMany({
      where: { fiscalYearId },
      select: { budgetHeadId: true, allocated: true },
    }),
    prisma.purchaseRequisition.findMany({
      where: { cst: { itPerforma: { indent: { fiscalYearId } } } },
      select: { amount: true, cst: { select: { itPerforma: { select: { indent: { select: { budgetHeadId: true } } } } } } },
    }),
    prisma.indent.findMany({
      where: {
        fiscalYearId,
        status: { notIn: ['CLOSED', 'CANCELLED', 'INDENT_REJECTED', 'BUDGET_REJECTED'] as unknown as any[] },
      },
      select: { budgetHeadId: true, estimatedValue: true },
    }),
    prisma.budgetHead.findMany({ select: { id: true, code: true, description: true, isActive: true } }),
  ]);

  const headById = new Map(budgetHeads.map((b) => [b.id, b]));

  type Agg = { allocated: bigint; committed: bigint; awarded: bigint };
  const agg = new Map<string, Agg>();
  const ensure = (id: string): Agg => {
    const existing = agg.get(id);
    if (existing) return existing;
    const fresh: Agg = { allocated: 0n, committed: 0n, awarded: 0n };
    agg.set(id, fresh);
    return fresh;
  };
  for (const a of allocations) ensure(a.budgetHeadId).allocated += decimalToMinor(a.allocated as unknown as string);
  for (const i of activeIndents) ensure(i.budgetHeadId).committed += decimalToMinor(i.estimatedValue as unknown as string);
  for (const p of prs) {
    const headId = p.cst?.itPerforma?.indent?.budgetHeadId;
    if (!headId) continue;
    ensure(headId).awarded += decimalToMinor(p.amount as unknown as string);
  }

  const rows: BurndownRow[] = [];
  for (const [headId, v] of agg.entries()) {
    const head = headById.get(headId);
    if (!head) continue;
    const projectedEOY = v.awarded * BigInt(daysInYear) / BigInt(daysElapsed);
    const row = buildBurndownRow(head.code, head.description, v, projectedEOY);
    rows.push(row);
  }
  rows.sort((a, b) => {
    // Riskiest first.
    const order: Record<BurndownRow['riskLevel'], number> = { critical: 0, warn: 1, watch: 2, ok: 3 };
    const d = order[a.riskLevel] - order[b.riskLevel];
    if (d !== 0) return d;
    return Number(BigInt(b.allocatedMinor) - BigInt(a.allocatedMinor));
  });

  const totalsAgg: Agg = { allocated: 0n, committed: 0n, awarded: 0n };
  for (const v of agg.values()) {
    totalsAgg.allocated += v.allocated;
    totalsAgg.committed += v.committed;
    totalsAgg.awarded += v.awarded;
  }
  const totalRemaining = (totalsAgg.allocated - totalsAgg.committed - totalsAgg.awarded);
  const totalUtilPct = totalsAgg.allocated === 0n
    ? 0
    : Number(((totalsAgg.committed + totalsAgg.awarded) * 10_000n) / totalsAgg.allocated) / 100;

  return {
    fiscalYearId,
    fiscalYearLabel: fy.label,
    startsOn: fy.startsOn.toISOString().slice(0, 10),
    endsOn: fy.endsOn.toISOString().slice(0, 10),
    daysElapsed,
    daysInYear,
    elapsedPct,
    rows,
    totals: {
      allocatedMinor: totalsAgg.allocated.toString(),
      committedMinor: totalsAgg.committed.toString(),
      awardedMinor: totalsAgg.awarded.toString(),
      remainingMinor: totalRemaining.toString(),
      utilizationPct: Math.round(totalUtilPct * 10) / 10,
    },
  };
}

function buildBurndownRow(code: string, description: string, v: { allocated: bigint; committed: bigint; awarded: bigint }, projectedEOY: bigint): BurndownRow {
  const remaining = v.allocated - v.committed - v.awarded;
  const utilNumer = v.committed + v.awarded;
  const utilPct = v.allocated === 0n ? 0 : Number((utilNumer * 10_000n) / v.allocated) / 100;
  const awardedPct = v.allocated === 0n ? 0 : Number((v.awarded * 10_000n) / v.allocated) / 100;
  const overrun = projectedEOY - v.allocated;
  const projectedRatio = v.allocated === 0n ? 0 : Number((projectedEOY * 1000n) / v.allocated) / 1000;
  let riskLevel: BurndownRow['riskLevel'] = 'ok';
  if (projectedRatio > 1.2) riskLevel = 'critical';
  else if (projectedRatio > 1.0) riskLevel = 'warn';
  else if (projectedRatio > 0.9) riskLevel = 'watch';

  return {
    budgetHeadCode: code,
    description,
    allocatedMinor: v.allocated.toString(),
    committedMinor: v.committed.toString(),
    awardedMinor: v.awarded.toString(),
    remainingMinor: remaining.toString(),
    utilizationPct: Math.round(utilPct * 10) / 10,
    awardedPct: Math.round(awardedPct * 10) / 10,
    projectedEOYMinor: projectedEOY.toString(),
    projectedOverrunMinor: overrun.toString(),
    riskLevel,
  };
}
