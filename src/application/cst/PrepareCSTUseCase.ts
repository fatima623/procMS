import { Role } from '@prisma/client';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  NotFoundError,
} from '@/domain/errors/DomainError';
import { CST, type CSTLineInput } from '@/domain/cst/CST';
import { IndentStatus } from '@/domain/indent/IndentStatus';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { IdFactory } from '../ports/IdFactory';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

export interface PrepareCSTDto {
  readonly itPerformaId: string;
  readonly lines: readonly {
    readonly commercialOfferId: string;
    readonly rank: number;
    readonly recommendedForAward: boolean;
    readonly justification?: string;
  }[];
}

/**
 * Section prepares the CST from the opened commercial offers. The use-case
 *   - fetches the (IT → commercial offers) set
 *   - verifies every DTO line refers to a known offer for this IT
 *   - infers singleQuote from the number of lines (==1)
 *   - fills in firmId per line
 *   - creates the CST aggregate and advances the Indent to CST_PREPARATION
 */
export class PrepareCSTUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly ids: IdFactory;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, dto: PrepareCSTDto): Promise<{ cstId: string }> {
    if (!hasRole(ctx, Role.ADP_STAFF, Role.COORD_STAFF, Role.ADMIN)) {
      throw new ForbiddenError('Not permitted to prepare CST');
    }
    return this.deps.uow.run(async (h) => {
      const it = await h.itProformas.findById(dto.itPerformaId);
      if (!it) throw new NotFoundError('ITPerforma', dto.itPerformaId);

      if (await h.csts.findByIT(dto.itPerformaId)) {
        throw new BusinessRuleViolationError('CST already prepared for this IT');
      }

      const indent = await h.indents.findById(it.indentId);
      if (!indent) throw new NotFoundError('Indent', it.indentId);
      if (indent.status !== IndentStatus.COMMERCIAL_OPEN) {
        throw new BusinessRuleViolationError(
          `Indent must be COMMERCIAL_OPEN to prepare CST (currently ${indent.status})`,
        );
      }

      const offers = await h.commercialOffers.findByIT(dto.itPerformaId);
      const offerMap = new Map(offers.map((o) => [o.id, o]));

      const lineInputs: CSTLineInput[] = dto.lines.map((l) => {
        const offer = offerMap.get(l.commercialOfferId);
        if (!offer) {
          throw new BusinessRuleViolationError(
            `Commercial offer ${l.commercialOfferId} is not on this IT`,
          );
        }
        return {
          commercialOfferId: l.commercialOfferId,
          firmId: offer.firmId,
          rank: l.rank,
          recommendedForAward: l.recommendedForAward,
          ...(l.justification !== undefined ? { justification: l.justification } : {}),
        };
      });

      const singleQuote = lineInputs.length === 1;
      const now = this.deps.clock.now();
      const cst = CST.create(
        this.deps.ids.next(),
        { itPerformaId: dto.itPerformaId, preparedByUserId: ctx.userId, singleQuote },
        () => this.deps.ids.next(),
        lineInputs,
        now,
      );

      indent.markCSTPreparation(ctx.userId);

      await h.csts.insert(cst);
      await h.indents.save(indent);

      await h.audit.appendFromEvents(ctx.userId, cst.pullEvents(), {
        subjectType: 'CST',
        subjectId: cst.id,
      });
      await h.audit.appendFromEvents(ctx.userId, indent.pullEvents(), {
        subjectType: 'INDENT',
        subjectId: indent.id,
      });

      this.deps.logger.info({ cstId: cst.id, singleQuote }, 'CST prepared');
      return { cstId: cst.id };
    });
  }
}
