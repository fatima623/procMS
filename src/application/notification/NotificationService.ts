import { ulid } from 'ulid';
import { prisma } from '@/infrastructure/db/prisma';
import type { AuthContext } from '../ports/AuthContext';
import { ForbiddenError } from '@/domain/errors/DomainError';

// Narrow cast while the Prisma client is pending regen for the new
// Notification model. Once `npx prisma generate` has run, this can be
// replaced with `prisma.notification` directly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nx: any = prisma;

export interface NotificationDto {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly body: string | null;
  readonly href: string | null;
  readonly readAt: string | null;
  readonly createdAt: string;
}

export interface NotifyInput {
  readonly userId: string;
  readonly type: string;
  readonly title: string;
  readonly body?: string;
  readonly href?: string;
}

/**
 * In-app notifications. Writes land in the Notification table; a lightweight
 * poll from the header bell drains new ones. For high-volume deployments
 * swap the bell poll for a server-sent-events subscription on this service.
 */
export class NotificationService {
  public async notify(input: NotifyInput): Promise<void> {
    await nx.notification.create({
      data: {
        id: ulid(),
        userId: input.userId,
        type: input.type,
        title: input.title.slice(0, 200),
        body: input.body ?? null,
        href: input.href ?? null,
      },
    });
  }

  public async notifyMany(inputs: readonly NotifyInput[]): Promise<void> {
    if (inputs.length === 0) return;
    await nx.notification.createMany({
      data: inputs.map((i) => ({
        id: ulid(),
        userId: i.userId,
        type: i.type,
        title: i.title.slice(0, 200),
        body: i.body ?? null,
        href: i.href ?? null,
      })),
    });
  }

  public async listMine(ctx: AuthContext, opts: { page?: number; pageSize?: number; onlyUnread?: boolean } = {}): Promise<{
    items: readonly NotificationDto[]; total: number; unreadCount: number; page: number; pageSize: number;
  }> {
    if (!ctx.userId) throw new ForbiddenError('Not authenticated');
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
    const where = { userId: ctx.userId, ...(opts.onlyUnread ? { readAt: null } : {}) };
    const [rows, total, unreadCount] = await Promise.all([
      nx.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      nx.notification.count({ where }),
      nx.notification.count({ where: { userId: ctx.userId, readAt: null } }),
    ]);
    return {
      items: (rows as Array<{ id: string; type: string; title: string; body: string | null; href: string | null; readAt: Date | null; createdAt: Date }>).map((r) => ({
        id: r.id, type: r.type, title: r.title, body: r.body, href: r.href,
        readAt: r.readAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      total, unreadCount, page, pageSize,
    };
  }

  public async countUnread(ctx: AuthContext): Promise<number> {
    if (!ctx.userId) return 0;
    return nx.notification.count({ where: { userId: ctx.userId, readAt: null } });
  }

  public async markRead(ctx: AuthContext, id: string): Promise<void> {
    await nx.notification.updateMany({
      where: { id, userId: ctx.userId },
      data: { readAt: new Date() },
    });
  }

  public async markAllRead(ctx: AuthContext): Promise<number> {
    const res = await nx.notification.updateMany({
      where: { userId: ctx.userId, readAt: null },
      data: { readAt: new Date() },
    });
    return res.count;
  }
}

export const notificationService = new NotificationService();
