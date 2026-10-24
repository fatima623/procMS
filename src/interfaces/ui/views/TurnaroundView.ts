import { prisma } from '@/infrastructure/db/prisma';

export interface Bucket {
  readonly label: string;
  readonly minHours: number;
  readonly maxHours: number;    // exclusive upper bound; Infinity for the last bucket
  readonly count: number;
  readonly pct: number;
}

export interface TurnaroundStats {
  readonly label: string;
  readonly sampleSize: number;
  readonly avgHours: number;
  readonly medianHours: number;
  readonly p90Hours: number;
  readonly maxHours: number;
  readonly buckets: readonly Bucket[];
  readonly slowest: readonly { readonly id: string; readonly who: string; readonly hours: number; readonly subject: string; readonly href?: string }[];
}

/** Histogram bucket boundaries (hours). The last bucket is open-ended. */
const BUCKET_EDGES: readonly { label: string; min: number; max: number }[] = [
  { label: '< 4 h',   min: 0,    max: 4 },
  { label: '4–24 h',  min: 4,    max: 24 },
  { label: '1–3 d',   min: 24,   max: 72 },
  { label: '3–7 d',   min: 72,   max: 168 },
  { label: '> 7 d',   min: 168,  max: Infinity },
];

export async function loadTurnaround(opts: { fiscalYearId?: string } = {}): Promise<{
  readonly queries: TurnaroundStats;
  readonly observations: TurnaroundStats;
}> {
  // --- TSR queries: askedAt → answeredAt
  const queries = await prisma.tSRQuery.findMany({
    where: {
      status: { in: ['ANSWERED', 'CLOSED'] },
      answeredAt: { not: null },
      ...(opts.fiscalYearId ? { tsr: { itPerforma: { indent: { fiscalYearId: opts.fiscalYearId } } } } : {}),
    },
    select: {
      id: true, askedAt: true, answeredAt: true,
      firm: { select: { name: true } },
      tsr: { select: { itPerforma: { select: { indent: { select: { id: true, subject: true } } } } } },
    },
  });
  const qHours = queries.map((q) => ({
    id: q.id,
    hours: (q.answeredAt!.getTime() - q.askedAt.getTime()) / 3_600_000,
    who: q.firm.name,
    subject: q.tsr.itPerforma.indent.subject,
    href: `/indents/${q.tsr.itPerforma.indent.id}`,
  }));

  // --- Observations: createdAt → resolvedAt
  const observations = await prisma.observation.findMany({
    where: {
      status: 'RESOLVED', resolvedAt: { not: null },
      ...(opts.fiscalYearId ? { indent: { fiscalYearId: opts.fiscalYearId } } : {}),
    },
    select: {
      id: true, createdAt: true, resolvedAt: true,
      indent: { select: { id: true, subject: true, indenter: { select: { displayName: true } } } },
    },
  });
  const oHours = observations.map((o) => ({
    id: o.id,
    hours: (o.resolvedAt!.getTime() - o.createdAt.getTime()) / 3_600_000,
    who: o.indent.indenter.displayName,
    subject: o.indent.subject,
    href: `/indents/${o.indent.id}`,
  }));

  return {
    queries: buildStats('Firm query turnaround', qHours),
    observations: buildStats('Indenter observation turnaround', oHours),
  };
}

function buildStats(
  label: string,
  samples: readonly { id: string; hours: number; who: string; subject: string; href: string }[],
): TurnaroundStats {
  const positive = samples.filter((s) => s.hours >= 0);
  const sorted = [...positive].sort((a, b) => a.hours - b.hours);
  const n = sorted.length;
  if (n === 0) {
    return {
      label, sampleSize: 0, avgHours: 0, medianHours: 0, p90Hours: 0, maxHours: 0,
      buckets: BUCKET_EDGES.map((b) => ({ label: b.label, minHours: b.min, maxHours: b.max, count: 0, pct: 0 })),
      slowest: [],
    };
  }
  const avg = round(sorted.reduce((a, b) => a + b.hours, 0) / n);
  const median = round(sorted[Math.floor(n / 2)]!.hours);
  const p90 = round(sorted[Math.min(n - 1, Math.floor(n * 0.9))]!.hours);
  const max = round(sorted[n - 1]!.hours);
  const buckets = BUCKET_EDGES.map((b) => {
    const count = positive.filter((s) => s.hours >= b.min && s.hours < b.max).length;
    return { label: b.label, minHours: b.min, maxHours: b.max, count, pct: Math.round((count / n) * 1000) / 10 };
  });
  const slowest = [...sorted].reverse().slice(0, 5).map((s) => ({
    id: s.id, who: s.who, hours: round(s.hours), subject: s.subject, href: s.href,
  }));
  return { label, sampleSize: n, avgHours: avg, medianHours: median, p90Hours: p90, maxHours: max, buckets, slowest };
}

function round(n: number, digits = 1): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
