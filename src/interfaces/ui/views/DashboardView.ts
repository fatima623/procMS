import { Role } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import type { AuthContext } from '@/application/ports/AuthContext';
import { decimalToMinor } from '@/infrastructure/common/decimal';

/**
 * Dashboard read model. Admin sections include analytics; everyone else sees
 * just their own role-relevant tiles.
 *
 * Admin queries now accept an optional `fiscalYearId` so the executive view
 * can compare across years without touching anyone else's experience.
 */

export interface DashboardSummary {
  readonly indentsMine: number;
  readonly indentsOwnedByMySection: number;
  readonly pendingApprovalsForMyRoles: number;
  readonly openObservationsAgainstMe: number;
  readonly tsrsActive: number;
  readonly firmInvitesOpen: number;
  readonly firmQueriesOpen: number;
  readonly firmPRsPending: number;

  readonly adminTotalIndents: number;
  readonly adminActiveIndents: number;
  readonly adminClosedIndents: number;
  readonly adminPendingApprovals: number;
  readonly adminTotalPipelineValueMinor: string;
  readonly adminAverageIndentValueMinor: string;
  readonly adminStatusBreakdown: readonly { readonly status: string; readonly count: number }[];
  readonly adminRecentIndents: readonly {
    readonly id: string;
    readonly indentNumber: string;
    readonly subject: string;
    readonly status: string;
    readonly valueMinor: string;
    readonly currency: string;
  }[];
  readonly adminTopIndents: readonly {
    readonly id: string;
    readonly indentNumber: string;
    readonly subject: string;
    readonly status: string;
    readonly valueMinor: string;
    readonly currency: string;
  }[];
  readonly adminPriorityBreakdown: readonly { readonly priority: string; readonly count: number; readonly valueMinor: string }[];
  readonly adminFirmStats: {
    readonly total: number;
    readonly active: number;
    readonly inactive: number;
    readonly blacklisted: number;
    readonly needsVerification: number;
  };

  readonly adminAnalytics: {
    readonly cycleTime: { readonly avgDays: number; readonly medianDays: number; readonly sampleSize: number };
    readonly bottlenecks: readonly { readonly status: string; readonly count: number; readonly avgAgeDays: number }[];
    readonly chainVelocity: readonly { readonly role: string; readonly avgHours: number; readonly decisions: number }[];
    readonly budgetUtilization: readonly {
      readonly budgetHeadCode: string;
      readonly description: string;
      readonly indentCount: number;
      readonly committedMinor: string;
      readonly awardedMinor: string;
    }[];
    readonly monthlyTrend: readonly { readonly label: string; readonly count: number; readonly valueMinor: string }[];
    readonly rejectionStats: { readonly rejected: number; readonly cancelled: number; readonly byStage: readonly { readonly status: string; readonly count: number }[] };
    readonly sla: {
      readonly withinSla: number;
      readonly breached: number;
      readonly samples: number;
      readonly breaches: readonly {
        readonly indentId: string;
        readonly indentNumber: string;
        readonly subject: string;
        readonly priority: string;
        readonly ageDays: number;
        readonly slaDays: number;
        readonly overBy: number;
      }[];
    };
    readonly pareto: readonly {
      readonly firmId: string;
      readonly firmName: string;
      readonly awardedMinor: string;
      readonly prCount: number;
      readonly cumulativePct: number;
    }[];
    readonly heatmap: readonly {
      readonly role: string;
      readonly cells: readonly { readonly subject: string; readonly decisions: number; readonly medianHours: number }[];
    }[];
    readonly compliance: readonly {
      readonly id: string;
      readonly severity: 'low' | 'medium' | 'high';
      readonly title: string;
      readonly detail: string;
      readonly count: number;
      readonly href?: string;
    }[];
  };

  readonly fiscalYears: readonly { readonly id: string; readonly label: string; readonly isActive: boolean }[];
  readonly selectedFiscalYearId: string | null;
}

export interface DashboardOpts {
  readonly fiscalYearId?: string;
}

/** Target cycle-time (submit→close) in days, by priority. */
export const SLA_DAYS: Record<string, number> = { URGENT: 14, HIGH: 30, NORMAL: 60, LOW: 90 };

export async function loadDashboardSummary(ctx: AuthContext, opts: DashboardOpts = {}): Promise<DashboardSummary> {
  const isAdmin = ctx.roles.includes(Role.ADMIN);
  const fyFilter = opts.fiscalYearId ? { fiscalYearId: opts.fiscalYearId } : {};

  const [indentsMine, indentsOwnedByMySection, pendingApprovalsForMyRoles, openObservationsAgainstMe, tsrsActive, firmInvitesOpen, firmQueriesOpen, firmPRsPending] =
    await Promise.all([
      ctx.roles.includes(Role.INDENTER) || isAdmin
        ? prisma.indent.count({ where: { indenterId: ctx.userId, ...fyFilter } })
        : 0,
      ctx.sectionIds.length
        ? prisma.indent.count({ where: { OR: [{ sectionId: { in: [...ctx.sectionIds] } }, { assignedAdpId: { in: [...ctx.sectionIds] } }], ...fyFilter } })
        : 0,
      prisma.approvalStep.count({
        where: {
          status: 'PENDING',
          role: { in: ctx.roles as unknown as any[] },
          chain: { status: 'PENDING' },
        },
      }),
      ctx.roles.includes(Role.INDENTER)
        ? prisma.observation.count({ where: { status: 'OPEN', indent: { indenterId: ctx.userId } } })
        : 0,
      ctx.roles.includes(Role.INSPECTORATE) || isAdmin
        ? prisma.technicalScrutinyReport.count({ where: { status: { in: ['DRAFT', 'SUBMITTED', 'QUERIES_RAISED'] } } })
        : 0,
      ctx.firmId ? prisma.iTFirmInvite.count({ where: { firmId: ctx.firmId, itPerforma: { status: 'DISPATCHED' } } }) : 0,
      ctx.firmId ? prisma.tSRQuery.count({ where: { firmId: ctx.firmId, status: 'OPEN' } }) : 0,
      ctx.firmId ? prisma.purchaseRequisition.count({ where: { firmId: ctx.firmId, status: 'SENT' } }) : 0,
    ]);

  let adminTotalIndents = 0;
  let adminActiveIndents = 0;
  let adminClosedIndents = 0;
  let adminPendingApprovals = 0;
  let adminTotalPipelineValueMinor = '0';
  let adminAverageIndentValueMinor = '0';
  let adminStatusBreakdown: { status: string; count: number }[] = [];
  let adminRecentIndents: DashboardSummary['adminRecentIndents'] = [];
  let adminTopIndents: DashboardSummary['adminTopIndents'] = [];
  let adminPriorityBreakdown: DashboardSummary['adminPriorityBreakdown'] = [];
  let adminFirmStats: DashboardSummary['adminFirmStats'] = { total: 0, active: 0, inactive: 0, blacklisted: 0, needsVerification: 0 };
  let adminAnalytics: DashboardSummary['adminAnalytics'] = {
    cycleTime: { avgDays: 0, medianDays: 0, sampleSize: 0 },
    bottlenecks: [], chainVelocity: [], budgetUtilization: [], monthlyTrend: [],
    rejectionStats: { rejected: 0, cancelled: 0, byStage: [] },
    sla: { withinSla: 0, breached: 0, samples: 0, breaches: [] },
    pareto: [], heatmap: [], compliance: [],
  };

  const fiscalYears = await prisma.fiscalYear.findMany({
    orderBy: { startsOn: 'desc' },
    select: { id: true, label: true, isActive: true },
  });
  const selectedFiscalYearId = opts.fiscalYearId ?? fiscalYears.find((f) => f.isActive)?.id ?? null;

  if (isAdmin) {
    const CLOSED_STATES = ['CLOSED', 'CANCELLED', 'INDENT_REJECTED', 'BUDGET_REJECTED'] as const;
    const fyWhere = selectedFiscalYearId ? { fiscalYearId: selectedFiscalYearId } : {};

    const [total, closed, pending, grouped, recent, activePipeline, topRows, firmTotal, firmActive, firmInactive, firmBlacklisted, firmNoNtn, firmWithOffers] =
      await Promise.all([
        prisma.indent.count({ where: fyWhere }),
        prisma.indent.count({ where: { ...fyWhere, status: { in: CLOSED_STATES as unknown as any[] } } }),
        prisma.approvalStep.count({ where: { status: 'PENDING', chain: { status: 'PENDING' } } }),
        prisma.indent.groupBy({ by: ['status'], _count: { _all: true }, where: fyWhere, orderBy: { _count: { id: 'desc' } } }),
        prisma.indent.findMany({
          where: fyWhere,
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: { id: true, indentNumber: true, subject: true, status: true, estimatedValue: true, currency: true },
        }),
        prisma.indent.findMany({
          where: { ...fyWhere, status: { notIn: CLOSED_STATES as unknown as any[] } },
          select: { id: true, indentNumber: true, subject: true, estimatedValue: true, priority: true, submittedAt: true, updatedAt: true, status: true },
        }),
        prisma.indent.findMany({
          where: { ...fyWhere, status: { notIn: CLOSED_STATES as unknown as any[] } },
          orderBy: { estimatedValue: 'desc' },
          take: 5,
          select: { id: true, indentNumber: true, subject: true, status: true, estimatedValue: true, currency: true },
        }),
        prisma.firm.count(),
        prisma.firm.count({ where: { isActive: true, isBlacklisted: false } }),
        prisma.firm.count({ where: { isActive: false, isBlacklisted: false } }),
        prisma.firm.count({ where: { isBlacklisted: true } }),
        prisma.firm.count({ where: { isActive: true, isBlacklisted: false, OR: [{ ntn: null }, { ntn: '' }] } }),
        prisma.firm.findMany({
          where: { isActive: true, isBlacklisted: false },
          select: { id: true, _count: { select: { technicalOffers: true, commercialOffers: true } } },
        }),
      ]);

    adminTotalIndents = total;
    adminClosedIndents = closed;
    adminActiveIndents = total - closed;
    adminPendingApprovals = pending;
    adminStatusBreakdown = grouped.map((g) => ({ status: g.status, count: g._count._all }));
    adminRecentIndents = recent.map((r) => ({
      id: r.id, indentNumber: r.indentNumber, subject: r.subject, status: r.status,
      valueMinor: decimalToMinor(r.estimatedValue as unknown as string).toString(),
      currency: r.currency,
    }));
    adminTopIndents = topRows.map((r) => ({
      id: r.id, indentNumber: r.indentNumber, subject: r.subject, status: r.status,
      valueMinor: decimalToMinor(r.estimatedValue as unknown as string).toString(),
      currency: r.currency,
    }));

    const totalPipelineMinor = activePipeline.reduce((acc, i) => acc + decimalToMinor(i.estimatedValue as unknown as string), 0n);
    adminTotalPipelineValueMinor = totalPipelineMinor.toString();
    adminAverageIndentValueMinor = adminActiveIndents > 0
      ? (totalPipelineMinor / BigInt(adminActiveIndents)).toString()
      : '0';

    const priorityMap = new Map<string, { count: number; valueMinor: bigint }>();
    for (const i of activePipeline) {
      const key = i.priority as string;
      const prev = priorityMap.get(key) ?? { count: 0, valueMinor: 0n };
      prev.count += 1;
      prev.valueMinor += decimalToMinor(i.estimatedValue as unknown as string);
      priorityMap.set(key, prev);
    }
    const PRIORITY_ORDER = ['URGENT', 'HIGH', 'NORMAL', 'LOW'];
    adminPriorityBreakdown = PRIORITY_ORDER
      .filter((p) => priorityMap.has(p))
      .map((p) => ({ priority: p, count: priorityMap.get(p)!.count, valueMinor: priorityMap.get(p)!.valueMinor.toString() }));

    const firmsWithoutActivity = firmWithOffers.filter((f) => f._count.technicalOffers === 0 && f._count.commercialOffers === 0).length;
    adminFirmStats = {
      total: firmTotal, active: firmActive, inactive: firmInactive, blacklisted: firmBlacklisted,
      needsVerification: Math.max(firmNoNtn, firmsWithoutActivity),
    };

    adminAnalytics = await loadAdminAnalytics(CLOSED_STATES, selectedFiscalYearId, activePipeline);
  }

  return {
    indentsMine, indentsOwnedByMySection, pendingApprovalsForMyRoles, openObservationsAgainstMe,
    tsrsActive, firmInvitesOpen, firmQueriesOpen, firmPRsPending,
    adminTotalIndents, adminActiveIndents, adminClosedIndents, adminPendingApprovals,
    adminTotalPipelineValueMinor, adminAverageIndentValueMinor,
    adminStatusBreakdown, adminRecentIndents, adminTopIndents, adminPriorityBreakdown,
    adminFirmStats, adminAnalytics,
    fiscalYears, selectedFiscalYearId,
  };
}

async function loadAdminAnalytics(
  closedStates: readonly string[],
  fiscalYearId: string | null,
  activePipelineRows: readonly { id: string; indentNumber: string; subject: string; estimatedValue: unknown; priority: string; submittedAt: Date | null; updatedAt: Date; status: string }[],
): Promise<DashboardSummary['adminAnalytics']> {
  const now = Date.now();
  const DAY_MS = 86_400_000;
  const fyWhere = fiscalYearId ? { fiscalYearId } : {};

  // --- Cycle time: submitted → closedAt for CLOSED indents in the selected FY.
  const closedForCycle = await prisma.indent.findMany({
    where: { ...fyWhere, status: 'CLOSED', submittedAt: { not: null }, closedAt: { not: null } },
    select: { submittedAt: true, closedAt: true },
  });
  const cycleDays = closedForCycle
    .map((r) => (r.closedAt!.getTime() - r.submittedAt!.getTime()) / DAY_MS)
    .filter((n) => n >= 0)
    .sort((a, b) => a - b);
  const cycleTime = cycleDays.length === 0
    ? { avgDays: 0, medianDays: 0, sampleSize: 0 }
    : {
        avgDays: round(cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length),
        medianDays: round(cycleDays[Math.floor(cycleDays.length / 2)]!),
        sampleSize: cycleDays.length,
      };

  // --- Bottlenecks: proxy = (now - updatedAt) per active status.
  const bucket = new Map<string, number[]>();
  for (const r of activePipelineRows) {
    const ageDays = (now - r.updatedAt.getTime()) / DAY_MS;
    (bucket.get(r.status) ?? bucket.set(r.status, []).get(r.status)!).push(ageDays);
  }
  const bottlenecks = [...bucket.entries()]
    .map(([status, ages]) => ({ status, count: ages.length, avgAgeDays: round(ages.reduce((a, b) => a + b, 0) / ages.length) }))
    .sort((a, b) => b.avgAgeDays - a.avgAgeDays)
    .slice(0, 8);

  // --- Chain velocity by role (across all time; FY filter wouldn't meaningfully narrow).
  const decidedSteps = await prisma.approvalStep.findMany({
    where: { status: { in: ['APPROVED', 'REJECTED', 'RETURNED'] }, decidedAt: { not: null } },
    include: { chain: { select: { createdAt: true, subject: true } } },
    orderBy: [{ chainId: 'asc' }, { stepIndex: 'asc' }],
  });
  const byRole = new Map<string, number[]>();
  let lastChainId: string | null = null;
  let lastDecidedAt: Date | null = null;
  for (const s of decidedSteps) {
    if (s.chainId !== lastChainId) { lastChainId = s.chainId; lastDecidedAt = null; }
    const from = (lastDecidedAt ?? s.chain.createdAt).getTime();
    const hours = (s.decidedAt!.getTime() - from) / 3_600_000;
    if (hours >= 0) (byRole.get(s.role) ?? byRole.set(s.role, []).get(s.role)!).push(hours);
    lastDecidedAt = s.decidedAt!;
  }
  const chainVelocity = [...byRole.entries()]
    .map(([role, hrs]) => ({ role, avgHours: round(hrs.reduce((a, b) => a + b, 0) / hrs.length, 1), decisions: hrs.length }))
    .sort((a, b) => b.decisions - a.decisions);

  // --- Approval heatmap: role × subject, median hours + count.
  const cellMap = new Map<string, Map<string, number[]>>(); // role → subject → [hours]
  lastChainId = null;
  lastDecidedAt = null;
  for (const s of decidedSteps) {
    if (s.chainId !== lastChainId) { lastChainId = s.chainId; lastDecidedAt = null; }
    const from = (lastDecidedAt ?? s.chain.createdAt).getTime();
    const hours = (s.decidedAt!.getTime() - from) / 3_600_000;
    if (hours >= 0) {
      const rolemap = cellMap.get(s.role) ?? cellMap.set(s.role, new Map()).get(s.role)!;
      const subj = s.chain.subject as string;
      (rolemap.get(subj) ?? rolemap.set(subj, []).get(subj)!).push(hours);
    }
    lastDecidedAt = s.decidedAt!;
  }
  const SUBJECTS = ['INDENT', 'IT_PROFORMA', 'CST'];
  const ROLE_ORDER = ['AD', 'DD', 'DP_N', 'DGDP', 'SECY_DP', 'SUPTD', 'CPO'];
  const heatmap = ROLE_ORDER
    .filter((r) => cellMap.has(r))
    .map((role) => ({
      role,
      cells: SUBJECTS.map((subject) => {
        const arr = cellMap.get(role)?.get(subject) ?? [];
        if (arr.length === 0) return { subject, decisions: 0, medianHours: 0 };
        const sorted = [...arr].sort((a, b) => a - b);
        return { subject, decisions: arr.length, medianHours: round(sorted[Math.floor(sorted.length / 2)]!, 1) };
      }),
    }));

  // --- Budget utilization scoped to the FY.
  const activeByHead = await prisma.indent.findMany({
    where: { ...fyWhere, status: { notIn: closedStates as unknown as any[] } },
    select: { budgetHeadId: true, estimatedValue: true },
  });
  const prsWithHead = await prisma.purchaseRequisition.findMany({
    select: { amount: true, cst: { select: { itPerforma: { select: { indent: { select: { budgetHeadId: true, fiscalYearId: true } } } } } } },
  });
  const bhHeaders = await prisma.budgetHead.findMany({ select: { id: true, code: true, description: true } });
  const bhById = new Map(bhHeaders.map((b) => [b.id, b]));
  const bhStats = new Map<string, { count: number; committed: bigint; awarded: bigint }>();
  for (const i of activeByHead) {
    const prev = bhStats.get(i.budgetHeadId) ?? { count: 0, committed: 0n, awarded: 0n };
    prev.count += 1;
    prev.committed += decimalToMinor(i.estimatedValue as unknown as string);
    bhStats.set(i.budgetHeadId, prev);
  }
  for (const p of prsWithHead) {
    const indent = p.cst?.itPerforma?.indent;
    if (!indent) continue;
    if (fiscalYearId && indent.fiscalYearId !== fiscalYearId) continue;
    const prev = bhStats.get(indent.budgetHeadId) ?? { count: 0, committed: 0n, awarded: 0n };
    prev.awarded += decimalToMinor(p.amount as unknown as string);
    bhStats.set(indent.budgetHeadId, prev);
  }
  const budgetUtilization = [...bhStats.entries()]
    .map(([id, v]) => ({
      budgetHeadCode: bhById.get(id)?.code ?? '—',
      description: bhById.get(id)?.description ?? '',
      indentCount: v.count,
      committedMinor: v.committed.toString(),
      awardedMinor: v.awarded.toString(),
    }))
    .sort((a, b) => Number(BigInt(b.committedMinor) - BigInt(a.committedMinor)))
    .slice(0, 10);

  // --- Monthly trend (last 6 months regardless of FY — the executive wants momentum).
  const trendStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 5, 1));
  const monthlyRows = await prisma.indent.findMany({
    where: { createdAt: { gte: trendStart } },
    select: { createdAt: true, estimatedValue: true },
  });
  const monthMap = new Map<string, { count: number; value: bigint }>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(Date.UTC(trendStart.getUTCFullYear(), trendStart.getUTCMonth() + i, 1));
    monthMap.set(monthKey(d), { count: 0, value: 0n });
  }
  for (const r of monthlyRows) {
    const key = monthKey(r.createdAt);
    const prev = monthMap.get(key) ?? { count: 0, value: 0n };
    prev.count += 1;
    prev.value += decimalToMinor(r.estimatedValue as unknown as string);
    monthMap.set(key, prev);
  }
  const monthlyTrend = [...monthMap.entries()].map(([label, v]) => ({ label, count: v.count, valueMinor: v.value.toString() }));

  // --- Rejection stats (FY-scoped).
  const [rejected, cancelled, byStage] = await Promise.all([
    prisma.indent.count({ where: { ...fyWhere, status: { in: ['INDENT_REJECTED', 'BUDGET_REJECTED'] } } }),
    prisma.indent.count({ where: { ...fyWhere, status: 'CANCELLED' } }),
    prisma.indent.groupBy({
      by: ['status'], _count: { _all: true },
      where: { ...fyWhere, status: { in: ['INDENT_REJECTED', 'BUDGET_REJECTED', 'CANCELLED'] } },
    }),
  ]);
  const rejectionStats = { rejected, cancelled, byStage: byStage.map((g) => ({ status: g.status, count: g._count._all })) };

  // --- SLA tracker: for each active indent compare age vs priority target.
  const slaSamples: Array<{ row: typeof activePipelineRows[number]; ageDays: number; slaDays: number }> = [];
  for (const r of activePipelineRows) {
    if (!r.submittedAt) continue;
    const ageDays = (now - r.submittedAt.getTime()) / DAY_MS;
    const slaDays = SLA_DAYS[r.priority] ?? SLA_DAYS.NORMAL!;
    slaSamples.push({ row: r, ageDays, slaDays });
  }
  const breachedList = slaSamples
    .filter((s) => s.ageDays > s.slaDays)
    .sort((a, b) => (b.ageDays - b.slaDays) - (a.ageDays - a.slaDays))
    .slice(0, 10);
  const sla = {
    withinSla: slaSamples.filter((s) => s.ageDays <= s.slaDays).length,
    breached: slaSamples.filter((s) => s.ageDays > s.slaDays).length,
    samples: slaSamples.length,
    breaches: breachedList.map((s) => ({
      indentId: s.row.id,
      indentNumber: s.row.indentNumber,
      subject: s.row.subject,
      priority: s.row.priority,
      ageDays: round(s.ageDays),
      slaDays: s.slaDays,
      overBy: round(s.ageDays - s.slaDays),
    })),
  };

  // --- Pareto: PRs grouped by firm, scoped to FY if set.
  const paretoRows = await prisma.purchaseRequisition.findMany({
    select: {
      amount: true, firmId: true,
      firm: { select: { name: true } },
      cst: { select: { itPerforma: { select: { indent: { select: { fiscalYearId: true } } } } } },
    },
  });
  const firmAgg = new Map<string, { name: string; awardedMinor: bigint; prCount: number }>();
  for (const p of paretoRows) {
    if (fiscalYearId && p.cst?.itPerforma?.indent?.fiscalYearId !== fiscalYearId) continue;
    const prev = firmAgg.get(p.firmId) ?? { name: p.firm.name, awardedMinor: 0n, prCount: 0 };
    prev.awardedMinor += decimalToMinor(p.amount as unknown as string);
    prev.prCount += 1;
    firmAgg.set(p.firmId, prev);
  }
  const paretoSorted = [...firmAgg.entries()]
    .map(([id, v]) => ({ firmId: id, firmName: v.name, awardedMinor: v.awardedMinor, prCount: v.prCount }))
    .sort((a, b) => Number(b.awardedMinor - a.awardedMinor));
  const grandTotal = paretoSorted.reduce((acc, p) => acc + p.awardedMinor, 0n);
  let running = 0n;
  const pareto = paretoSorted.slice(0, 10).map((p) => {
    running += p.awardedMinor;
    const pct = grandTotal === 0n ? 0 : Number((running * 10_000n) / grandTotal) / 100;
    return {
      firmId: p.firmId, firmName: p.firmName,
      awardedMinor: p.awardedMinor.toString(),
      prCount: p.prCount,
      cumulativePct: round(pct, 1),
    };
  });

  // --- Compliance / needs-attention.
  const [staleObs, firmsNoNtn, sittingLong, chainsOld] = await Promise.all([
    prisma.observation.count({ where: { status: 'OPEN', createdAt: { lte: new Date(now - 7 * DAY_MS) } } }),
    prisma.firm.count({ where: { isActive: true, isBlacklisted: false, OR: [{ ntn: null }, { ntn: '' }] } }),
    prisma.indent.count({
      where: {
        status: { in: ['BUDGET_CHECK', 'COORD_VETTING', 'ADP_VETTING', 'ADP_OBSERVED', 'SUPTD_VETTING', 'IT_PREPARATION', 'CST_PREPARATION'] as unknown as any[] },
        updatedAt: { lte: new Date(now - 14 * DAY_MS) },
      },
    }),
    prisma.approvalChain.count({
      where: { status: 'PENDING', createdAt: { lte: new Date(now - 10 * DAY_MS) } },
    }),
  ]);
  type ComplianceItem = DashboardSummary['adminAnalytics']['compliance'][number];
  const compliance: ComplianceItem[] = [];
  if (staleObs > 0) compliance.push({ id: 'stale-obs', severity: 'medium', title: 'Observations open > 7 days', count: staleObs, detail: 'Indenters have had a week or more to resolve ADP observations.', href: '/indents?status=ADP_OBSERVED' });
  if (firmsNoNtn > 0) compliance.push({ id: 'no-ntn', severity: 'medium', title: 'Firms without an NTN', count: firmsNoNtn, detail: 'Add NTNs so these firms can be invited to tender.', href: '/admin/firms' });
  if (sittingLong > 0) compliance.push({ id: 'stale-stage', severity: 'high', title: 'Indents stuck > 14 days in a vetting/prep stage', count: sittingLong, detail: 'These haven\'t advanced in two weeks. Section staff should chase or escalate.' });
  if (chainsOld > 0) compliance.push({ id: 'old-chains', severity: 'high', title: 'Approval chains pending > 10 days', count: chainsOld, detail: 'Chain owners should either decide or reassign.', href: '/approvals' });
  if (sla.breached > 0) compliance.push({ id: 'sla-breach', severity: 'high', title: 'Active indents past SLA target', count: sla.breached, detail: 'See the SLA tracker for the top breaches by priority.' });

  return { cycleTime, bottlenecks, chainVelocity, budgetUtilization, monthlyTrend, rejectionStats, sla, pareto, heatmap, compliance };
}

function round(n: number, digits = 1): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
