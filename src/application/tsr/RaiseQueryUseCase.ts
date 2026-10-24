import { Role } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '@/domain/errors/DomainError';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { IdFactory } from '../ports/IdFactory';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

export interface RaiseQueryDto {
  readonly firmId: string;
  readonly question: string;
}

export class RaiseQueryUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly ids: IdFactory;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, tsrId: string, dto: RaiseQueryDto): Promise<{ queryId: string }> {
    if (!hasRole(ctx, Role.INSPECTORATE, Role.ADMIN)) {
      throw new ForbiddenError('Only Inspectorate may raise queries');
    }
    return this.deps.uow.run(async (h) => {
      const tsr = await h.tsrs.findById(tsrId);
      if (!tsr) throw new NotFoundError('TSR', tsrId);

      const now = this.deps.clock.now();
      const queryId = this.deps.ids.next();
      tsr.raiseQuery(queryId, ctx.userId, dto.firmId, dto.question, now);
      await h.tsrs.save(tsr);
      await h.audit.appendFromEvents(ctx.userId, tsr.pullEvents(), {
        subjectType: 'TSR',
        subjectId: tsr.id,
      });

      this.deps.logger.info({ tsrId, queryId, firmId: dto.firmId }, 'query raised');
      return { queryId };
    });
  }
}
