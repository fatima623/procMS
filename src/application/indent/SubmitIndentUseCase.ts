import { NotFoundError, ForbiddenError } from '@/domain/errors/DomainError';
import { Role } from '@prisma/client';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

/**
 * Transition a DRAFT indent to SUBMITTED. Only the owning indenter (or an
 * admin) may invoke it. The aggregate performs the state check; this use-case
 * provides authz + transactional + audit scaffolding.
 */
export class SubmitIndentUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, indentId: string): Promise<void> {
    if (!hasRole(ctx, Role.INDENTER, Role.ADMIN)) {
      throw new ForbiddenError('Only indenters may submit indents');
    }
    const log = this.deps.logger.child({ useCase: 'SubmitIndent', indentId, userId: ctx.userId });

    await this.deps.uow.run(async (h) => {
      const indent = await h.indents.findById(indentId);
      if (!indent) throw new NotFoundError('Indent', indentId);

      const now = this.deps.clock.now();
      indent.submit(ctx.userId, now);           // aggregate enforces the transition
      await h.indents.save(indent);

      await h.audit.appendFromEvents(ctx.userId, indent.pullEvents(), {
        subjectType: 'INDENT',
        subjectId: indent.id,
      });
      log.info({}, 'indent submitted');
    });
  }
}
