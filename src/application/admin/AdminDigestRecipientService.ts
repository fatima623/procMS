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

// Narrow cast while Prisma client regen is pending for DigestRecipient.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dx: any = prisma;

export interface DigestRecipientDto {
  readonly id: string;
  readonly email: string;
  readonly label: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
}

export interface UpsertDigestRecipientInput {
  readonly email: string;
  readonly label?: string;
  readonly isActive?: boolean;
}

export class AdminDigestRecipientService {
  private requireAdmin(ctx: AuthContext): void {
    if (!hasRole(ctx, Role.ADMIN)) throw new ForbiddenError('Admin role required');
  }

  public async list(ctx: AuthContext): Promise<readonly DigestRecipientDto[]> {
    this.requireAdmin(ctx);
    const rows = await dx.digestRecipient.findMany({ orderBy: { email: 'asc' } });
    return rows.map((r: { id: string; email: string; label: string | null; isActive: boolean; createdAt: Date }) => this.toDto(r));
  }

  public async create(ctx: AuthContext, dto: UpsertDigestRecipientInput): Promise<DigestRecipientDto> {
    this.requireAdmin(ctx);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email)) {
      throw new BusinessRuleViolationError('Invalid email');
    }
    const existing = await dx.digestRecipient.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new BusinessRuleViolationError('Already on the list');

    const id = ulid();
    await prisma.$transaction([
      dx.digestRecipient.create({
        data: { id, email: dto.email.toLowerCase(), label: dto.label ?? null, isActive: dto.isActive ?? true },
      }),
      prisma.auditLog.create({
        data: {
          id: ulid(), actorUserId: ctx.userId, action: 'admin.digestRecipient.created',
          subjectType: 'DIGEST_RECIPIENT', subjectId: id,
          metadata: dto as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);
    const row = await dx.digestRecipient.findUnique({ where: { id } });
    return this.toDto(row);
  }

  public async update(ctx: AuthContext, id: string, dto: Partial<UpsertDigestRecipientInput>): Promise<DigestRecipientDto> {
    this.requireAdmin(ctx);
    const row = await dx.digestRecipient.findUnique({ where: { id } });
    if (!row) throw new NotFoundError('DigestRecipient', id);
    await prisma.$transaction([
      dx.digestRecipient.update({
        where: { id },
        data: {
          ...(dto.email !== undefined ? { email: dto.email.toLowerCase() } : {}),
          ...(dto.label !== undefined ? { label: dto.label ?? null } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      }),
      prisma.auditLog.create({
        data: {
          id: ulid(), actorUserId: ctx.userId, action: 'admin.digestRecipient.updated',
          subjectType: 'DIGEST_RECIPIENT', subjectId: id,
          metadata: dto as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);
    const updated = await dx.digestRecipient.findUnique({ where: { id } });
    return this.toDto(updated);
  }

  public async delete(ctx: AuthContext, id: string): Promise<void> {
    this.requireAdmin(ctx);
    const row = await dx.digestRecipient.findUnique({ where: { id } });
    if (!row) throw new NotFoundError('DigestRecipient', id);
    await prisma.$transaction([
      dx.digestRecipient.delete({ where: { id } }),
      prisma.auditLog.create({
        data: {
          id: ulid(), actorUserId: ctx.userId, action: 'admin.digestRecipient.deleted',
          subjectType: 'DIGEST_RECIPIENT', subjectId: id,
        },
      }),
    ]);
  }

  /** Called by the digest sender to collect the active list. */
  public async listActiveEmails(): Promise<readonly string[]> {
    const rows = await dx.digestRecipient.findMany({ where: { isActive: true }, select: { email: true } });
    return rows.map((r: { email: string }) => r.email);
  }

  private toDto(r: { id: string; email: string; label: string | null; isActive: boolean; createdAt: Date }): DigestRecipientDto {
    return { id: r.id, email: r.email, label: r.label, isActive: r.isActive, createdAt: r.createdAt.toISOString() };
  }
}

export const digestRecipientService = new AdminDigestRecipientService();
