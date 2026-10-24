import { Prisma, Role } from '@prisma/client';
import { ulid } from 'ulid';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/domain/errors/DomainError';
import { prisma } from '@/infrastructure/db/prisma';
import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';

export interface AdminFiscalYearDto {
  readonly id: string;
  readonly label: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly isActive: boolean;
  readonly indentCount: number;
  readonly createdAt: string;
}

export interface UpsertFiscalYearInput {
  readonly label: string;
  readonly startsOn: string; // ISO date (yyyy-mm-dd)
  readonly endsOn: string;
  readonly isActive?: boolean;
}

export class AdminFiscalYearService {
  private requireAdmin(ctx: AuthContext): void {
    if (!hasRole(ctx, Role.ADMIN)) throw new ForbiddenError('Admin role required');
  }

  public async list(ctx: AuthContext): Promise<readonly AdminFiscalYearDto[]> {
    this.requireAdmin(ctx);
    const rows = await prisma.fiscalYear.findMany({
      orderBy: { startsOn: 'desc' },
      include: { _count: { select: { indents: true } } },
    });
    return rows.map((r) => this.toDto(r));
  }

  public async get(ctx: AuthContext, id: string): Promise<AdminFiscalYearDto> {
    this.requireAdmin(ctx);
    const r = await prisma.fiscalYear.findUnique({
      where: { id },
      include: { _count: { select: { indents: true } } },
    });
    if (!r) throw new NotFoundError('FiscalYear', id);
    return this.toDto(r);
  }

  public async create(ctx: AuthContext, dto: UpsertFiscalYearInput): Promise<AdminFiscalYearDto> {
    this.requireAdmin(ctx);
    this.validateRange(dto.startsOn, dto.endsOn);
    const existing = await prisma.fiscalYear.findUnique({ where: { label: dto.label } });
    if (existing) throw new BusinessRuleViolationError('Fiscal year label already in use');
    const id = ulid();
    await prisma.$transaction(async (tx) => {
      if (dto.isActive) {
        await tx.fiscalYear.updateMany({ where: { isActive: true }, data: { isActive: false } });
      }
      await tx.fiscalYear.create({
        data: {
          id, label: dto.label,
          startsOn: new Date(dto.startsOn),
          endsOn: new Date(dto.endsOn),
          isActive: dto.isActive ?? false,
        },
      });
      await tx.auditLog.create({
        data: { id: ulid(), actorUserId: ctx.userId, action: 'admin.fiscalYear.created', subjectType: 'FISCAL_YEAR', subjectId: id, metadata: dto as unknown as Prisma.InputJsonValue },
      });
    });
    return this.get(ctx, id);
  }

  public async update(ctx: AuthContext, id: string, dto: Partial<UpsertFiscalYearInput>): Promise<AdminFiscalYearDto> {
    this.requireAdmin(ctx);
    const row = await prisma.fiscalYear.findUnique({ where: { id } });
    if (!row) throw new NotFoundError('FiscalYear', id);
    const nextStart = dto.startsOn ?? row.startsOn.toISOString().slice(0, 10);
    const nextEnd = dto.endsOn ?? row.endsOn.toISOString().slice(0, 10);
    this.validateRange(nextStart, nextEnd);
    if (dto.label && dto.label !== row.label) {
      const conflict = await prisma.fiscalYear.findUnique({ where: { label: dto.label } });
      if (conflict) throw new BusinessRuleViolationError('Label already in use');
    }
    await prisma.$transaction(async (tx) => {
      if (dto.isActive) {
        await tx.fiscalYear.updateMany({ where: { isActive: true, id: { not: id } }, data: { isActive: false } });
      }
      await tx.fiscalYear.update({
        where: { id },
        data: {
          ...(dto.label !== undefined ? { label: dto.label } : {}),
          ...(dto.startsOn !== undefined ? { startsOn: new Date(dto.startsOn) } : {}),
          ...(dto.endsOn !== undefined ? { endsOn: new Date(dto.endsOn) } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
      await tx.auditLog.create({
        data: { id: ulid(), actorUserId: ctx.userId, action: 'admin.fiscalYear.updated', subjectType: 'FISCAL_YEAR', subjectId: id, metadata: dto as unknown as Prisma.InputJsonValue },
      });
    });
    return this.get(ctx, id);
  }

  private validateRange(start: string, end: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      throw new ValidationError('Dates must be YYYY-MM-DD');
    }
    if (new Date(start).getTime() >= new Date(end).getTime()) {
      throw new ValidationError('startsOn must be before endsOn', { startsOn: 'before end' });
    }
  }

  private toDto(r: {
    id: string; label: string; startsOn: Date; endsOn: Date; isActive: boolean; createdAt: Date;
    _count: { indents: number };
  }): AdminFiscalYearDto {
    return {
      id: r.id, label: r.label,
      startsOn: r.startsOn.toISOString().slice(0, 10),
      endsOn: r.endsOn.toISOString().slice(0, 10),
      isActive: r.isActive,
      indentCount: r._count.indents,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
