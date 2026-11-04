import { NotFoundError, ForbiddenError, BusinessRuleViolationError } from '@/domain/errors/DomainError';
import { Role } from '@prisma/client';
import { ApprovalChain } from '@/domain/approval/ApprovalChain';
import { ApprovalSubject, CHAIN_TEMPLATES } from '@/domain/approval/ApprovalTypes';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { IdFactory } from '../ports/IdFactory';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

/**
 * SUPTD finishes vetting and launches the indent approval chain.
 * Side-effects, one transaction:
 *   1. Indent: SUPTD_VETTING → INDENT_APPROVAL
 *   2. ApprovalChain(subject=INDENT, template=AD→DD→DP(N)→DGDP→SECY_DP) inserted.
 *
 * Mirrors StartITApprovalUseCase for the IT phase.
 */
export class EnterIndentApprovalUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly ids: IdFactory;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, indentId: string): Promise<{ chainId: string }> {
    if (!hasRole(ctx, Role.SUPTD, Role.ADMIN)) {
      throw new ForbiddenError('Only SUPTD may approve vetting and open the indent chain');
    }
    const log = this.deps.logger.child({ useCase: 'EnterIndentApproval', indentId, userId: ctx.userId });

    return this.deps.uow.run(async (h) => {
      const indent = await h.indents.findById(indentId);
      if (!indent) throw new NotFoundError('Indent', indentId);

      const existing = await h.chains.findBySubject(ApprovalSubject.INDENT, indent.id);
      if (existing) {
        throw new BusinessRuleViolationError('An indent approval chain already exists');
      }

      const now = this.deps.clock.now();
      indent.enterIndentApproval(ctx.userId);
      const chain = ApprovalChain.start(
        this.deps.ids.next(),
        ApprovalSubject.INDENT,
        indent.id,
        CHAIN_TEMPLATES.INDENT,
        () => this.deps.ids.next(),
        now,
      );

      await h.indents.save(indent);
      await h.chains.insert(chain);

      await h.audit.appendFromEvents(ctx.userId, indent.pullEvents(), {
        subjectType: 'INDENT',
        subjectId: indent.id,
      });
      await h.audit.appendFromEvents(ctx.userId, chain.pullEvents(), {
        subjectType: 'APPROVAL_INDENT',
        subjectId: chain.id,
      });

      log.info({ chainId: chain.id }, 'indent approval chain started');
      return { chainId: chain.id };
    });
  }
}
