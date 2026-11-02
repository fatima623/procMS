import { prisma } from '@/infrastructure/db/prisma';
import { NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import type { RejectAllOffersInput } from '@/interfaces/http/schemas/rebidding';

/**
 * PPRA Rule 33 — the procuring agency may reject all bids or proposals at
 * any time prior to acceptance. Rule 34 then permits a re-bidding round.
 *
 * This service rejects every (non-terminal) technical and commercial offer
 * for an IT, marks the IT as CLOSED, and sends the indent back to
 * IT_PREPARATION so a new IT can be drafted (same aggregate).
 *
 * The action is audited via the AuditLog by the caller route; the service
 * itself returns the affected counts.
 */
export const rebiddingService = {
  async rejectAllOffersAndReopen(itPerformaId: string, reason: string): Promise<{
    readonly itPerformaId: string;
    readonly rejectedTechnicalOffers: number;
    readonly rejectedCommercialOffers: number;
  }> {
    if (reason.trim().length < 10) {
      throw new ValidationError('A rejection reason of at least 10 characters is required (PPRA Rule 33).');
    }
    const it = await prisma.iTPerforma.findUnique({
      where: { id: itPerformaId },
      select: { id: true, status: true, indentId: true },
    });
    if (!it) throw new NotFoundError('ITPerforma', itPerformaId);
    if (it.status === 'CLOSED' || it.status === 'CANCELLED') {
      throw new ValidationError(`IT ${itPerformaId} is already ${it.status.toLowerCase()}`);
    }

    const [techCount, commCount] = await prisma.$transaction(async (tx) => {
      const t = await tx.technicalOffer.updateMany({
        where: { itPerformaId, status: { in: ['RECEIVED', 'UNDER_REVIEW', 'ACCEPTED'] } },
        data: { status: 'REJECTED' },
      });
      const c = await tx.commercialOffer.updateMany({
        where: { itPerformaId, status: { in: ['RECEIVED', 'UNDER_REVIEW', 'ACCEPTED'] } },
        data: { status: 'REJECTED' },
      });
      await tx.iTPerforma.update({ where: { id: itPerformaId }, data: { status: 'CLOSED' } });
      await tx.indent.update({ where: { id: it.indentId }, data: { status: 'IT_PREPARATION' } });
      await tx.auditLog.create({
        data: {
          id: (await import('ulid')).ulid(),
          action: 'it.reject_all_offers',
          subjectType: 'IT_PROFORMA',
          subjectId: itPerformaId,
          metadata: { reason, rejectedTechnical: t.count, rejectedCommercial: c.count },
          occurredAt: new Date(),
        },
      });
      return [t.count, c.count] as const;
    });
    return {
      itPerformaId,
      rejectedTechnicalOffers: techCount,
      rejectedCommercialOffers: commCount,
    };
  },
};
