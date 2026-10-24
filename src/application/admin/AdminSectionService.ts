import { Prisma, Role, SectionKind } from '@prisma/client';
import { ulid } from 'ulid';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  NotFoundError,
} from '@/domain/errors/DomainError';
import { prisma } from '@/infrastructure/db/prisma';
import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';

export interface AdminSectionDto {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly kind: SectionKind;
  readonly parentId: string | null;
  readonly isActive: boolean;
  readonly memberCount: number;
  readonly createdAt: string;
}

export interface UpsertSectionInput {
  readonly code: string;
  readonly name: string;
  readonly kind: SectionKind;
  readonly parentId?: string | null;
  readonly isActive?: boolean;
}

export class AdminSectionService {
  private requireAdmin(ctx: AuthContext): void {
    if (!hasRole(ctx, Role.ADMIN)) throw new ForbiddenError('Admin role required');
  }

  public async list(ctx: AuthContext): Promise<readonly AdminSectionDto[]> {
    this.requireAdmin(ctx);
    const rows = await prisma.section.findMany({
      orderBy: [{ kind: 'asc' }, { code: 'asc' }],
      include: { _count: { select: { members: true } } },
    });
    return rows.map((r) => ({
      id: r.id, code: r.code, name: r.name, kind: r.kind,
      parentId: r.parentId, isActive: r.isActive,
      memberCount: r._count.members, createdAt: r.createdAt.toISOString(),
    }));
  }

  public async get(ctx: AuthContext, id: string): Promise<AdminSectionDto> {
    this.requireAdmin(ctx);
    const r = await prisma.section.findUnique({ where: { id }, include: { _count: { select: { members: true } } } });
    if (!r) throw new NotFoundError('Section', id);
    return { id: r.id, code: r.code, name: r.name, kind: r.kind, parentId: r.parentId, isActive: r.isActive, memberCount: r._count.members, createdAt: r.createdAt.toISOString() };
  }

  public async create(ctx: AuthContext, dto: UpsertSectionInput): Promise<AdminSectionDto> {
    this.requireAdmin(ctx);
    const existing = await prisma.section.findUnique({ where: { code: dto.code } });
    if (existing) throw new BusinessRuleViolationError('Section code already in use');
    if (dto.parentId) {
      const parent = await prisma.section.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundError('Parent section', dto.parentId);
    }
    const id = ulid();
    await prisma.$transaction(async (tx) => {
      await tx.section.create({
        data: {
          id, code: dto.code, name: dto.name, kind: dto.kind,
          parentId: dto.parentId ?? null,
          isActive: dto.isActive ?? true,
        },
      });
      await tx.auditLog.create({
        data: { id: ulid(), actorUserId: ctx.userId, action: 'admin.section.created', subjectType: 'SECTION', subjectId: id, metadata: dto as unknown as Prisma.InputJsonValue },
      });
    });
    return this.get(ctx, id);
  }

  public async update(ctx: AuthContext, id: string, dto: Partial<UpsertSectionInput>): Promise<AdminSectionDto> {
    this.requireAdmin(ctx);
    const row = await prisma.section.findUnique({ where: { id } });
    if (!row) throw new NotFoundError('Section', id);
    if (dto.code && dto.code !== row.code) {
      const conflict = await prisma.section.findUnique({ where: { code: dto.code } });
      if (conflict) throw new BusinessRuleViolationError('Section code already in use');
    }
    if (dto.parentId === id) {
      throw new BusinessRuleViolationError('A section cannot be its own parent');
    }
    await prisma.$transaction(async (tx) => {
      await tx.section.update({
        where: { id },
        data: {
          ...(dto.code !== undefined ? { code: dto.code } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
          ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
      await tx.auditLog.create({
        data: { id: ulid(), actorUserId: ctx.userId, action: 'admin.section.updated', subjectType: 'SECTION', subjectId: id, metadata: dto as unknown as Prisma.InputJsonValue },
      });
    });
    return this.get(ctx, id);
  }
}
