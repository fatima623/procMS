import { prisma } from '@/infrastructure/db/prisma';
import { decimalToMinor } from '@/infrastructure/common/decimal';

export interface PlanRow {
  readonly id: string;
  readonly fiscalYearLabel: string;
  readonly status: string;
  readonly publishedOn: string | null;
  readonly itemCount: number;
  readonly totalEstimateMinor: string | null;
  readonly currency: string;
}

export async function listAnnualPlans(): Promise<readonly PlanRow[]> {
  const rows = await prisma.annualProcurementPlan.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      fiscalYear: { select: { label: true } },
      _count: { select: { items: true } },
    },
    take: 100,
  });
  return rows.map((r) => ({
    id: r.id,
    fiscalYearLabel: r.fiscalYear.label,
    status: r.status,
    publishedOn: r.publishedOn?.toISOString() ?? null,
    itemCount: r._count.items,
    totalEstimateMinor: r.totalEstimate ? decimalToMinor(r.totalEstimate).toString() : null,
    currency: r.currency,
  }));
}

export interface BiddingTemplateRow {
  readonly id: string;
  readonly kind: string;
  readonly name: string;
  readonly revision: string;
  readonly publishedOn: string;
  readonly isActive: boolean;
  readonly summary: string | null;
}

export async function listBiddingTemplates(): Promise<readonly BiddingTemplateRow[]> {
  const rows = await prisma.biddingDocumentTemplate.findMany({
    orderBy: [{ kind: 'asc' }, { publishedOn: 'desc' }],
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    name: r.name,
    revision: r.revision,
    publishedOn: r.publishedOn.toISOString(),
    isActive: r.isActive,
    summary: r.summary,
  }));
}

export async function listFiscalYears(): Promise<readonly { readonly id: string; readonly label: string; readonly isActive: boolean }[]> {
  return prisma.fiscalYear.findMany({ orderBy: { startsOn: 'desc' }, select: { id: true, label: true, isActive: true }, take: 20 });
}

export async function listBudgetHeads(): Promise<readonly { readonly id: string; readonly code: string; readonly description: string }[]> {
  return prisma.budgetHead.findMany({ where: { isActive: true }, orderBy: { code: 'asc' }, select: { id: true, code: true, description: true }, take: 500 });
}
