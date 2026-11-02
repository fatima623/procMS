import { ulid } from 'ulid';
import { AnnualPlanStatus } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import type {
  CreateAnnualPlanInput,
  PublishAnnualPlanInput,
  CreateBiddingTemplateInput,
  RetireBiddingTemplateInput,
} from '@/interfaces/http/schemas/annualPlan';

/**
 * Annual Procurement Plan lifecycle (PPRA Rule 8).
 *   - At most one DRAFT and one PUBLISHED plan per fiscal year (DB unique).
 *   - Publishing an existing plan supersedes any prior PUBLISHED plan for
 *     the same FY in one transaction.
 *   - Items are append-only inside a DRAFT; once PUBLISHED they are frozen.
 */
export const planningService = {
  async createDraft(input: CreateAnnualPlanInput): Promise<{ id: string }> {
    const fy = await prisma.fiscalYear.findUnique({ where: { id: input.fiscalYearId }, select: { id: true } });
    if (!fy) throw new NotFoundError('FiscalYear', input.fiscalYearId);
    const existing = await prisma.annualProcurementPlan.findFirst({
      where: { fiscalYearId: input.fiscalYearId, status: AnnualPlanStatus.DRAFT },
      select: { id: true },
    });
    if (existing) throw new ValidationError(`A DRAFT plan already exists for this fiscal year (${existing.id})`);

    const id = ulid();
    const totalEstimate = input.items.reduce(
      (sum, i) => sum + Number(i.estimatedValue || 0),
      0,
    );
    await prisma.annualProcurementPlan.create({
      data: {
        id,
        fiscalYearId: input.fiscalYearId,
        notes: input.notes ?? null,
        totalEstimate: totalEstimate.toFixed(4),
        items: {
          create: input.items.map((it) => ({
            id: ulid(),
            budgetHeadId: it.budgetHeadId,
            description: it.description,
            estimatedValue: it.estimatedValue,
            currency: it.currency,
            methodHint: it.methodHint ?? null,
            categoryHint: it.categoryHint ?? null,
            quarterHint: it.quarterHint ?? null,
          })),
        },
      },
    });
    return { id };
  },

  async publish(id: string, publishedByUserId: string, input: PublishAnnualPlanInput): Promise<void> {
    const plan = await prisma.annualProcurementPlan.findUnique({
      where: { id },
      select: { id: true, status: true, fiscalYearId: true },
    });
    if (!plan) throw new NotFoundError('AnnualProcurementPlan', id);
    if (plan.status !== AnnualPlanStatus.DRAFT) {
      throw new ValidationError(`Only a DRAFT plan can be published (currently ${plan.status})`);
    }
    await prisma.$transaction(async (tx) => {
      // Supersede any prior PUBLISHED plan for the same FY.
      await tx.annualProcurementPlan.updateMany({
        where: { fiscalYearId: plan.fiscalYearId, status: AnnualPlanStatus.PUBLISHED },
        data: { status: AnnualPlanStatus.SUPERSEDED },
      });
      await tx.annualProcurementPlan.update({
        where: { id },
        data: {
          status: AnnualPlanStatus.PUBLISHED,
          publishedOn: input.publishedOn,
          publishedByUserId,
        },
      });
    });
  },

  // --- Bidding Document Templates -------------------------------------------

  async createBiddingTemplate(input: CreateBiddingTemplateInput): Promise<{ id: string }> {
    const existing = await prisma.biddingDocumentTemplate.findUnique({
      where: { kind_revision: { kind: input.kind, revision: input.revision } },
      select: { id: true },
    });
    if (existing) throw new ValidationError(`Template already exists for ${input.kind} / ${input.revision}`);
    const id = ulid();
    await prisma.biddingDocumentTemplate.create({
      data: {
        id,
        kind: input.kind,
        name: input.name,
        revision: input.revision,
        publishedOn: input.publishedOn,
        bodyKey: input.bodyKey ?? null,
        summary: input.summary ?? null,
      },
    });
    return { id };
  },

  async retireBiddingTemplate(id: string, _input: RetireBiddingTemplateInput): Promise<void> {
    const row = await prisma.biddingDocumentTemplate.findUnique({ where: { id }, select: { id: true, isActive: true } });
    if (!row) throw new NotFoundError('BiddingDocumentTemplate', id);
    if (!row.isActive) throw new ValidationError('Template is already retired');
    await prisma.biddingDocumentTemplate.update({ where: { id }, data: { isActive: false } });
  },
};

/**
 * Splitting / regrouping detector (PPRA Rule 9) — looks for recent indents
 * from the same submitter + same budget head whose values individually sit
 * under a method threshold but whose sum crosses it. Returns groups of
 * suspicious indents for review; does not block anything.
 */
export interface SplittingSuspicion {
  readonly indenterId: string;
  readonly budgetHeadId: string;
  readonly fiscalYearId: string;
  readonly indents: readonly { readonly id: string; readonly indentNumber: string; readonly subject: string; readonly estimatedValueMinor: string; readonly submittedAt: string }[];
  readonly totalMinor: string;
}

const RFQ_UPPER_THRESHOLD_MINOR = 500_000n * 10_000n;
// Indents under PKR 500,000 may use RFQ; splitting one > 500k into smaller
// chunks is a red flag. We also use the open-bidding threshold at 3M.
const OCB_PRESS_THRESHOLD_MINOR = 3_000_000n * 10_000n;

export const planningReports = {
  async findSplittingSuspicions(_withinDays = 60): Promise<readonly SplittingSuspicion[]> {
    // Join: indenter + budgetHead within an FY, submitted in the window.
    const windowStart = new Date(Date.now() - _withinDays * 86_400_000);
    const rows = await prisma.indent.findMany({
      where: {
        submittedAt: { gte: windowStart },
        status: { notIn: ['CANCELLED', 'DRAFT'] as any },
      },
      select: {
        id: true, indentNumber: true, subject: true, estimatedValue: true,
        indenterId: true, budgetHeadId: true, fiscalYearId: true, submittedAt: true,
      },
      orderBy: { submittedAt: 'desc' },
      take: 1000,
    });
    const groups = new Map<string, typeof rows>();
    for (const r of rows) {
      const key = `${r.indenterId}|${r.budgetHeadId}|${r.fiscalYearId}`;
      const g = groups.get(key) ?? [];
      g.push(r);
      groups.set(key, g);
    }
    const out: SplittingSuspicion[] = [];
    for (const [key, group] of groups) {
      if (group.length < 2) continue;
      // Compute total minor units
      const total = group.reduce((sum, r) => {
        const s = r.estimatedValue.toString();
        const [intPart, fracRaw = ''] = s.split('.');
        const frac = (fracRaw + '0000').slice(0, 4);
        return sum + BigInt(intPart ?? '0') * 10_000n + BigInt(frac || '0');
      }, 0n);
      // Only flag if (a) sum crosses a threshold while (b) each individual stays below it.
      const anyAbove = group.some((r) => {
        const s = r.estimatedValue.toString();
        const [intPart, fracRaw = ''] = s.split('.');
        const frac = (fracRaw + '0000').slice(0, 4);
        return BigInt(intPart ?? '0') * 10_000n + BigInt(frac || '0') >= RFQ_UPPER_THRESHOLD_MINOR;
      });
      if (anyAbove) continue; // not a splitting pattern
      if (total < RFQ_UPPER_THRESHOLD_MINOR && total < OCB_PRESS_THRESHOLD_MINOR) continue;
      const [indenterId, budgetHeadId, fiscalYearId] = key.split('|');
      out.push({
        indenterId: indenterId ?? '',
        budgetHeadId: budgetHeadId ?? '',
        fiscalYearId: fiscalYearId ?? '',
        indents: group.map((r) => ({
          id: r.id,
          indentNumber: r.indentNumber,
          subject: r.subject,
          estimatedValueMinor: ((): string => {
            const s = r.estimatedValue.toString();
            const [intPart, fracRaw = ''] = s.split('.');
            const frac = (fracRaw + '0000').slice(0, 4);
            return (BigInt(intPart ?? '0') * 10_000n + BigInt(frac || '0')).toString();
          })(),
          submittedAt: r.submittedAt?.toISOString() ?? '',
        })),
        totalMinor: total.toString(),
      });
    }
    return out;
  },
};
