import { Role } from '@prisma/client';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  NotFoundError,
} from '@/domain/errors/DomainError';
import {
  ApprovalChainStatus,
  ApprovalSubject,
} from '@/domain/approval/ApprovalTypes';

import type { AuthContext } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork, UnitOfWorkHandles } from '../ports/UnitOfWork';
import type { DecideApprovalDto } from './dto/DecideApprovalDto';
import { notificationService } from '../notification/NotificationService';

/**
 * Act on the current step of an approval chain. Side-effects, in order:
 *   1. Chain decides (APPROVED | REJECTED | RETURNED).
 *   2. If terminal, cascade the outcome to the owning entity:
 *      INDENT      → markIndentApproved / markIndentRejected
 *      IT_PROFORMA → ITPerforma.markChainApproved / rejected AND Indent.markITApproved / rollback
 *      CST         → CST.markChainApproved / rejected AND Indent.markPRIssued / rollback
 *   3. Audit log entries appended in the same transaction.
 */
export class ActOnApprovalUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, chainId: string, dto: DecideApprovalDto): Promise<void> {
    const log = this.deps.logger.child({ useCase: 'ActOnApproval', chainId, userId: ctx.userId });

    await this.deps.uow.run(async (h) => {
      const chain = await h.chains.findById(chainId);
      if (!chain) throw new NotFoundError('ApprovalChain', chainId);

      const current = chain.currentStep();
      if (!current) {
        throw new BusinessRuleViolationError('Chain is already complete');
      }
      if (!ctx.roles.includes(current.role) && !ctx.roles.includes(Role.ADMIN)) {
        throw new ForbiddenError(
          `This step requires role ${current.role}; caller does not hold it`,
        );
      }

      const now = this.deps.clock.now();
      chain.decide(ctx.userId, dto.decision, dto.comments ?? null, now);
      await h.chains.save(chain);
      await h.audit.appendFromEvents(ctx.userId, chain.pullEvents(), {
        subjectType: `APPROVAL_${chain.subject}`,
        subjectId: chain.id,
      });

      if (chain.status !== ApprovalChainStatus.PENDING) {
        await cascadeChainOutcome(h, ctx, chain.subject, chain.subjectId, chain.status, now);
      }

      log.info({ decision: dto.decision, chainStatus: chain.status }, 'approval acted');
    });
  }
}

/**
 * Dispatches a terminal chain outcome to the owning aggregate(s). Each
 * subject follows its own rules; the dispatch is kept as a single switch
 * (rather than per-subject handlers) because there are only three subjects
 * and the branches read like a specification.
 */
export async function cascadeChainOutcome(
  h: UnitOfWorkHandles,
  ctx: AuthContext,
  subject: ApprovalSubject,
  subjectId: string,
  finalStatus: ApprovalChainStatus,
  now: Date,
): Promise<void> {
  switch (subject) {
    case ApprovalSubject.INDENT: {
      const indent = await h.indents.findById(subjectId);
      if (!indent) throw new NotFoundError('Indent', subjectId);
      if (finalStatus === ApprovalChainStatus.APPROVED) {
        indent.markIndentApproved(ctx.userId);
      } else if (finalStatus === ApprovalChainStatus.REJECTED) {
        indent.markIndentRejected(ctx.userId, 'Rejected by approval chain');
      }
      await h.indents.save(indent);
      await h.audit.appendFromEvents(ctx.userId, indent.pullEvents(), {
        subjectType: 'INDENT',
        subjectId: indent.id,
      });
      // Notify the owning indenter of the chain outcome.
      await notificationService.notify({
        userId: indent.indenterId,
        type: finalStatus === ApprovalChainStatus.APPROVED ? 'indent.approved' : 'indent.rejected',
        title: finalStatus === ApprovalChainStatus.APPROVED
          ? `Indent ${indent.indentNumber} approved`
          : `Indent ${indent.indentNumber} rejected`,
        body: finalStatus === ApprovalChainStatus.APPROVED
          ? 'The indent-approval chain terminated APPROVED. Awaiting IT preparation.'
          : 'The indent-approval chain terminated REJECTED. See chain comments.',
        href: `/indents/${indent.id}`,
      });
      return;
    }

    case ApprovalSubject.IT_PROFORMA: {
      const it = await h.itProformas.findById(subjectId);
      if (!it) throw new NotFoundError('ITPerforma', subjectId);
      const indent = await h.indents.findById(it.indentId);
      if (!indent) throw new NotFoundError('Indent', it.indentId);

      if (finalStatus === ApprovalChainStatus.APPROVED) {
        it.markChainApproved(ctx.userId);
        indent.markITApproved(ctx.userId);
      } else if (finalStatus === ApprovalChainStatus.REJECTED) {
        it.markChainRejected(ctx.userId, 'Rejected by IT approval chain');
        // Indent stays in IT_APPROVAL; a separate rework command would be
        // issued by ADP to move it back to IT_PREPARATION. We don't auto-
        // rollback here to keep the trail explicit.
      }
      await h.itProformas.save(it);
      await h.indents.save(indent);
      await h.audit.appendFromEvents(ctx.userId, it.pullEvents(), {
        subjectType: 'IT_PROFORMA',
        subjectId: it.id,
      });
      await h.audit.appendFromEvents(ctx.userId, indent.pullEvents(), {
        subjectType: 'INDENT',
        subjectId: indent.id,
      });
      return;
    }

    case ApprovalSubject.CST: {
      const cst = await h.csts.findById(subjectId);
      if (!cst) throw new NotFoundError('CST', subjectId);
      const it = await h.itProformas.findById(cst.itPerformaId);
      if (!it) throw new NotFoundError('ITPerforma', cst.itPerformaId);
      const indent = await h.indents.findById(it.indentId);
      if (!indent) throw new NotFoundError('Indent', it.indentId);

      if (finalStatus === ApprovalChainStatus.APPROVED) {
        cst.markChainApproved(ctx.userId, now);
        // Indent stays in CST_APPROVAL until the PR is actually issued
        // (IssuePRUseCase moves it to PR_ISSUED). We do NOT advance it here
        // because the fax/PR is still a human step.
      } else if (finalStatus === ApprovalChainStatus.REJECTED) {
        cst.markChainRejected(ctx.userId, 'Rejected by CST approval chain');
      }
      await h.csts.save(cst);
      await h.audit.appendFromEvents(ctx.userId, cst.pullEvents(), {
        subjectType: 'CST',
        subjectId: cst.id,
      });
      // No audit for indent since we didn't change it in this branch
      void indent;
      return;
    }

    default:
      // Exhaustiveness guard
      throw new Error(`Unhandled approval subject: ${subject as string}`);
  }
}
