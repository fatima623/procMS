import {
  AppealStatus,
  BlacklistStatus,
  GrievanceStatus,
  IndentStatus,
  MisprocurementStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import type { ReportDocData } from '@/infrastructure/docgen/templates';

/**
 * Reporting Phase 1 (v4.4.1 §6.1, Z9): five pre-built, read-only reports over
 * existing tables. Money totals are summed in the DB (groupBy _sum) or with
 * Prisma.Decimal — never with JS floating point. Charts get plain numbers
 * for drawing only (toChartNumber); tables and exports use the exact strings.
 */

export const REPORT_SLUGS = [
  'indent-pipeline',
  'contract-awards',
  'compliance-snapshot',
  'budget-utilisation',
  'firm-participation',
] as const;
export type ReportSlug = (typeof REPORT_SLUGS)[number];

export function isReportSlug(s: string): s is ReportSlug {
  return (REPORT_SLUGS as readonly string[]).includes(s);
}

// --- pure helpers (unit-tested) -------------------------------------------------

type DecimalLike = Prisma.Decimal | string | number;

/** 1234567.5 → "1,234,567.50" (2 decimals, half-up, exact decimal arithmetic). */
export function formatDecimal2(value: DecimalLike | null | undefined): string {
  const fixed = new Prisma.Decimal(value ?? 0).toFixed(2);
  const negative = fixed.startsWith('-');
  const [whole, frac] = (negative ? fixed.slice(1) : fixed).split('.');
  return `${negative ? '-' : ''}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${frac}`;
}

/** Exact sum of Decimal values. */
export function sumDecimals(values: readonly DecimalLike[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>((acc, v) => acc.plus(new Prisma.Decimal(v)), new Prisma.Decimal(0));
}

/** spent ÷ allocated as "42.5%"; "—" when nothing is allocated. */
export function percentSpent(spent: DecimalLike, allocated: DecimalLike): string {
  const a = new Prisma.Decimal(allocated);
  if (a.isZero()) return '—';
  return `${new Prisma.Decimal(spent).div(a).times(100).toFixed(1)}%`;
}

/** Chart drawing only — never used for totals. */
export function toChartNumber(value: DecimalLike | null | undefined): number {
  return Number(new Prisma.Decimal(value ?? 0).toFixed(2));
}

export const UNDATED = 'undated';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-01" (UTC), or "undated". Sorts chronologically as a string. */
export function monthKey(d: Date | null | undefined): string {
  if (!d) return UNDATED;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** "2026-01" → "Jan 2026"; "undated" → "Undated". */
export function monthLabel(key: string): string {
  if (key === UNDATED) return 'Undated';
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

/** Sort month keys chronologically with "undated" last. */
export function compareMonthKeys(a: string, b: string): number {
  if (a === b) return 0;
  if (a === UNDATED) return 1;
  if (b === UNDATED) return -1;
  return a < b ? -1 : 1;
}

// --- filters --------------------------------------------------------------------

export interface ReportFilters {
  /** Absent = report default; "all" = every year (budget report). */
  readonly fiscalYearId?: string;
  readonly sectionId?: string;
  readonly firmId?: string;
}

export function parseReportFilters(get: (key: string) => string | null | undefined): ReportFilters {
  const pick = (k: string) => {
    const v = get(k)?.trim();
    return v ? v.slice(0, 26) : undefined;
  };
  return { fiscalYearId: pick('fiscalYearId'), sectionId: pick('sectionId'), firmId: pick('firmId') };
}

/** Query string for the export link, e.g. "fiscalYearId=…&firmId=…" (no leading "?"). */
export function filterQuery(f: ReportFilters): string {
  const p = new URLSearchParams();
  if (f.fiscalYearId) p.set('fiscalYearId', f.fiscalYearId);
  if (f.sectionId) p.set('sectionId', f.sectionId);
  if (f.firmId) p.set('firmId', f.firmId);
  return p.toString();
}

const fyWhere = (fiscalYearId?: string) => (fiscalYearId && fiscalYearId !== 'all' ? fiscalYearId : undefined);

export async function listReportFiscalYears(): Promise<readonly { id: string; label: string; isActive: boolean }[]> {
  return prisma.fiscalYear.findMany({ orderBy: { startsOn: 'desc' }, select: { id: true, label: true, isActive: true } });
}

export async function listReportSections(): Promise<readonly { id: string; label: string }[]> {
  const rows = await prisma.section.findMany({ where: { isActive: true }, orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } });
  return rows.map((r) => ({ id: r.id, label: `${r.code} — ${r.name}` }));
}

export async function listReportFirms(): Promise<readonly { id: string; label: string }[]> {
  const rows = await prisma.firm.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });
  return rows.map((r) => ({ id: r.id, label: r.name }));
}

// --- 1. Indent Pipeline -----------------------------------------------------------

export interface IndentPipelineReport {
  readonly rows: readonly { status: string; count: number }[];
  readonly total: number;
}

export async function indentPipeline(f: ReportFilters): Promise<IndentPipelineReport> {
  const groups = await prisma.indent.groupBy({
    by: ['status'],
    where: { fiscalYearId: fyWhere(f.fiscalYearId), sectionId: f.sectionId },
    _count: { _all: true },
  });
  const counts = new Map(groups.map((g) => [g.status, g._count._all]));
  const rows = Object.values(IndentStatus).map((status) => ({ status, count: counts.get(status) ?? 0 }));
  return { rows, total: rows.reduce((n, r) => n + r.count, 0) };
}

// --- 2. Contract Awards -------------------------------------------------------------

export interface ContractAwardsReport {
  /** One row per (month, currency), chronological, "Undated" last. */
  readonly byMonth: readonly { monthKey: string; month: string; currency: string; count: number; total: string }[];
  /** Contract count per month across currencies (for the chart). */
  readonly monthCounts: readonly { month: string; count: number }[];
  readonly byFirm: readonly { firmName: string; currency: string; count: number; total: string }[];
  readonly totals: readonly { currency: string; count: number; total: string }[];
}

export async function contractAwards(f: ReportFilters): Promise<ContractAwardsReport> {
  const rows = await prisma.contract.findMany({
    where: { firmId: f.firmId, ...(fyWhere(f.fiscalYearId) ? { indent: { fiscalYearId: fyWhere(f.fiscalYearId) } } : {}) },
    select: { awardedOn: true, signedOn: true, value: true, currency: true, firm: { select: { name: true } } },
  });

  type Acc = { count: number; values: Prisma.Decimal[] };
  const add = (m: Map<string, Acc>, key: string, v: Prisma.Decimal) => {
    const a = m.get(key) ?? { count: 0, values: [] };
    a.count += 1;
    a.values.push(v);
    m.set(key, a);
  };
  const month = new Map<string, Acc>();
  const firm = new Map<string, Acc>();
  const cur = new Map<string, Acc>();
  const monthOnly = new Map<string, number>();
  for (const r of rows) {
    const mk = monthKey(r.awardedOn ?? r.signedOn);
    add(month, `${mk}|${r.currency}`, r.value);
    add(firm, `${r.firm.name}|${r.currency}`, r.value);
    add(cur, r.currency, r.value);
    monthOnly.set(mk, (monthOnly.get(mk) ?? 0) + 1);
  }

  const byMonth = [...month.entries()]
    .map(([k, a]) => {
      const [mk, currency] = k.split('|');
      return { monthKey: mk, month: monthLabel(mk), currency, count: a.count, total: formatDecimal2(sumDecimals(a.values)) };
    })
    .sort((x, y) => compareMonthKeys(x.monthKey, y.monthKey) || x.currency.localeCompare(y.currency));
  const monthCounts = [...monthOnly.entries()]
    .sort(([a], [b]) => compareMonthKeys(a, b))
    .map(([mk, count]) => ({ month: monthLabel(mk), count }));
  const byFirm = [...firm.entries()]
    .map(([k, a]) => {
      const [firmName, currency] = k.split('|');
      return { firmName, currency, count: a.count, total: formatDecimal2(sumDecimals(a.values)) };
    })
    .sort((x, y) => y.count - x.count || x.firmName.localeCompare(y.firmName));
  const totals = [...cur.entries()]
    .map(([currency, a]) => ({ currency, count: a.count, total: formatDecimal2(sumDecimals(a.values)) }))
    .sort((x, y) => x.currency.localeCompare(y.currency));
  return { byMonth, monthCounts, byFirm, totals };
}

// --- 3. Compliance Snapshot ----------------------------------------------------------

export interface ComplianceSnapshotReport {
  readonly cards: readonly { label: string; count: number; note: string }[];
  readonly breakdown: readonly { area: string; status: string; count: number }[];
}

export async function complianceSnapshot(): Promise<ComplianceSnapshotReport> {
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [grievances, appeals, blacklists, incidents, activeBlacklists] = await Promise.all([
    prisma.grievance.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.appeal.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.blacklist.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.misprocurementIncident.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.blacklist.count({
      where: { status: BlacklistStatus.ACTIVE, OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: todayUtc } }] },
    }),
  ]);
  const expand = <S extends string>(area: string, all: readonly S[], groups: readonly { status: S; _count: { _all: number } }[]) => {
    const m = new Map(groups.map((g) => [g.status, g._count._all]));
    return all.map((status) => ({ area, status, count: m.get(status) ?? 0 }));
  };
  const g = expand('Grievances', Object.values(GrievanceStatus), grievances);
  const a = expand('Appeals', Object.values(AppealStatus), appeals);
  const b = expand('Blacklists', Object.values(BlacklistStatus), blacklists);
  const i = expand('Misprocurement incidents', Object.values(MisprocurementStatus), incidents);
  const pick = (rows: readonly { status: string; count: number }[], status: string) => rows.find((r) => r.status === status)?.count ?? 0;

  return {
    cards: [
      { label: 'Open grievances', count: pick(g, GrievanceStatus.PENDING), note: 'Status PENDING' },
      { label: 'Open appeals', count: pick(a, AppealStatus.PENDING), note: 'Status PENDING' },
      { label: 'Active blacklists', count: activeBlacklists, note: 'ACTIVE and not past effective-until' },
      { label: 'Open misprocurement incidents', count: pick(i, MisprocurementStatus.OPEN), note: 'Status OPEN' },
    ],
    breakdown: [...g, ...a, ...b, ...i],
  };
}

// --- 4. Budget Utilisation ------------------------------------------------------------

export interface BudgetUtilisationReport {
  readonly fiscalYearLabel: string;
  readonly rows: readonly {
    code: string;
    description: string;
    currency: string;
    allocated: string;
    reserved: string;
    spent: string;
    percentSpent: string;
    chart: { allocated: number; reserved: number; spent: number };
  }[];
}

/** Budget defaults to the ACTIVE fiscal year (summing years is meaningless); "all" = every year. */
export async function resolveBudgetFiscalYear(f: ReportFilters): Promise<{ id: string | undefined; label: string }> {
  if (f.fiscalYearId === 'all') return { id: undefined, label: 'All years' };
  const fy = f.fiscalYearId
    ? await prisma.fiscalYear.findUnique({ where: { id: f.fiscalYearId }, select: { id: true, label: true } })
    : await prisma.fiscalYear.findFirst({ where: { isActive: true }, select: { id: true, label: true } });
  return fy ? { id: fy.id, label: fy.label } : { id: undefined, label: 'All years' };
}

export async function budgetUtilisation(f: ReportFilters): Promise<BudgetUtilisationReport> {
  const fy = await resolveBudgetFiscalYear(f);
  const groups = await prisma.budgetAllocation.groupBy({
    by: ['budgetHeadId', 'currency'],
    where: { fiscalYearId: fy.id },
    _sum: { allocated: true, reserved: true, spent: true },
  });
  const heads = await prisma.budgetHead.findMany({
    where: { id: { in: [...new Set(groups.map((x) => x.budgetHeadId))] } },
    select: { id: true, code: true, description: true },
  });
  const headById = new Map(heads.map((h) => [h.id, h]));
  const rows = groups
    .map((x) => {
      const allocated = x._sum.allocated ?? new Prisma.Decimal(0);
      const reserved = x._sum.reserved ?? new Prisma.Decimal(0);
      const spent = x._sum.spent ?? new Prisma.Decimal(0);
      const head = headById.get(x.budgetHeadId);
      return {
        code: head?.code ?? x.budgetHeadId,
        description: head?.description ?? '',
        currency: x.currency,
        allocated: formatDecimal2(allocated),
        reserved: formatDecimal2(reserved),
        spent: formatDecimal2(spent),
        percentSpent: percentSpent(spent, allocated),
        chart: { allocated: toChartNumber(allocated), reserved: toChartNumber(reserved), spent: toChartNumber(spent) },
      };
    })
    .sort((p, q) => p.code.localeCompare(q.code) || p.currency.localeCompare(q.currency));
  return { fiscalYearLabel: fy.label, rows };
}

// --- 5. Firm Participation --------------------------------------------------------------

export interface FirmParticipationReport {
  /** Firms with at least one invite / offer / contract, most invites first. */
  readonly rows: readonly { firmName: string; invited: number; offers: number; contracts: number }[];
}

export async function firmParticipation(f: ReportFilters): Promise<FirmParticipationReport> {
  const fyId = fyWhere(f.fiscalYearId);
  const viaIT = fyId ? { itPerforma: { indent: { fiscalYearId: fyId } } } : {};
  const [invites, offers, contracts] = await Promise.all([
    prisma.iTFirmInvite.groupBy({ by: ['firmId'], where: viaIT, _count: { _all: true } }),
    prisma.technicalOffer.groupBy({ by: ['firmId'], where: viaIT, _count: { _all: true } }),
    prisma.contract.groupBy({ by: ['firmId'], where: fyId ? { indent: { fiscalYearId: fyId } } : {}, _count: { _all: true } }),
  ]);
  const toMap = (gs: readonly { firmId: string; _count: { _all: number } }[]) => new Map(gs.map((x) => [x.firmId, x._count._all]));
  const inv = toMap(invites);
  const off = toMap(offers);
  const con = toMap(contracts);
  const firmIds = [...new Set([...inv.keys(), ...off.keys(), ...con.keys()])];
  const firms = await prisma.firm.findMany({ where: { id: { in: firmIds } }, select: { id: true, name: true } });
  const nameById = new Map(firms.map((x) => [x.id, x.name]));
  const rows = firmIds
    .map((id) => ({ firmName: nameById.get(id) ?? id, invited: inv.get(id) ?? 0, offers: off.get(id) ?? 0, contracts: con.get(id) ?? 0 }))
    .sort((p, q) => q.invited - p.invited || q.offers - p.offers || p.firmName.localeCompare(q.firmName));
  return { rows };
}

// --- .docx export ---------------------------------------------------------------------

export const REPORT_TITLES: Record<ReportSlug, string> = {
  'indent-pipeline': 'Indent Pipeline',
  'contract-awards': 'Contract Awards',
  'compliance-snapshot': 'Compliance Snapshot',
  'budget-utilisation': 'Budget Utilisation',
  'firm-participation': 'Firm Participation',
};

async function filterLabels(f: ReportFilters, opts: { fy?: boolean; section?: boolean; firm?: boolean }) {
  const out: [string, string][] = [];
  if (opts.fy) {
    const fy = fyWhere(f.fiscalYearId)
      ? await prisma.fiscalYear.findUnique({ where: { id: f.fiscalYearId }, select: { label: true } })
      : null;
    out.push(['Fiscal year', fy?.label ?? 'All years']);
  }
  if (opts.section) {
    const s = f.sectionId ? await prisma.section.findUnique({ where: { id: f.sectionId }, select: { code: true, name: true } }) : null;
    out.push(['Section', s ? `${s.code} — ${s.name}` : 'All sections']);
  }
  if (opts.firm) {
    const fm = f.firmId ? await prisma.firm.findUnique({ where: { id: f.firmId }, select: { name: true } }) : null;
    out.push(['Firm', fm?.name ?? 'All firms']);
  }
  return out;
}

export async function buildReportDoc(slug: ReportSlug, f: ReportFilters): Promise<ReportDocData> {
  const title = REPORT_TITLES[slug];
  const fileName = `Report_${title.replace(/\s+/g, '_')}`;
  switch (slug) {
    case 'indent-pipeline': {
      const r = await indentPipeline(f);
      return {
        title, fileName,
        filters: await filterLabels(f, { fy: true, section: true }),
        sections: [{
          heading: 'Indents by status',
          headers: ['Status', 'Indents'],
          rows: [...r.rows.map((x) => [x.status.replace(/_/g, ' '), String(x.count)]), ['Total', String(r.total)]],
        }],
      };
    }
    case 'contract-awards': {
      const r = await contractAwards(f);
      return {
        title, fileName,
        filters: await filterLabels(f, { fy: true, firm: true }),
        sections: [
          { heading: 'Contracts per month', headers: ['Month', 'Currency', 'Contracts', 'Total value'], rows: r.byMonth.map((x) => [x.month, x.currency, String(x.count), x.total]), note: 'Month = award date, or sign date when no award date is recorded.' },
          { heading: 'By firm', headers: ['Firm', 'Currency', 'Contracts', 'Total value'], rows: r.byFirm.map((x) => [x.firmName, x.currency, String(x.count), x.total]) },
          { heading: 'Totals', headers: ['Currency', 'Contracts', 'Total value'], rows: r.totals.map((x) => [x.currency, String(x.count), x.total]) },
        ],
      };
    }
    case 'compliance-snapshot': {
      const r = await complianceSnapshot();
      return {
        title, fileName,
        filters: [],
        sections: [
          { heading: 'Headline counts', headers: ['Measure', 'Count', 'Definition'], rows: r.cards.map((c) => [c.label, String(c.count), c.note]) },
          { heading: 'By status', headers: ['Area', 'Status', 'Count'], rows: r.breakdown.map((x) => [x.area, x.status.replace(/_/g, ' '), String(x.count)]) },
        ],
      };
    }
    case 'budget-utilisation': {
      const r = await budgetUtilisation(f);
      return {
        title, fileName,
        filters: [['Fiscal year', r.fiscalYearLabel]],
        sections: [{
          heading: 'Per budget head',
          headers: ['Budget head', 'Description', 'Currency', 'Allocated', 'Reserved', 'Spent', '% spent'],
          rows: r.rows.map((x) => [x.code, x.description, x.currency, x.allocated, x.reserved, x.spent, x.percentSpent]),
          note: '% spent = spent ÷ allocated.',
        }],
      };
    }
    case 'firm-participation': {
      const r = await firmParticipation(f);
      return {
        title, fileName,
        filters: await filterLabels(f, { fy: true }),
        sections: [{
          heading: 'Per firm',
          headers: ['Firm', 'ITs invited', 'Technical offers', 'Contracts awarded'],
          rows: r.rows.map((x) => [x.firmName, String(x.invited), String(x.offers), String(x.contracts)]),
        }],
      };
    }
  }
}
