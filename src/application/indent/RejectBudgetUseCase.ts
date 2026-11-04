import { NotFoundError, ForbiddenError, ValidationError } from '@/domain/errors/DomainError';
import { Role } from '@prisma/client';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

export interface RejectBudgetDto {
  readonly reason: string;
}

/**
 * Budget Section rejects the indent for lack of funds / wrong head.
 * BUDGET_CHECK → BUDGET_REJECTED (terminal).
 */
export class RejectBudgetUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, indentId: string, dto: RejectBudgetDto): Promise<void> {
    if (!hasRole(ctx, Role.BUDGET_STAFF, Role.ADMIN)) {
      throw new ForbiddenError('Only Budget Section may reject on budget grounds');
    }
    if (dto.reason.trim().length === 0) {
      throw new ValidationError('Rejection reason is required', { reason: 'required' });
    }
    const log = this.deps.logger.child({ useCase: 'RejectBudget', indentId, userId: ctx.userId });

    await this.deps.uow.run(async (h) => {
      const indent = await h.indents.findById(indentId);
      if (!indent) throw new NotFoundError('Indent', indentId);

      indent.rejectForBudget(ctx.userId, dto.reason);
      await h.indents.save(indent);

      await h.audit.appendFromEvents(ctx.userId, indent.pullEvents(), {
        subjectType: 'INDENT',
        subjectId: indent.id,
      });
      log.info({ reason: dto.reason }, 'budget rejected');
    });
  }
}
