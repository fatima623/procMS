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

export interface AdminFirmDto {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly ntn: string | null;
  readonly address: string | null;
  readonly city: string | null;
  readonly country: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly isActive: boolean;
  readonly isBlacklisted: boolean;
  readonly createdAt: string;
}

export interface UpsertFirmInput {
  readonly code: string;
  readonly name: string;
  readonly ntn?: string;
  readonly address?: string;
  readonly city?: string;
  readonly country?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly isActive?: boolean;
  readonly isBlacklisted?: boolean;
}

export class AdminFirmService {
  private requireAdmin(ctx: AuthContext): void {
    if (!hasRole(ctx, Role.ADMIN)) throw new ForbiddenError('Admin role required');
  }

  public async list(ctx: AuthContext, opts: { search?: string; page?: number; pageSize?: number } = {}): Promise<{ items: readonly AdminFirmDto[]; total: number; page: number; pageSize: number }> {
    this.requireAdmin(ctx);
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, opts.pageSize ?? 50));
    const where = opts.search
      ? { OR: [{ code: { contains: opts.search } }, { name: { contains: opts.search } }, { ntn: { contains: opts.search } }] }
      : {};
    const [rows, total] = await Promise.all([
      prisma.firm.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.firm.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDto(r)), total, page, pageSize };
  }

  public async get(ctx: AuthContext, id: string): Promise<AdminFirmDto> {
    this.requireAdmin(ctx);
    const r = await prisma.firm.findUnique({ where: { id } });
    if (!r) throw new NotFoundError('Firm', id);
    return this.toDto(r);
  }

  public async create(ctx: AuthContext, dto: UpsertFirmInput): Promise<AdminFirmDto> {
    this.requireAdmin(ctx);
    const existing = await prisma.firm.findUnique({ where: { code: dto.code } });
    if (existing) throw new BusinessRuleViolationError('Firm code already in use');
    const id = ulid();
    await prisma.$transaction(async (tx) => {
      await tx.firm.create({
        data: {
          id,
          code: dto.code,
          name: dto.name,
          ntn: dto.ntn ?? null,
          address: dto.address ?? null,
          city: dto.city ?? null,
          country: dto.country ?? null,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          isActive: dto.isActive ?? true,
          isBlacklisted: dto.isBlacklisted ?? false,
        },
      });
      await tx.auditLog.create({
        data: { id: ulid(), actorUserId: ctx.userId, action: 'admin.firm.created', subjectType: 'FIRM', subjectId: id, metadata: dto as unknown as Prisma.InputJsonValue },
      });
    });
    return this.get(ctx, id);
  }

  public async update(ctx: AuthContext, id: string, dto: Partial<UpsertFirmInput>): Promise<AdminFirmDto> {
    this.requireAdmin(ctx);
    const row = await prisma.firm.findUnique({ where: { id } });
    if (!row) throw new NotFoundError('Firm', id);
    if (dto.code && dto.code !== row.code) {
      const conflict = await prisma.firm.findUnique({ where: { code: dto.code } });
      if (conflict) throw new BusinessRuleViolationError('Firm code already in use');
    }
    await prisma.$transaction(async (tx) => {
      await tx.firm.update({
        where: { id },
        data: {
          ...(dto.code !== undefined ? { code: dto.code } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.ntn !== undefined ? { ntn: dto.ntn ?? null } : {}),
          ...(dto.address !== undefined ? { address: dto.address ?? null } : {}),
          ...(dto.city !== undefined ? { city: dto.city ?? null } : {}),
          ...(dto.country !== undefined ? { country: dto.country ?? null } : {}),
          ...(dto.email !== undefined ? { email: dto.email ?? null } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone ?? null } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.isBlacklisted !== undefined ? { isBlacklisted: dto.isBlacklisted } : {}),
        },
      });
      await tx.auditLog.create({
        data: { id: ulid(), actorUserId: ctx.userId, action: 'admin.firm.updated', subjectType: 'FIRM', subjectId: id, metadata: dto as unknown as Prisma.InputJsonValue },
      });
    });
    return this.get(ctx, id);
  }

  private toDto(r: {
    id: string; code: string; name: string;
    ntn: string | null; address: string | null; city: string | null; country: string | null;
    email: string | null; phone: string | null;
    isActive: boolean; isBlacklisted: boolean; createdAt: Date;
  }): AdminFirmDto {
    return {
      id: r.id, code: r.code, name: r.name,
      ntn: r.ntn, address: r.address, city: r.city, country: r.country,
      email: r.email, phone: r.phone,
      isActive: r.isActive, isBlacklisted: r.isBlacklisted,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
