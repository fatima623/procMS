import { Role } from '@prisma/client';
import {
  ForbiddenError,
  NotFoundError,
} from '@/domain/errors/DomainError';
import { TSRVerdict } from '@/domain/tsr/TSRTypes';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { IdFactory } from '../ports/IdFactory';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

export interface EvaluateOfferDto {
  readonly technicalOfferId: string;
  readonly verdict: TSRVerdict;
  readonly remarks?: string;
}

export class EvaluateOfferUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly ids: IdFactory;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, tsrId: string, dto: EvaluateOfferDto): Promise<void> {
    if (!hasRole(ctx, Role.INSPECTORATE, Role.ADMIN)) {
      throw new ForbiddenError('Only Inspectorate may evaluate offers');
    }
    await this.deps.uow.run(async (h) => {
      const tsr = await h.tsrs.findById(tsrId);
      if (!tsr) throw new NotFoundError('TSR', tsrId);

      const offer = await h.technicalOffers.findById(dto.technicalOfferId);
      if (!offer) throw new NotFoundError('TechnicalOffer', dto.technicalOfferId);
      if (offer.itPerformaId !== tsr.itPerformaId) {
        throw new ForbiddenError('Offer belongs to a different IT');
      }

      const now = this.deps.clock.now();
      tsr.recordEvaluation(
        this.deps.ids.next(),
        ctx.userId,
        dto.technicalOfferId,
        dto.verdict,
        dto.remarks ?? null,
        now,
      );
      await h.tsrs.save(tsr);
      await h.audit.appendFromEvents(ctx.userId, tsr.pullEvents(), {
        subjectType: 'TSR',
        subjectId: tsr.id,
      });

      this.deps.logger.info(
        { tsrId, offerId: dto.technicalOfferId, verdict: dto.verdict },
        'evaluation recorded',
      );
    });
  }
}
