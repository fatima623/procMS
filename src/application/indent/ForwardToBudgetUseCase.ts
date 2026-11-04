import { NotFoundError, ForbiddenError } from '@/domain/errors/DomainError';
import { Role } from '@prisma/client';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

/**
 * CR Section acknowledges receipt and forwards the indent to Budget.
 *
 * The domain exposes this as two steps (markCRReceived SUBMITTED → CR_RECEIVED,
 * then forwardToBudget CR_RECEIVED → BUDGET_CHECK) because the CR intake clerk
 * and the forwarding officer can in principle be different people. In practice
 * the UI collapses them into a single "Forward to Budget" action — if the
 * caller lands on an indent in SUBMITTED we run both transitions back-to-back
 * inside the same UoW so the two events land as one logical step in the audit
 * trail.
 */
export class ForwardToBudgetUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, indentId: string): Promise<void> {
    if (!hasRole(ctx, Role.CR_STAFF, Role.ADMIN)) {
      throw new ForbiddenError('Only CR Section may forward to Budget');
    }
    const log = this.deps.logger.child({ useCase: 'ForwardToBudget', indentId, userId: ctx.userId });

    await this.deps.uow.run(async (h) => {
      const indent = await h.indents.findById(indentId);
      if (!indent) throw new NotFoundError('Indent', indentId);

      if (indent.status === 'SUBMITTED') {
        indent.markCRReceived(ctx.userId);
      }
      indent.forwardToBudget(ctx.userId);
      await h.indents.save(indent);

      await h.audit.appendFromEvents(ctx.userId, indent.pullEvents(), {
        subjectType: 'INDENT',
        subjectId: indent.id,
      });
      log.info({}, 'indent forwarded to Budget');
    });
  }
}
