import { Role } from '@prisma/client';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  NotFoundError,
} from '@/domain/errors/DomainError';
import { ApprovalChain } from '@/domain/approval/ApprovalChain';
import { ApprovalSubject, CHAIN_TEMPLATES } from '@/domain/approval/ApprovalTypes';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { IdFactory } from '../ports/IdFactory';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

/**
 * Starts the senior approval chain for a Pre-Purchase Proposal and moves the
 * indent CST_APPROVAL -> PRE_PP_APPROVAL in the same transaction.
 */
export class StartPrePPApprovalUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly ids: IdFactory;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, indentId: string): Promise<{ chainId: string }> {
    if (!hasRole(ctx, Role.ADP_STAFF, Role.COORD_STAFF, Role.ADMIN)) {
      throw new ForbiddenError('Not permitted to start Pre-Purchase Proposal approval');
    }
    return this.deps.uow.run(async (h) => {
      const indent = await h.indents.findById(indentId);
      if (!indent) throw new NotFoundError('Indent', indentId);

      const proposal = await h.prePPs.findByIndentId(indentId);
      if (!proposal) throw new NotFoundError('PrePurchaseProposal', indentId);
      if (proposal.status !== 'DRAFT') {
        throw new BusinessRuleViolationError(
          `Pre-Purchase Proposal must be DRAFT to start approval (currently ${proposal.status})`,
        );
      }
      const existing = await h.chains.findBySubject(ApprovalSubject.PRE_PP, proposal.id);
      if (existing) throw new BusinessRuleViolationError('Pre-Purchase Proposal approval chain already exists');

      const now = this.deps.clock.now();
      indent.enterPrePPApproval(ctx.userId);

      const chain = ApprovalChain.start(
        this.deps.ids.next(),
        ApprovalSubject.PRE_PP,
        proposal.id,
        CHAIN_TEMPLATES.PRE_PP,
        () => this.deps.ids.next(),
        now,
      );

      await h.indents.save(indent);
      await h.chains.insert(chain);
      await h.prePPs.setPending(proposal.id, chain.id);

      await h.audit.appendFromEvents(ctx.userId, indent.pullEvents(), {
        subjectType: 'INDENT',
        subjectId: indent.id,
      });
      await h.audit.appendFromEvents(ctx.userId, chain.pullEvents(), {
        subjectType: 'APPROVAL_PRE_PP',
        subjectId: chain.id,
      });

      this.deps.logger.info({ chainId: chain.id, indentId }, 'Pre-PP approval chain started');
      return { chainId: chain.id };
    });
  }
}