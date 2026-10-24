import { Role } from '@prisma/client';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  NotFoundError,
} from '@/domain/errors/DomainError';
import { TSR } from '@/domain/tsr/TSR';
import { IndentStatus } from '@/domain/indent/IndentStatus';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { IdFactory } from '../ports/IdFactory';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

export class StartTSRUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly ids: IdFactory;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, itPerformaId: string): Promise<{ tsrId: string }> {
    if (!hasRole(ctx, Role.INSPECTORATE, Role.ADMIN)) {
      throw new ForbiddenError('Only Inspectorate may start TSR');
    }
    return this.deps.uow.run(async (h) => {
      const it = await h.itProformas.findById(itPerformaId);
      if (!it) throw new NotFoundError('ITPerforma', itPerformaId);

      const existing = await h.tsrs.findByIT(itPerformaId);
      if (existing) {
        throw new BusinessRuleViolationError('TSR already exists for this IT');
      }

      const indent = await h.indents.findById(it.indentId);
      if (!indent) throw new NotFoundError('Indent', it.indentId);
      if (indent.status !== IndentStatus.TECH_OFFERS_OPEN) {
        throw new BusinessRuleViolationError(
          `Indent must be TECH_OFFERS_OPEN to start TSR (currently ${indent.status})`,
        );
      }

      const now = this.deps.clock.now();
      const tsr = TSR.create(this.deps.ids.next(), {
        itPerformaId,
        inspectorateUserId: ctx.userId,
      }, now);

      indent.markTSRInProgress(ctx.userId);
      await h.tsrs.insert(tsr);
      await h.indents.save(indent);

      await h.audit.appendFromEvents(ctx.userId, tsr.pullEvents(), {
        subjectType: 'TSR',
        subjectId: tsr.id,
      });
      await h.audit.appendFromEvents(ctx.userId, indent.pullEvents(), {
        subjectType: 'INDENT',
        subjectId: indent.id,
      });

      this.deps.logger.info({ tsrId: tsr.id, itId: itPerformaId }, 'TSR started');
      return { tsrId: tsr.id };
    });
  }
}
