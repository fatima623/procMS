import { Prisma, Role } from '@prisma/client';
import { ulid } from 'ulid';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  NotFoundError,
} from '@/domain/errors/DomainError';
import { prisma } from '@/infrastructure/db/prisma';
import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';

export interface AdminBudgetHeadDto {
  readonly id: string;
  readonly code: string;
  readonly description: string;
  readonly isActive: boolean;
  readonly indentCount: number;
  readonly createdAt: string;
}

export interface UpsertBudgetHeadInput {
  readonly code: string;
  readonly description: string;
  readonly isActive?: boolean;
}

export class AdminBudgetHeadService {
  private requireAdmin(ctx: AuthContext): void {
    if (!hasRole(ctx, Role.ADMIN)) throw new ForbiddenError('Admin role required');
  }

  public async list(ctx: AuthContext): Promise<readonly AdminBudgetHeadDto[]> {
    this.requireAdmin(ctx);
    const rows = await prisma.budgetHead.findMany({
      orderBy: { code: 'asc' },
      include: { _count: { select: { indents: true } } },
    });
    return rows.map((r) => ({ id: r.id, code: r.code, description: r.description, isActive: r.isActive, indentCount: r._count.indents, createdAt: r.createdAt.toISOString() }));
  }

  public async get(ctx: AuthContext, id: string): Promise<AdminBudgetHeadDto> {
    this.requireAdmin(ctx);
    const r = await prisma.budgetHead.findUnique({ where: { id }, include: { _count: { select: { indents: true } } } });
    if (!r) throw new NotFoundError('BudgetHead', id);
    return { id: r.id, code: r.code, description: r.description, isActive: r.isActive, indentCount: r._count.indents, createdAt: r.createdAt.toISOString() };
  }

  public async create(ctx: AuthContext, dto: UpsertBudgetHeadInput): Promise<AdminBudgetHeadDto> {
    this.requireAdmin(ctx);
    const existing = await prisma.budgetHead.findUnique({ where: { code: dto.code } });
    if (existing) throw new BusinessRuleViolationError('Budget head code already in use');
    const id = ulid();
    await prisma.$transaction(async (tx) => {
      await tx.budgetHead.create({ data: { id, code: dto.code, description: dto.description, isActive: dto.isActive ?? true } });
      await tx.auditLog.create({
        data: { id: ulid(), actorUserId: ctx.userId, action: 'admin.budgetHead.created', subjectType: 'BUDGET_HEAD', subjectId: id, metadata: dto as unknown as Prisma.InputJsonValue },
      });
    });
    return this.get(ctx, id);
  }

  public async update(ctx: AuthContext, id: string, dto: Partial<UpsertBudgetHeadInput>): Promise<AdminBudgetHeadDto> {
    this.requireAdmin(ctx);
    const row = await prisma.budgetHead.findUnique({ where: { id } });
    if (!row) throw new NotFoundError('BudgetHead', id);
    if (dto.code && dto.code !== row.code) {
      const conflict = await prisma.budgetHead.findUnique({ where: { code: dto.code } });
      if (conflict) throw new BusinessRuleViolationError('Code already in use');
    }
    await prisma.$transaction(async (tx) => {
      await tx.budgetHead.update({
        where: { id },
        data: {
          ...(dto.code !== undefined ? { code: dto.code } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
      await tx.auditLog.create({
        data: { id: ulid(), actorUserId: ctx.userId, action: 'admin.budgetHead.updated', subjectType: 'BUDGET_HEAD', subjectId: id, metadata: dto as unknown as Prisma.InputJsonValue },
      });
    });
    return this.get(ctx, id);
  }
}
