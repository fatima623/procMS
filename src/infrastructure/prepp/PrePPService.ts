import { ulid } from 'ulid';
import { Prisma, Role, type PrePPKind } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { BusinessRuleViolationError, ForbiddenError, NotFoundError } from '@/domain/errors/DomainError';
import type { AuthContext } from '@/application/ports/AuthContext';
import { hasRole } from '@/application/ports/AuthContext';

/**
 * PrePPService: create a Pre-Purchase Proposal for a single-offer or
 * propriety indent, after its CST has been approved.
 */
export const prePPService = {
  async getByIndent(indentId: string) {
    return prisma.prePurchaseProposal.findUnique({ where: { indentId } });
  },

  async create(ctx: AuthContext, indentId: string, input: { kind: PrePPKind; justification: string }) {
    if (!hasRole(ctx, Role.ADP_STAFF, Role.COORD_STAFF, Role.ADMIN)) {
      throw new ForbiddenError('Not permitted to create a Pre-Purchase Proposal');
    }
    const indent = await prisma.indent.findUnique({
      where: { id: indentId },
      select: { id: true, status: true, type: true },
    });
    if (!indent) throw new NotFoundError('Indent', indentId);
    if (String(indent.status) !== 'CST_APPROVAL') {
      throw new BusinessRuleViolationError('A Pre-Purchase Proposal can only be created while the indent is in CST_APPROVAL');
    }
    const existing = await prisma.prePurchaseProposal.findUnique({ where: { indentId } });
    if (existing) throw new BusinessRuleViolationError('A Pre-Purchase Proposal already exists for this indent');

    const it = await prisma.iTPerforma.findUnique({ where: { indentId }, select: { id: true } });
    const cst = it
      ? await prisma.cST.findFirst({ where: { itPerformaId: it.id }, select: { singleQuote: true, status: true } })
      : null;
    if (!cst || String(cst.status) !== 'APPROVED') {
      throw new BusinessRuleViolationError('The CST must be APPROVED before a Pre-Purchase Proposal is created');
    }
    const eligible = cst.singleQuote === true || String(indent.type) === 'PROPRIETY';
    if (!eligible) {
      throw new BusinessRuleViolationError('Only single-quote or PROPRIETY indents need a Pre-Purchase Proposal');
    }

    const id = ulid();
    return prisma.$transaction(async (tx) => {
      const row = await tx.prePurchaseProposal.create({
        data: {
          id,
          indentId,
          kind: input.kind,
          justification: input.justification,
          recommendedByUserId: ctx.userId,
        },
      });
      await tx.auditLog.create({
        data: {
          id: ulid(), actorUserId: ctx.userId,
          action: 'prePP.created',
          subjectType: 'INDENT', subjectId: indentId,
          metadata: { prePPId: id, kind: input.kind } as Prisma.InputJsonValue,
        },
      });
      return row;
    });
  },
};