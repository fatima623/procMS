import { Role } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '@/domain/errors/DomainError';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

export interface AnswerQueryDto {
  readonly queryId: string;
  readonly response: string;
}

export class AnswerQueryUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, tsrId: string, dto: AnswerQueryDto): Promise<void> {
    if (!hasRole(ctx, Role.FIRM_REP, Role.ADMIN)) {
      throw new ForbiddenError('Only firm representatives may answer queries');
    }
    if (!ctx.firmId) throw new ForbiddenError('No firm associated with this user');

    await this.deps.uow.run(async (h) => {
      const tsr = await h.tsrs.findById(tsrId);
      if (!tsr) throw new NotFoundError('TSR', tsrId);

      const now = this.deps.clock.now();
      tsr.answerQuery(dto.queryId, ctx.userId, ctx.firmId!, dto.response, now);
      await h.tsrs.save(tsr);
      await h.audit.appendFromEvents(ctx.userId, tsr.pullEvents(), {
        subjectType: 'TSR',
        subjectId: tsr.id,
      });

      this.deps.logger.info({ tsrId, queryId: dto.queryId }, 'query answered');
    });
  }
}
