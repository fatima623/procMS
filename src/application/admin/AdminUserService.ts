import { Prisma, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/domain/errors/DomainError';
import { prisma } from '@/infrastructure/db/prisma';
import { ulid } from 'ulid';
import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';

/**
 * Thin admin service for user management. Lives in `application/admin/`
 * because it enforces real rules (password hashing, role allocation, soft
 * delete) even though there is no indent-style aggregate to rehydrate —
 * these are reference data, not procurement workflow objects.
 */

const BCRYPT_COST = 12;

export interface AdminUserDto {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly rank: string | null;
  readonly isActive: boolean;
  readonly firmId: string | null;
  readonly roles: readonly Role[];
  readonly sectionIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateUserInput {
  readonly email: string;
  readonly displayName: string;
  readonly password: string;
  readonly rank?: string;
  readonly roles: readonly Role[];
  readonly sectionIds: readonly string[];
  readonly firmId?: string;
}

export interface UpdateUserInput {
  readonly displayName?: string;
  readonly rank?: string | null;
  readonly isActive?: boolean;
  readonly roles?: readonly Role[];
  readonly sectionIds?: readonly string[];
  readonly firmId?: string | null;
}

export class AdminUserService {
  private requireAdmin(ctx: AuthContext): void {
    if (!hasRole(ctx, Role.ADMIN)) {
      throw new ForbiddenError('Admin role required');
    }
  }

  public async list(ctx: AuthContext, opts: { page?: number; pageSize?: number; search?: string } = {}): Promise<{ items: readonly AdminUserDto[]; total: number; page: number; pageSize: number }> {
    this.requireAdmin(ctx);
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, opts.pageSize ?? 50));
    const where = opts.search
      ? { OR: [{ email: { contains: opts.search } }, { displayName: { contains: opts.search } }] }
      : {};
    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { roles: true, memberships: true },
      }),
      prisma.user.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.toDto(r)),
      total,
      page,
      pageSize,
    };
  }

  public async get(ctx: AuthContext, id: string): Promise<AdminUserDto> {
    this.requireAdmin(ctx);
    const row = await prisma.user.findUnique({
      where: { id },
      include: { roles: true, memberships: true },
    });
    if (!row) throw new NotFoundError('User', id);
    return this.toDto(row);
  }

  public async create(ctx: AuthContext, dto: CreateUserInput): Promise<AdminUserDto> {
    this.requireAdmin(ctx);
    this.validateEmail(dto.email);
    this.validatePassword(dto.password);
    if (dto.roles.length === 0) {
      throw new ValidationError('At least one role is required', { roles: 'required' });
    }
    if (dto.roles.includes(Role.FIRM_REP) && !dto.firmId) {
      throw new BusinessRuleViolationError('FIRM_REP users must be linked to a firm');
    }
    if (!dto.roles.includes(Role.FIRM_REP) && dto.firmId) {
      throw new BusinessRuleViolationError('firmId is only valid for FIRM_REP users');
    }
    const existing = await prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new BusinessRuleViolationError('Email already in use');

    const id = ulid();
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id,
          email: dto.email.toLowerCase(),
          displayName: dto.displayName,
          passwordHash,
          rank: dto.rank ?? null,
          firmId: dto.firmId ?? null,
          roles: { create: [...new Set(dto.roles)].map((r) => ({ role: r })) },
          memberships: { create: [...new Set(dto.sectionIds)].map((sectionId) => ({ sectionId })) },
        },
      });
      await tx.auditLog.create({
        data: {
          id: ulid(),
          actorUserId: ctx.userId,
          action: 'admin.user.created',
          subjectType: 'USER',
          subjectId: id,
          metadata: { email: dto.email, roles: dto.roles, sectionIds: dto.sectionIds },
        },
      });
    });
    return this.get(ctx, id);
  }

  public async update(ctx: AuthContext, id: string, dto: UpdateUserInput): Promise<AdminUserDto> {
    this.requireAdmin(ctx);
    const existing = await prisma.user.findUnique({ where: { id }, include: { roles: true, memberships: true } });
    if (!existing) throw new NotFoundError('User', id);

    // Prevent an admin from locking themselves out by removing ADMIN role from the only admin.
    if (dto.roles !== undefined && !dto.roles.includes(Role.ADMIN)) {
      if (existing.roles.some((r) => r.role === Role.ADMIN)) {
        const admins = await prisma.userRole.count({ where: { role: Role.ADMIN } });
        if (admins <= 1) {
          throw new BusinessRuleViolationError('Cannot remove ADMIN from the last administrator');
        }
      }
    }
    if (dto.isActive === false && existing.id === ctx.userId) {
      throw new BusinessRuleViolationError('You cannot deactivate your own account');
    }

    const effectiveRoles = dto.roles ?? existing.roles.map((r) => r.role);
    const effectiveFirmId = dto.firmId === undefined ? existing.firmId : dto.firmId;
    if (effectiveRoles.includes(Role.FIRM_REP) && !effectiveFirmId) {
      throw new BusinessRuleViolationError('FIRM_REP users must be linked to a firm');
    }
    if (!effectiveRoles.includes(Role.FIRM_REP) && effectiveFirmId) {
      throw new BusinessRuleViolationError('firmId is only valid for FIRM_REP users');
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
          ...(dto.rank !== undefined ? { rank: dto.rank } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.firmId !== undefined ? { firmId: dto.firmId } : {}),
        },
      });
      if (dto.roles !== undefined) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({ data: [...new Set(dto.roles)].map((r) => ({ userId: id, role: r })) });
      }
      if (dto.sectionIds !== undefined) {
        await tx.sectionMember.deleteMany({ where: { userId: id } });
        if (dto.sectionIds.length > 0) {
          await tx.sectionMember.createMany({
            data: [...new Set(dto.sectionIds)].map((sectionId) => ({ userId: id, sectionId })),
          });
        }
      }
      await tx.auditLog.create({
        data: {
          id: ulid(),
          actorUserId: ctx.userId,
          action: 'admin.user.updated',
          subjectType: 'USER',
          subjectId: id,
          metadata: dto as unknown as Prisma.InputJsonValue,
        },
      });
    });
    return this.get(ctx, id);
  }

  public async resetPassword(ctx: AuthContext, id: string, newPassword: string): Promise<void> {
    this.requireAdmin(ctx);
    this.validatePassword(newPassword);
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    const res = await prisma.user.updateMany({ where: { id }, data: { passwordHash } });
    if (res.count === 0) throw new NotFoundError('User', id);
    await prisma.auditLog.create({
      data: {
        id: ulid(),
        actorUserId: ctx.userId,
        action: 'admin.user.password_reset',
        subjectType: 'USER',
        subjectId: id,
      },
    });
  }

  private toDto(row: {
    id: string; email: string; displayName: string; rank: string | null; isActive: boolean; firmId: string | null; createdAt: Date; updatedAt: Date;
    roles: { role: Role }[]; memberships: { sectionId: string }[];
  }): AdminUserDto {
    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      rank: row.rank,
      isActive: row.isActive,
      firmId: row.firmId,
      roles: row.roles.map((r) => r.role),
      sectionIds: row.memberships.map((m) => m.sectionId),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private validateEmail(email: string): void {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      throw new ValidationError('Invalid email', { email: 'invalid' });
    }
  }

  private validatePassword(pw: string): void {
    if (pw.length < 10) {
      throw new ValidationError('Password must be at least 10 characters', { password: 'too short' });
    }
  }
}
