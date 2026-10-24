import { Role } from '@prisma/client';
import {
  ForbiddenError,
  NotFoundError,
} from '@/domain/errors/DomainError';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

export class SendPRUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, prId: string): Promise<void> {
    if (!hasRole(ctx, Role.ADP_STAFF, Role.COORD_STAFF, Role.ADMIN)) {
      throw new ForbiddenError('Not permitted to dispatch PR');
    }
    await this.deps.uow.run(async (h) => {
      const pr = await h.prs.findById(prId);
      if (!pr) throw new NotFoundError('PR', prId);
      const now = this.deps.clock.now();
      pr.send(ctx.userId, now);
      await h.prs.save(pr);
      await h.audit.appendFromEvents(ctx.userId, pr.pullEvents(), {
        subjectType: 'PR',
        subjectId: pr.id,
      });
      this.deps.logger.info({ prId, prNumber: pr.prNumber }, 'PR dispatched');
    });
  }
}
