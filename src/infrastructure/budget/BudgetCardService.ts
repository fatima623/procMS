import { ulid } from 'ulid';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { BusinessRuleViolationError, ForbiddenError, NotFoundError } from '@/domain/errors/DomainError';
import type { AuthContext } from '@/application/ports/AuthContext';
import { hasRole } from '@/application/ports/AuthContext';

/**
 * BudgetCardService: Prepare / Clear / Commit for the per-indent Budget Card.
 * Prepare  -> reserves the indent's estimated value on BudgetAllocation.
 * Clear    -> marks the card cleared (no number change: no "firm reserve" column exists).
 * Commit   -> moves the amount from reserved to spent.
 * Each action runs in one DB transaction so numbers can never be half-updated.
 */
export const budgetCardService = {
  async getByIndent(indentId: string) {
    return prisma.budgetCard.findUnique({ where: { indentId } });
  },

  async prepare(ctx: AuthContext, indentId: string, notes?: string) {
    if (!hasRole(ctx, Role.BUDGET_STAFF, Role.ADMIN)) {
      throw new ForbiddenError('Only Budget Section may prepare a Budget Card');
    }
    const indent = await prisma.indent.findUnique({ where: { id: indentId } });
    if (!indent) throw new NotFoundError('Indent', indentId);
    if (String(indent.status) !== 'BUDGET_CHECK') {
      throw new BusinessRuleViolationError('Budget Card can only be prepared while the indent is in BUDGET_CHECK');
    }
    const existing = await prisma.budgetCard.findUnique({ where: { indentId } });
    if (existing) throw new BusinessRuleViolationError('A Budget Card already exists for this indent');

    const fy = await prisma.fiscalYear.findUnique({ where: { id: indent.fiscalYearId } });
    if (!fy) throw new NotFoundError('FiscalYear', indent.fiscalYearId);

    const allocations = await prisma.budgetAllocation.findMany({
      where: { fiscalYearId: indent.fiscalYearId, budgetHeadId: indent.budgetHeadId },
    });
    const allocation = allocations.find((a) => a.sectionId === indent.sectionId) ?? allocations.find((a) => a.sectionId === null) ?? allocations[0];
    if (!allocation) throw new BusinessRuleViolationError('No budget allocation exists for this fiscal year and budget head');

    const amount = indent.estimatedValue;
    const available = allocation.allocated.minus(allocation.reserved).minus(allocation.spent);
    if (available.lessThan(amount)) {
      throw new BusinessRuleViolationError('Insufficient funds in the budget allocation');
    }

    const id = ulid();
    return prisma.$transaction(async (tx) => {
      const count = await tx.budgetCard.count({ where: { fiscalYearId: fy.id } });
      const controlNumber = `BC/${fy.label}/${String(count + 1).padStart(6, '0')}`;
      await tx.budgetAllocation.update({
        where: { id: allocation.id },
        data: { reserved: { increment: amount }, version: { increment: 1 } },
      });
      const card = await tx.budgetCard.create({
        data: {
          id,
          indentId,
          controlNumber,
          fiscalYearId: indent.fiscalYearId,
          budgetHeadId: indent.budgetHeadId,
          reservedAmount: amount,
          currency: indent.currency,
          preparedByUserId: ctx.userId,
          notes: notes ?? null,
        },
      });
      await tx.auditLog.create({
        data: {
          id: ulid(), actorUserId: ctx.userId,
          action: 'budgetCard.prepared',
          subjectType: 'INDENT', subjectId: indentId,
          metadata: { controlNumber } as Prisma.InputJsonValue,
        },
      });
      return card;
    });
  },

  async clear(ctx: AuthContext, indentId: string) {
    if (!hasRole(ctx, Role.BUDGET_STAFF, Role.ADMIN)) {
      throw new ForbiddenError('Only Budget Section may clear a Budget Card');
    }
    const card = await prisma.budgetCard.findUnique({ where: { indentId } });
    if (!card) throw new NotFoundError('BudgetCard', indentId);
    if (card.clearedAt) throw new BusinessRuleViolationError('Budget Card is already cleared');
    const indent = await prisma.indent.findUnique({ where: { id: indentId }, select: { status: true } });
    if (!indent || String(indent.status) !== 'PR_ISSUED') {
      throw new BusinessRuleViolationError('Budget Card can only be cleared once the PR is issued');
    }
    return prisma.$transaction(async (tx) => {
      const updated = await tx.budgetCard.update({
        where: { indentId },
        data: { clearedAt: new Date(), clearedByUserId: ctx.userId, version: { increment: 1 } },
      });
      await tx.auditLog.create({
        data: {
          id: ulid(), actorUserId: ctx.userId,
          action: 'budgetCard.cleared',
          subjectType: 'INDENT', subjectId: indentId,
          metadata: { controlNumber: card.controlNumber } as Prisma.InputJsonValue,
        },
      });
      return updated;
    });
  },

  async commit(ctx: AuthContext, indentId: string) {
    if (!hasRole(ctx, Role.BUDGET_STAFF, Role.ADMIN)) {
      throw new ForbiddenError('Only Budget Section may commit a Budget Card');
    }
    const card = await prisma.budgetCard.findUnique({ where: { indentId } });
    if (!card) throw new NotFoundError('BudgetCard', indentId);
    if (!card.clearedAt) throw new BusinessRuleViolationError('Budget Card must be cleared before it is committed');
    if (card.committedAt) throw new BusinessRuleViolationError('Budget Card is already committed');
    const contract = await prisma.contract.findUnique({ where: { indentId } });
    if (!contract || String(contract.status) !== 'SIGNED') {
      throw new BusinessRuleViolationError('Budget Card can only be committed once the contract is SIGNED');
    }
    const allocations = await prisma.budgetAllocation.findMany({
      where: { fiscalYearId: card.fiscalYearId, budgetHeadId: card.budgetHeadId },
    });
    const indent = await prisma.indent.findUnique({ where: { id: indentId }, select: { sectionId: true } });
    const allocation = allocations.find((a) => a.sectionId === indent?.sectionId) ?? allocations.find((a) => a.sectionId === null) ?? allocations[0];
    if (!allocation) throw new NotFoundError('BudgetAllocation', card.budgetHeadId);

    return prisma.$transaction(async (tx) => {
      await tx.budgetAllocation.update({
        where: { id: allocation.id },
        data: {
          reserved: { decrement: card.reservedAmount },
          spent: { increment: card.reservedAmount },
          version: { increment: 1 },
        },
      });
      const updated = await tx.budgetCard.update({
        where: { indentId },
        data: { committedAt: new Date(), committedByUserId: ctx.userId, version: { increment: 1 } },
      });
      await tx.auditLog.create({
        data: {
          id: ulid(), actorUserId: ctx.userId,
          action: 'budgetCard.committed',
          subjectType: 'INDENT', subjectId: indentId,
          metadata: { controlNumber: card.controlNumber } as Prisma.InputJsonValue,
        },
      });
      return updated;
    });
  },
};