import { Role } from '@prisma/client';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/domain/errors/DomainError';
import { TechnicalOffer } from '@/domain/offers/TechnicalOffer';
import { ITStatus } from '@/domain/itproforma/ITStatus';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { IdFactory } from '../ports/IdFactory';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

export interface SubmitTechnicalOfferDto {
  readonly itPerformaId: string;
  readonly documentKey?: string;
  readonly remarks?: string;
}

/**
 * A firm representative submits a technical offer against a dispatched IT.
 * Precondition: IT is DISPATCHED, now ≤ closingAt, firm is invited, firm has
 * not already submitted an offer for this IT.
 */
export class SubmitTechnicalOfferUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly ids: IdFactory;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(
    ctx: AuthContext,
    dto: SubmitTechnicalOfferDto,
  ): Promise<{ offerId: string }> {
    if (!hasRole(ctx, Role.FIRM_REP, Role.ADMIN)) {
      throw new ForbiddenError('Only firm representatives may submit offers');
    }
    if (!ctx.firmId) throw new ForbiddenError('No firm associated with this user');

    return this.deps.uow.run(async (h) => {
      const it = await h.itProformas.findById(dto.itPerformaId);
      if (!it) throw new NotFoundError('ITPerforma', dto.itPerformaId);
      if (it.status !== ITStatus.DISPATCHED) {
        throw new BusinessRuleViolationError(
          `IT must be DISPATCHED to accept offers (currently ${it.status})`,
        );
      }
      const now = this.deps.clock.now();
      if (it.closingAt && now.getTime() > it.closingAt.getTime()) {
        throw new ValidationError('Offer window has closed');
      }
      if (!it.invitedFirms.includes(ctx.firmId!)) {
        throw new ForbiddenError('Your firm is not invited to this tender');
      }
      const existing = await h.technicalOffers.findForFirm(it.id, ctx.firmId!);
      if (existing) {
        throw new BusinessRuleViolationError('Your firm has already submitted a technical offer');
      }

      const offer = TechnicalOffer.create(
        this.deps.ids.next(),
        {
          itPerformaId: it.id,
          firmId: ctx.firmId!,
          documentKey: dto.documentKey,
          remarks: dto.remarks,
        },
        now,
      );
      await h.technicalOffers.insert(offer);
      await h.audit.appendFromEvents(ctx.userId, offer.pullEvents(), {
        subjectType: 'TECH_OFFER',
        subjectId: offer.id,
      });

      this.deps.logger.info({ offerId: offer.id, itId: it.id, firmId: ctx.firmId }, 'tech offer submitted');
      return { offerId: offer.id };
    });
  }
}
