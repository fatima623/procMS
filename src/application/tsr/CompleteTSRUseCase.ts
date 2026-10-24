import { Role } from '@prisma/client';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  NotFoundError,
} from '@/domain/errors/DomainError';
import { TSRVerdict } from '@/domain/tsr/TSRTypes';
import { IndentStatus } from '@/domain/indent/IndentStatus';
import { OfferStatus } from '@/domain/offers/OfferStatus';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

export interface CompleteTSRDto {
  readonly summary: string;
}

/**
 * Completes a TSR. In one transaction:
 *   1. TSR: (SUBMITTED | DRAFT after submit) → COMPLETED
 *   2. Each TechnicalOffer status set to ACCEPTED / REJECTED per its evaluation
 *   3. Owning Indent: TSR_IN_PROGRESS → COMMERCIAL_OPEN
 *
 * If the inspectorate hasn't explicitly submitted before completing, we do
 * both submit() and complete() atomically — matching the common ops path
 * where the inspectorate just wants to finish.
 */
export class CompleteTSRUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, tsrId: string, dto: CompleteTSRDto): Promise<void> {
    if (!hasRole(ctx, Role.INSPECTORATE, Role.ADMIN)) {
      throw new ForbiddenError('Only Inspectorate may complete TSR');
    }
    if (!dto.summary || dto.summary.trim().length === 0) {
      throw new BusinessRuleViolationError('TSR summary is required');
    }

    await this.deps.uow.run(async (h) => {
      const tsr = await h.tsrs.findById(tsrId);
      if (!tsr) throw new NotFoundError('TSR', tsrId);

      const now = this.deps.clock.now();
      // Allow completing from DRAFT by auto-submitting first (common happy path).
      if (tsr.status === 'DRAFT' || tsr.status === 'QUERIES_RAISED') {
        tsr.submit(ctx.userId, dto.summary, now);
      }
      tsr.complete(ctx.userId, now);

      // Apply verdicts to each offer in the same transaction.
      for (const ev of tsr.evaluations) {
        const offer = await h.technicalOffers.findById(ev.technicalOfferId);
        if (!offer) throw new NotFoundError('TechnicalOffer', ev.technicalOfferId);
        if (offer.status === OfferStatus.ACCEPTED || offer.status === OfferStatus.REJECTED) {
          continue; // idempotent re-complete
        }
        if (ev.verdict === TSRVerdict.ACCEPTED) {
          offer.markAccepted(ctx.userId, ev.remarks);
        } else if (ev.verdict === TSRVerdict.REJECTED) {
          offer.markRejected(ctx.userId, ev.remarks ?? 'Rejected per TSR');
        } else {
          // NEEDS_QUERY must have been resolved before complete; treat as rejected to be safe.
          offer.markRejected(ctx.userId, 'Unresolved query at TSR completion');
        }
        await h.technicalOffers.save(offer);
        await h.audit.appendFromEvents(ctx.userId, offer.pullEvents(), {
          subjectType: 'TECH_OFFER',
          subjectId: offer.id,
        });
      }

      const indent = await h.indents.findById(
        (await h.itProformas.findById(tsr.itPerformaId))!.indentId,
      );
      if (!indent) throw new NotFoundError('Indent', '(from IT)');
      if (indent.status !== IndentStatus.COMMERCIAL_OPEN) {
        indent.markCommercialOpen(ctx.userId);
        await h.indents.save(indent);
        await h.audit.appendFromEvents(ctx.userId, indent.pullEvents(), {
          subjectType: 'INDENT',
          subjectId: indent.id,
        });
      }

      await h.tsrs.save(tsr);
      await h.audit.appendFromEvents(ctx.userId, tsr.pullEvents(), {
        subjectType: 'TSR',
        subjectId: tsr.id,
      });

      this.deps.logger.info({ tsrId, indentId: indent.id }, 'TSR completed, commercial opened');
    });
  }
}
