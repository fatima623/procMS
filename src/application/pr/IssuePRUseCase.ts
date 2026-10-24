import { Role } from '@prisma/client';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  NotFoundError,
} from '@/domain/errors/DomainError';
import { PurchaseRequisition } from '@/domain/pr/PurchaseRequisition';
import { CSTStatus } from '@/domain/cst/CSTStatus';
import { IndentStatus } from '@/domain/indent/IndentStatus';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { IdFactory } from '../ports/IdFactory';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';
import { notificationService } from '../notification/NotificationService';
import { prisma } from '@/infrastructure/db/prisma';

export interface IssuePRDto {
  readonly cstId: string;
  readonly prNumber: string;        // e.g. "PR/2026/00123"
}

/**
 * Section issues the Purchase Requisition for the winning firm after CST
 * approval. In one transaction:
 *   1. Create the PR aggregate pointing at the CST's recommended award.
 *   2. Price pulled from the recommended commercial offer.
 *   3. Indent transitions CST_APPROVAL → PR_ISSUED.
 * Separate commands (/send, /acknowledge, /close) handle the subsequent
 * lifecycle.
 */
export class IssuePRUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly ids: IdFactory;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, dto: IssuePRDto): Promise<{ prId: string; prNumber: string }> {
    if (!hasRole(ctx, Role.ADP_STAFF, Role.COORD_STAFF, Role.ADMIN)) {
      throw new ForbiddenError('Not permitted to issue PR');
    }

    return this.deps.uow.run(async (h) => {
      const cst = await h.csts.findById(dto.cstId);
      if (!cst) throw new NotFoundError('CST', dto.cstId);
      if (cst.status !== CSTStatus.APPROVED) {
        throw new BusinessRuleViolationError(
          `CST must be APPROVED to issue PR (currently ${cst.status})`,
        );
      }
      if (await h.prs.findByCST(dto.cstId)) {
        throw new BusinessRuleViolationError('PR already issued for this CST');
      }
      if (await h.prs.findByPRNumber(dto.prNumber)) {
        throw new BusinessRuleViolationError(`PR number ${dto.prNumber} already in use`);
      }

      const award = cst.recommendedAward();
      const winningOffer = await h.commercialOffers.findById(award.commercialOfferId);
      if (!winningOffer) throw new NotFoundError('CommercialOffer', award.commercialOfferId);

      const it = await h.itProformas.findById(cst.itPerformaId);
      if (!it) throw new NotFoundError('ITPerforma', cst.itPerformaId);
      const indent = await h.indents.findById(it.indentId);
      if (!indent) throw new NotFoundError('Indent', it.indentId);
      if (indent.status !== IndentStatus.CST_APPROVAL) {
        throw new BusinessRuleViolationError(
          `Indent must be CST_APPROVAL to issue PR (currently ${indent.status})`,
        );
      }

      const now = this.deps.clock.now();
      const pr = PurchaseRequisition.create(
        this.deps.ids.next(),
        {
          cstId: cst.id,
          firmId: award.firmId,
          prNumber: dto.prNumber,
          amount: winningOffer.totalPrice,
        },
        now,
      );
      indent.markPRIssued(ctx.userId);

      await h.prs.insert(pr);
      await h.indents.save(indent);

      await h.audit.appendFromEvents(ctx.userId, pr.pullEvents(), {
        subjectType: 'PR',
        subjectId: pr.id,
      });
      await h.audit.appendFromEvents(ctx.userId, indent.pullEvents(), {
        subjectType: 'INDENT',
        subjectId: indent.id,
      });

      this.deps.logger.info(
        { prId: pr.id, prNumber: pr.prNumber, firmId: pr.firmId },
        'PR issued',
      );

      // Notify every FIRM_REP user linked to the winning firm.
      const firmReps = await prisma.user.findMany({
        where: { firmId: award.firmId, isActive: true, roles: { some: { role: 'FIRM_REP' } } },
        select: { id: true },
      });
      if (firmReps.length > 0) {
        await notificationService.notifyMany(firmReps.map((u) => ({
          userId: u.id,
          type: 'pr.issued',
          title: `Purchase requisition issued: ${pr.prNumber}`,
          body: 'Review the PR and acknowledge receipt.',
          href: '/firm/prs',
        })));
      }
      return { prId: pr.id, prNumber: pr.prNumber };
    });
  }
}
