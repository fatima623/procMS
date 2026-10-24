import { prisma } from '@/infrastructure/db/prisma';

export interface AuditRow {
  readonly id: string;
  readonly actorUserId: string | null;
  readonly actorName: string | null;
  readonly action: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly metadata: unknown;
  readonly occurredAt: string;
}

export interface AuditFilters {
  readonly action?: string;        // substring match on action
  readonly subjectType?: string;   // exact match
  readonly subjectId?: string;     // exact match
  readonly actorEmail?: string;    // substring match on user.email
  readonly page?: number;
  readonly pageSize?: number;
}

export interface AuditPage {
  readonly items: readonly AuditRow[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly distinctSubjects: readonly string[];
  readonly distinctActions: readonly string[];
}

/**
 * Query the audit log with filters. Admin-only; the HTTP layer / page is
 * responsible for enforcing the role.
 */
export async function loadAuditLog(f: AuditFilters = {}): Promise<AuditPage> {
  const page = Math.max(1, f.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, f.pageSize ?? 50));

  const actorIds = f.actorEmail
    ? (await prisma.user.findMany({
        where: { email: { contains: f.actorEmail } },
        select: { id: true },
      })).map((u) => u.id)
    : null;

  const where = {
    ...(f.action ? { action: { contains: f.action } } : {}),
    ...(f.subjectType ? { subjectType: f.subjectType } : {}),
    ...(f.subjectId ? { subjectId: f.subjectId } : {}),
    ...(actorIds !== null ? { actorUserId: { in: actorIds.length > 0 ? actorIds : ['_none_'] } } : {}),
  };

  const [rows, total, allSubjects, allActions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ['subjectType'], select: { subjectType: true }, take: 50 }),
    prisma.auditLog.findMany({ distinct: ['action'], select: { action: true }, take: 100 }),
  ]);

  const actorUserIds = [...new Set(rows.map((r) => r.actorUserId).filter((v): v is string => !!v))];
  const users = actorUserIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorUserIds } }, select: { id: true, displayName: true } })
    : [];
  const nameById = new Map(users.map((u) => [u.id, u.displayName]));

  return {
    items: rows.map((r) => ({
      id: r.id,
      actorUserId: r.actorUserId,
      actorName: r.actorUserId ? nameById.get(r.actorUserId) ?? null : null,
      action: r.action,
      subjectType: r.subjectType,
      subjectId: r.subjectId,
      metadata: r.metadata,
      occurredAt: r.occurredAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    distinctSubjects: [...new Set(allSubjects.map((s) => s.subjectType))].sort(),
    distinctActions: [...new Set(allActions.map((a) => a.action))].sort(),
  };
}
