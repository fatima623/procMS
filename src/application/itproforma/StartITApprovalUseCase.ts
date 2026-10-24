import { Role } from '@prisma/client';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  NotFoundError,
} from '@/domain/errors/DomainError';
import { ApprovalChain } from '@/domain/approval/ApprovalChain';
import {
  ApprovalSubject,
  CHAIN_TEMPLATES,
} from '@/domain/approval/ApprovalTypes';
import { ITStatus } from '@/domain/itproforma/ITStatus';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { IdFactory } from '../ports/IdFactory';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

/**
 * Concerned ADP sends the IT Proforma into Chain #2 (AD → DD → DP(N)).
 * Side-effects (one transaction):
 *   1. IT Proforma: DRAFT → IN_APPROVAL
 *   2. Indent: IT_PREPARATION → IT_APPROVAL
 *   3. ApprovalChain(subject=IT_PROFORMA) inserted at step 0.
 */
export class StartITApprovalUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly ids: IdFactory;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, itPerformaId: string): Promise<{ chainId: string }> {
    if (!hasRole(ctx, Role.ADP_STAFF, Role.ADMIN)) {
      throw new ForbiddenError('Only Concerned ADP staff may start IT approval');
    }
    const log = this.deps.logger.child({ useCase: 'StartITApproval', itPerformaId });

    return this.deps.uow.run(async (h) => {
      const it = await h.itProformas.findById(itPerformaId);
      if (!it) throw new NotFoundError('ITPerforma', itPerformaId);
      if (it.status !== ITStatus.DRAFT) {
        throw new BusinessRuleViolationError(
          `IT Proforma must be DRAFT to start approval (currently ${it.status})`,
        );
      }
      const indent = await h.indents.findById(it.indentId);
      if (!indent) throw new NotFoundError('Indent', it.indentId);

      const existingChain = await h.chains.findBySubject(ApprovalSubject.IT_PROFORMA, it.id);
      if (existingChain) {
        throw new BusinessRuleViolationError('An IT approval chain already exists for this proforma');
      }

      const now = this.deps.clock.now();
      it.startApproval(ctx.userId);
      indent.enterITApproval(ctx.userId);
      const chain = ApprovalChain.start(
        this.deps.ids.next(),
        ApprovalSubject.IT_PROFORMA,
        it.id,
        CHAIN_TEMPLATES.IT_PROFORMA,
        () => this.deps.ids.next(),
        now,
      );

      await h.itProformas.save(it);
      await h.indents.save(indent);
      await h.chains.insert(chain);

      await h.audit.appendFromEvents(ctx.userId, it.pullEvents(), {
        subjectType: 'IT_PROFORMA',
        subjectId: it.id,
      });
      await h.audit.appendFromEvents(ctx.userId, indent.pullEvents(), {
        subjectType: 'INDENT',
        subjectId: indent.id,
      });
      await h.audit.appendFromEvents(ctx.userId, chain.pullEvents(), {
        subjectType: 'APPROVAL_IT_PROFORMA',
        subjectId: chain.id,
      });

      log.info({ chainId: chain.id }, 'IT approval chain started');
      return { chainId: chain.id };
    });
  }
}
