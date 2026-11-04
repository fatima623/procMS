import { NotFoundError, ForbiddenError } from '@/domain/errors/DomainError';
import { Role } from '@prisma/client';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

/**
 * Budget Section confirms funds are available. BUDGET_CHECK → COORD_VETTING.
 */
export class VerifyBudgetUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, indentId: string): Promise<void> {
    if (!hasRole(ctx, Role.BUDGET_STAFF, Role.ADMIN)) {
      throw new ForbiddenError('Only Budget Section may verify the indent');
    }
    const log = this.deps.logger.child({ useCase: 'VerifyBudget', indentId, userId: ctx.userId });

    await this.deps.uow.run(async (h) => {
      const indent = await h.indents.findById(indentId);
      if (!indent) throw new NotFoundError('Indent', indentId);

      indent.markBudgetVerified(ctx.userId);
      await h.indents.save(indent);

      await h.audit.appendFromEvents(ctx.userId, indent.pullEvents(), {
        subjectType: 'INDENT',
        subjectId: indent.id,
      });
      log.info({}, 'budget verified');
    });
  }
}
