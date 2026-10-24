import { Role } from '@prisma/client';
import {
  ForbiddenError,
  NotFoundError,
} from '@/domain/errors/DomainError';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

/**
 * Firm acknowledges receipt. Firm rep must be the firm that owns the PR.
 */
export class AcknowledgePRUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, prId: string): Promise<void> {
    if (!hasRole(ctx, Role.FIRM_REP, Role.ADMIN)) {
      throw new ForbiddenError('Only the awarded firm may acknowledge');
    }
    await this.deps.uow.run(async (h) => {
      const pr = await h.prs.findById(prId);
      if (!pr) throw new NotFoundError('PR', prId);
      if (ctx.firmId && pr.firmId !== ctx.firmId) {
        throw new ForbiddenError('Not the awarded firm');
      }
      pr.acknowledge(ctx.userId);
      await h.prs.save(pr);
      await h.audit.appendFromEvents(ctx.userId, pr.pullEvents(), {
        subjectType: 'PR',
        subjectId: pr.id,
      });
      this.deps.logger.info({ prId, prNumber: pr.prNumber }, 'PR acknowledged');
    });
  }
}
