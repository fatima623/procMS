import { Role } from '@prisma/client';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/domain/errors/DomainError';
import { IndentStatus } from '@/domain/indent/IndentStatus';
import { ITStatus } from '@/domain/itproforma/ITStatus';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

export interface DispatchITDto {
  readonly closingAt: string;   // ISO datetime; firms' offer deadline
}

/**
 * Concerned Section dispatches the APPROVED IT to firms, which also moves the
 * owning Indent to TECH_OFFERS_OPEN so firms may submit technical offers.
 */
export class DispatchITUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, itPerformaId: string, dto: DispatchITDto): Promise<void> {
    if (!hasRole(ctx, Role.ADP_STAFF, Role.COORD_STAFF, Role.ADMIN)) {
      throw new ForbiddenError('Not permitted to dispatch IT');
    }
    const closingAt = new Date(dto.closingAt);
    if (Number.isNaN(closingAt.getTime())) {
      throw new ValidationError('Invalid closingAt', { closingAt: 'must be ISO datetime' });
    }

    await this.deps.uow.run(async (h) => {
      const it = await h.itProformas.findById(itPerformaId);
      if (!it) throw new NotFoundError('ITPerforma', itPerformaId);
      if (it.status !== ITStatus.APPROVED) {
        throw new BusinessRuleViolationError(
          `IT must be APPROVED before dispatch (currently ${it.status})`,
        );
      }
      const indent = await h.indents.findById(it.indentId);
      if (!indent) throw new NotFoundError('Indent', it.indentId);
      if (indent.status !== IndentStatus.IT_DISPATCHED) {
        throw new BusinessRuleViolationError(
          `Indent must be IT_DISPATCHED (was moved by chain cascade), got ${indent.status}`,
        );
      }

      const now = this.deps.clock.now();
      it.dispatch(ctx.userId, now, closingAt);
      indent.markTechnicalOffersOpen(ctx.userId);

      await h.itProformas.save(it);
      await h.indents.save(indent);
      await h.audit.appendFromEvents(ctx.userId, it.pullEvents(), {
        subjectType: 'IT_PROFORMA',
        subjectId: it.id,
      });
      await h.audit.appendFromEvents(ctx.userId, indent.pullEvents(), {
        subjectType: 'INDENT',
        subjectId: indent.id,
      });

      this.deps.logger.info(
        { itId: it.id, indentId: indent.id, closingAt: closingAt.toISOString() },
        'IT dispatched to firms',
      );
    });
  }
}
