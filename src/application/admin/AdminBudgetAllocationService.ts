import { Prisma, Role } from '@prisma/client';
import { ulid } from 'ulid';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  NotFoundError,
} from '@/domain/errors/DomainError';
import { prisma } from '@/infrastructure/db/prisma';
import { decimalToMinor, minorToDecimal } from '@/infrastructure/common/decimal';
import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';

export interface AdminBudgetAllocationDto {
  readonly id: string;
  readonly fiscalYearId: string;
  readonly fiscalYearLabel: string;
  readonly budgetHeadId: string;
  readonly budgetHeadCode: string;
  readonly sectionId: string | null;
  readonly sectionCode: string | null;
  readonly allocatedMinor: string;
  readonly reservedMinor: string;
  readonly spentMinor: string;
  readonly currency: string;
}

export interface UpsertBudgetAllocationInput {
  readonly fiscalYearId: string;
  readonly budgetHeadId: string;
  readonly sectionId?: string | null;
  /** Decimal main unit, e.g. "250000000.00". */
  readonly allocated: string;
  readonly currency?: string;
}

export class AdminBudgetAllocationService {
  private requireAdmin(ctx: AuthContext): void {
    if (!hasRole(ctx, Role.ADMIN)) throw new ForbiddenError('Admin role required');
  }

  public async list(ctx: AuthContext, opts: { page?: number; pageSize?: number } = {}): Promise<{ items: readonly AdminBudgetAllocationDto[]; total: number; page: number; pageSize: number }> {
    this.requireAdmin(ctx);
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, opts.pageSize ?? 50));
    const [rows, total] = await Promise.all([
      prisma.budgetAllocation.findMany({
        include: { fiscalYear: { select: { label: true } }, budgetHead: { select: { code: true } } },
        orderBy: [{ fiscalYear: { startsOn: 'desc' } }, { budgetHead: { code: 'asc' } }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.budgetAllocation.count(),
    ]);
    const sectionIds = rows.map((r) => r.sectionId).filter((s): s is string => !!s);
    const sections = sectionIds.length
      ? await prisma.section.findMany({ where: { id: { in: sectionIds } }, select: { id: true, code: true } })
      : [];
    const sectionCodeById = new Map(sections.map((s) => [s.id, s.code]));
    return {
      items: rows.map((r) => this.toDto(r, sectionCodeById)),
      total, page, pageSize,
    };
  }

  public async get(ctx: AuthContext, id: string): Promise<AdminBudgetAllocationDto> {
    this.requireAdmin(ctx);
    const r = await prisma.budgetAllocation.findUnique({
      where: { id },
      include: { fiscalYear: { select: { label: true } }, budgetHead: { select: { code: true } } },
    });
    if (!r) throw new NotFoundError('BudgetAllocation', id);
    const section = r.sectionId
      ? await prisma.section.findUnique({ where: { id: r.sectionId }, select: { code: true } })
      : null;
    return this.toDto(r, new Map(section ? [[r.sectionId!, section.code]] : []));
  }

  public async create(ctx: AuthContext, dto: UpsertBudgetAllocationInput): Promise<AdminBudgetAllocationDto> {
    this.requireAdmin(ctx);
    await this.assertRefs(dto);
    // Prisma composite-unique keys with a nullable column can't be queried
    // with the `where: compositeKey: { … }` form (SQL NULL is never equal),
    // so we fall back to findFirst and treat missing section as "unscoped".
    const existing = await prisma.budgetAllocation.findFirst({
      where: {
        fiscalYearId: dto.fiscalYearId,
        budgetHeadId: dto.budgetHeadId,
        sectionId: dto.sectionId ?? null,
      },
    });
    if (existing) {
      throw new BusinessRuleViolationError('Allocation already exists for this fiscal year / head / section');
    }
    const id = ulid();
    await prisma.$transaction(async (tx) => {
      await tx.budgetAllocation.create({
        data: {
          id,
          fiscalYearId: dto.fiscalYearId,
          budgetHeadId: dto.budgetHeadId,
          sectionId: dto.sectionId ?? null,
          allocated: minorToDecimal(decimalToMinor(dto.allocated)),
          currency: dto.currency ?? 'PKR',
        },
      });
      await tx.auditLog.create({
        data: {
          id: ulid(), actorUserId: ctx.userId,
          action: 'admin.budgetAllocation.created',
          subjectType: 'BUDGET_ALLOCATION', subjectId: id,
          metadata: dto as unknown as Prisma.InputJsonValue,
        },
      });
    });
    return this.get(ctx, id);
  }

  public async update(ctx: AuthContext, id: string, dto: Partial<UpsertBudgetAllocationInput>): Promise<AdminBudgetAllocationDto> {
    this.requireAdmin(ctx);
    const row = await prisma.budgetAllocation.findUnique({ where: { id } });
    if (!row) throw new NotFoundError('BudgetAllocation', id);
    await prisma.$transaction(async (tx) => {
      await tx.budgetAllocation.update({
        where: { id },
        data: {
          ...(dto.allocated !== undefined ? { allocated: minorToDecimal(decimalToMinor(dto.allocated)) } : {}),
          ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        },
      });
      await tx.auditLog.create({
        data: {
          id: ulid(), actorUserId: ctx.userId,
          action: 'admin.budgetAllocation.updated',
          subjectType: 'BUDGET_ALLOCATION', subjectId: id,
          metadata: dto as unknown as Prisma.InputJsonValue,
        },
      });
    });
    return this.get(ctx, id);
  }

  private async assertRefs(dto: UpsertBudgetAllocationInput): Promise<void> {
    const [fy, bh, section] = await Promise.all([
      prisma.fiscalYear.findUnique({ where: { id: dto.fiscalYearId }, select: { id: true } }),
      prisma.budgetHead.findUnique({ where: { id: dto.budgetHeadId }, select: { id: true } }),
      dto.sectionId ? prisma.section.findUnique({ where: { id: dto.sectionId }, select: { id: true } }) : Promise.resolve(null),
    ]);
    if (!fy) throw new NotFoundError('FiscalYear', dto.fiscalYearId);
    if (!bh) throw new NotFoundError('BudgetHead', dto.budgetHeadId);
    if (dto.sectionId && !section) throw new NotFoundError('Section', dto.sectionId);
  }

  private toDto(
    r: {
      id: string; fiscalYearId: string; budgetHeadId: string; sectionId: string | null;
      allocated: unknown; reserved: unknown; spent: unknown; currency: string;
      fiscalYear: { label: string }; budgetHead: { code: string };
    },
    sectionCodeById: Map<string, string>,
  ): AdminBudgetAllocationDto {
    return {
      id: r.id,
      fiscalYearId: r.fiscalYearId,
      fiscalYearLabel: r.fiscalYear.label,
      budgetHeadId: r.budgetHeadId,
      budgetHeadCode: r.budgetHead.code,
      sectionId: r.sectionId,
      sectionCode: r.sectionId ? sectionCodeById.get(r.sectionId) ?? null : null,
      allocatedMinor: decimalToMinor(r.allocated as string).toString(),
      reservedMinor: decimalToMinor(r.reserved as string).toString(),
      spentMinor: decimalToMinor(r.spent as string).toString(),
      currency: r.currency,
    };
  }
}
