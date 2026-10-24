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
  CST_SINGLE_QUOTE_TEMPLATE,
} from '@/domain/approval/ApprovalTypes';
import { CSTStatus } from '@/domain/cst/CSTStatus';
import { IndentStatus } from '@/domain/indent/IndentStatus';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { IdFactory } from '../ports/IdFactory';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

export class StartCSTApprovalUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly ids: IdFactory;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, cstId: string): Promise<{ chainId: string }> {
    if (!hasRole(ctx, Role.ADP_STAFF, Role.COORD_STAFF, Role.ADMIN)) {
      throw new ForbiddenError('Not permitted to start CST approval');
    }
    return this.deps.uow.run(async (h) => {
      const cst = await h.csts.findById(cstId);
      if (!cst) throw new NotFoundError('CST', cstId);
      if (cst.status !== CSTStatus.DRAFT) {
        throw new BusinessRuleViolationError(
          `CST must be DRAFT to start approval (currently ${cst.status})`,
        );
      }
      const it = await h.itProformas.findById(cst.itPerformaId);
      if (!it) throw new NotFoundError('ITPerforma', cst.itPerformaId);
      const indent = await h.indents.findById(it.indentId);
      if (!indent) throw new NotFoundError('Indent', it.indentId);

      const existing = await h.chains.findBySubject(ApprovalSubject.CST, cst.id);
      if (existing) {
        throw new BusinessRuleViolationError('CST approval chain already exists');
      }

      const now = this.deps.clock.now();
      cst.startApproval(ctx.userId);
      indent.enterCSTApproval(ctx.userId);

      const template = cst.singleQuote ? CST_SINGLE_QUOTE_TEMPLATE : CHAIN_TEMPLATES.CST;
      const chain = ApprovalChain.start(
        this.deps.ids.next(),
        ApprovalSubject.CST,
        cst.id,
        template,
        () => this.deps.ids.next(),
        now,
      );

      await h.csts.save(cst);
      await h.indents.save(indent);
      await h.chains.insert(chain);

      await h.audit.appendFromEvents(ctx.userId, cst.pullEvents(), {
        subjectType: 'CST',
        subjectId: cst.id,
      });
      await h.audit.appendFromEvents(ctx.userId, indent.pullEvents(), {
        subjectType: 'INDENT',
        subjectId: indent.id,
      });
      await h.audit.appendFromEvents(ctx.userId, chain.pullEvents(), {
        subjectType: 'APPROVAL_CST',
        subjectId: chain.id,
      });

      this.deps.logger.info(
        { chainId: chain.id, template: template.length, singleQuote: cst.singleQuote },
        'CST approval chain started',
      );
      return { chainId: chain.id };
    });
  }
}
