import { Role } from '@prisma/client';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  NotFoundError,
} from '@/domain/errors/DomainError';
import { IndentStatus } from '@/domain/indent/IndentStatus';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

/**
 * Section closes the PR. Side-effect: the owning Indent also closes
 * (PR_ISSUED → CLOSED). Only allowed when the PR has been acknowledged.
 */
export class ClosePRUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, prId: string): Promise<void> {
    if (!hasRole(ctx, Role.ADP_STAFF, Role.COORD_STAFF, Role.ADMIN)) {
      throw new ForbiddenError('Not permitted to close PR');
    }
    await this.deps.uow.run(async (h) => {
      const pr = await h.prs.findById(prId);
      if (!pr) throw new NotFoundError('PR', prId);
      pr.close(ctx.userId);
      await h.prs.save(pr);

      const cst = await h.csts.findById(pr.cstId);
      if (!cst) throw new NotFoundError('CST', pr.cstId);
      const it = await h.itProformas.findById(cst.itPerformaId);
      if (!it) throw new NotFoundError('ITPerforma', cst.itPerformaId);
      const indent = await h.indents.findById(it.indentId);
      if (!indent) throw new NotFoundError('Indent', it.indentId);
      if (indent.status !== IndentStatus.PR_ISSUED) {
        throw new BusinessRuleViolationError(
          `Indent must be PR_ISSUED to close (currently ${indent.status})`,
        );
      }
      indent.close(ctx.userId);
      await h.indents.save(indent);

      await h.audit.appendFromEvents(ctx.userId, pr.pullEvents(), {
        subjectType: 'PR',
        subjectId: pr.id,
      });
      await h.audit.appendFromEvents(ctx.userId, indent.pullEvents(), {
        subjectType: 'INDENT',
        subjectId: indent.id,
      });
      this.deps.logger.info({ prId: pr.id, indentId: indent.id }, 'PR + indent closed');
    });
  }
}
