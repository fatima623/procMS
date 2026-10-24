import { Role } from '@prisma/client';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/domain/errors/DomainError';
import { CommercialOffer } from '@/domain/offers/CommercialOffer';
import { Money } from '@/domain/shared/Money';
import { IndentStatus } from '@/domain/indent/IndentStatus';
import { OfferStatus } from '@/domain/offers/OfferStatus';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { IdFactory } from '../ports/IdFactory';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

export interface OpenCommercialOfferDto {
  readonly itPerformaId: string;
  readonly firmId: string;
  readonly totalPriceMinor: string;
  readonly currency: string;
  readonly deliveryWeeks?: number;
  readonly documentKey?: string;
}

/**
 * Concerned Section opens the sealed commercial envelope from a
 * technically-accepted firm. Business rules:
 *   - IT is DISPATCHED and the indent is COMMERCIAL_OPEN (TSR done).
 *   - Firm's TechnicalOffer status is ACCEPTED.
 *   - Only one commercial offer per (IT, firm).
 */
export class OpenCommercialOfferUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly ids: IdFactory;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, dto: OpenCommercialOfferDto): Promise<{ offerId: string }> {
    if (!hasRole(ctx, Role.ADP_STAFF, Role.COORD_STAFF, Role.ADMIN)) {
      throw new ForbiddenError('Not permitted to open commercial offers');
    }
    if (!/^\d+$/.test(dto.totalPriceMinor)) {
      throw new ValidationError('Invalid totalPriceMinor', { totalPriceMinor: 'must be non-negative integer' });
    }

    return this.deps.uow.run(async (h) => {
      const it = await h.itProformas.findById(dto.itPerformaId);
      if (!it) throw new NotFoundError('ITPerforma', dto.itPerformaId);

      const indent = await h.indents.findById(it.indentId);
      if (!indent) throw new NotFoundError('Indent', it.indentId);
      if (indent.status !== IndentStatus.COMMERCIAL_OPEN) {
        throw new BusinessRuleViolationError(
          `Indent must be COMMERCIAL_OPEN to open offers (currently ${indent.status})`,
        );
      }
      const tech = await h.technicalOffers.findForFirm(dto.itPerformaId, dto.firmId);
      if (!tech) {
        throw new BusinessRuleViolationError('Firm has no technical offer on file');
      }
      if (tech.status !== OfferStatus.ACCEPTED) {
        throw new BusinessRuleViolationError(
          `Firm's technical offer must be ACCEPTED (currently ${tech.status})`,
        );
      }
      const existing = await h.commercialOffers.findForFirm(dto.itPerformaId, dto.firmId);
      if (existing) {
        throw new BusinessRuleViolationError('Commercial offer already opened for this firm');
      }

      const now = this.deps.clock.now();
      const offer = CommercialOffer.open(
        this.deps.ids.next(),
        {
          itPerformaId: dto.itPerformaId,
          firmId: dto.firmId,
          totalPrice: Money.of(BigInt(dto.totalPriceMinor), dto.currency),
          deliveryWeeks: dto.deliveryWeeks,
          documentKey: dto.documentKey,
        },
        now,
      );
      await h.commercialOffers.insert(offer);
      await h.audit.appendFromEvents(ctx.userId, offer.pullEvents(), {
        subjectType: 'COMMERCIAL_OFFER',
        subjectId: offer.id,
      });

      this.deps.logger.info({ offerId: offer.id, firmId: dto.firmId }, 'commercial offer opened');
      return { offerId: offer.id };
    });
  }
}
