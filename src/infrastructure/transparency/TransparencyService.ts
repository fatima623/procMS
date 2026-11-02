import { ulid } from 'ulid';
import { MisprocurementStatus } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import type {
  CreateIncidentInput,
  RemediateIncidentInput,
  ReportIncidentToPPRAInput,
  PlaceRetentionHoldInput,
  ReleaseRetentionHoldInput,
} from '@/interfaces/http/schemas/transparency';

/**
 * PPRA Rule 50 (mis-procurement register) + Rule 46 (record retention)
 * admin stores. These are lightweight append-only tables that other
 * processes (compliance guards, audit staff) write to.
 */
export const transparencyService = {
  // --- Mis-procurement incidents ---------------------------------------------
  async createIncident(detectedByUserId: string | null, input: CreateIncidentInput): Promise<{ id: string }> {
    if (input.indentId) {
      const indent = await prisma.indent.findUnique({ where: { id: input.indentId }, select: { id: true } });
      if (!indent) throw new NotFoundError('Indent', input.indentId);
    }
    const id = ulid();
    await prisma.misprocurementIncident.create({
      data: {
        id,
        indentId: input.indentId ?? null,
        ruleReference: input.ruleReference,
        summary: input.summary,
        details: input.details,
        severity: input.severity,
        detectedOn: input.detectedOn,
        detectedByUserId,
        documentKey: input.documentKey ?? null,
      },
    });
    return { id };
  },

  async remediateIncident(id: string, _input: RemediateIncidentInput): Promise<void> {
    const row = await prisma.misprocurementIncident.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('MisprocurementIncident', id);
    if (row.status !== MisprocurementStatus.OPEN) {
      throw new ValidationError(`Incident ${id} is already ${row.status.toLowerCase()}`);
    }
    await prisma.misprocurementIncident.update({
      where: { id },
      data: { status: MisprocurementStatus.REMEDIATED, remediatedOn: _input.remediatedOn },
    });
  },

  async reportToPPRA(id: string, input: ReportIncidentToPPRAInput): Promise<void> {
    const row = await prisma.misprocurementIncident.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('MisprocurementIncident', id);
    await prisma.misprocurementIncident.update({
      where: { id },
      data: { status: MisprocurementStatus.REPORTED_TO_PPRA, reportedToPPRAOn: input.reportedToPPRAOn },
    });
  },

  // --- Retention holds -------------------------------------------------------
  async placeHold(placedByUserId: string, input: PlaceRetentionHoldInput): Promise<{ id: string }> {
    const existing = await prisma.retentionHold.findFirst({
      where: { subjectType: input.subjectType, subjectId: input.subjectId, releasedOn: null },
      select: { id: true },
    });
    if (existing) {
      throw new ValidationError(`${input.subjectType} ${input.subjectId} already has an active retention hold (${existing.id})`);
    }
    const id = ulid();
    await prisma.retentionHold.create({
      data: {
        id,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        reason: input.reason,
        placedByUserId,
        placedOn: input.placedOn,
        notes: input.notes ?? null,
      },
    });
    return { id };
  },

  async releaseHold(id: string, releasedByUserId: string, input: ReleaseRetentionHoldInput): Promise<void> {
    const row = await prisma.retentionHold.findUnique({ where: { id }, select: { id: true, releasedOn: true } });
    if (!row) throw new NotFoundError('RetentionHold', id);
    if (row.releasedOn) throw new ValidationError('Retention hold is already released');
    await prisma.retentionHold.update({
      where: { id },
      data: { releasedOn: input.releasedOn, releasedByUserId, notes: input.notes ?? undefined },
    });
  },

  async isHeld(subjectType: string, subjectId: string): Promise<boolean> {
    const row = await prisma.retentionHold.findFirst({
      where: { subjectType, subjectId, releasedOn: null },
      select: { id: true },
    });
    return !!row;
  },
};

/**
 * Read-side projection for the public award endpoint (PPRA Rule 47). Returns
 * the award evaluation summary for an indent that has a Contract. Omits any
 * fields that could identify a specific user beyond their display name.
 */
export const publicAward = {
  async getAwardSummary(indentId: string): Promise<null | {
    readonly indentNumber: string;
    readonly subject: string;
    readonly estimatedValueMinor: string;
    readonly currency: string;
    readonly advertisements: readonly { readonly medium: string; readonly publishedOn: string; readonly bidSubmissionDeadline: string | null }[];
    readonly cst: null | {
      readonly singleQuote: boolean;
      readonly approvedAt: string | null;
      readonly lines: readonly { readonly firmName: string; readonly totalPriceMinor: string; readonly currency: string; readonly rank: number; readonly recommendedForAward: boolean }[];
    };
    readonly contract: null | {
      readonly contractNumber: string;
      readonly firmName: string;
      readonly valueMinor: string;
      readonly currency: string;
      readonly awardedOn: string | null;
      readonly signedOn: string | null;
    };
  }> {
    const { decimalToMinor } = await import('@/infrastructure/common/decimal');
    const indent = await prisma.indent.findUnique({
      where: { id: indentId },
      select: {
        indentNumber: true,
        subject: true,
        estimatedValue: true,
        currency: true,
        advertisements: { orderBy: { publishedOn: 'asc' }, select: { medium: true, publishedOn: true, bidSubmissionDeadline: true } },
        itPerforma: {
          select: {
            cst: {
              select: {
                singleQuote: true,
                approvedAt: true,
                lines: {
                  orderBy: { rank: 'asc' },
                  select: {
                    rank: true,
                    recommendedForAward: true,
                    commercialOffer: {
                      select: {
                        totalPrice: true,
                        currency: true,
                        firm: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        contract: {
          select: {
            contractNumber: true,
            value: true,
            currency: true,
            awardedOn: true,
            signedOn: true,
            firm: { select: { name: true } },
          },
        },
      },
    });
    if (!indent || !indent.contract) return null;
    return {
      indentNumber: indent.indentNumber,
      subject: indent.subject,
      estimatedValueMinor: decimalToMinor(indent.estimatedValue).toString(),
      currency: indent.currency,
      advertisements: indent.advertisements.map((a) => ({
        medium: a.medium,
        publishedOn: a.publishedOn.toISOString(),
        bidSubmissionDeadline: a.bidSubmissionDeadline?.toISOString() ?? null,
      })),
      cst: indent.itPerforma?.cst
        ? {
            singleQuote: indent.itPerforma.cst.singleQuote,
            approvedAt: indent.itPerforma.cst.approvedAt?.toISOString() ?? null,
            lines: indent.itPerforma.cst.lines.map((l) => ({
              firmName: l.commercialOffer.firm.name,
              totalPriceMinor: decimalToMinor(l.commercialOffer.totalPrice).toString(),
              currency: l.commercialOffer.currency,
              rank: l.rank,
              recommendedForAward: l.recommendedForAward,
            })),
          }
        : null,
      contract: {
        contractNumber: indent.contract.contractNumber,
        firmName: indent.contract.firm.name,
        valueMinor: decimalToMinor(indent.contract.value).toString(),
        currency: indent.contract.currency,
        awardedOn: indent.contract.awardedOn?.toISOString() ?? null,
        signedOn: indent.contract.signedOn?.toISOString() ?? null,
      },
    };
  },
};
