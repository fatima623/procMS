import { ulid } from 'ulid';
import { prisma } from '@/infrastructure/db/prisma';
import type { AuthContext } from '../ports/AuthContext';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/domain/errors/DomainError';
import { notificationService } from '../notification/NotificationService';

// Narrow cast while the Prisma client regen is pending for the new Comment
// model. Can be replaced with direct `prisma.comment` access after regen.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cx: any = prisma;

export interface CommentDto {
  readonly id: string;
  readonly indentId: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly body: string;
  readonly parentId: string | null;
  readonly createdAt: string;
}

export interface PostCommentInput {
  readonly indentId: string;
  readonly body: string;
  readonly parentId?: string;
}

/**
 * Comments / activity feed on an indent. Any user who can see the indent
 * can comment; nothing in the workflow depends on comments (unlike
 * Observations). Deletes are soft (`deletedAt`) so the thread history
 * remains auditable.
 */
export class CommentService {
  public async post(ctx: AuthContext, input: PostCommentInput): Promise<CommentDto> {
    if (!ctx.userId) throw new ForbiddenError('Not authenticated');
    const body = input.body.trim();
    if (body.length === 0) throw new ValidationError('Comment body is required', { body: 'required' });
    if (body.length > 10_000) throw new ValidationError('Comment too long (max 10000)', { body: 'too long' });

    // Ensure the indent exists & caller can see it. We reuse the Indent view-model
    // policy by checking directly against the row.
    const indent = await prisma.indent.findUnique({
      where: { id: input.indentId },
      select: { id: true, indenterId: true, sectionId: true, assignedAdpId: true },
    });
    if (!indent) throw new NotFoundError('Indent', input.indentId);
    const canSee =
      ctx.roles.includes('ADMIN' as never) ||
      indent.indenterId === ctx.userId ||
      ctx.sectionIds.includes(indent.sectionId) ||
      (indent.assignedAdpId !== null && ctx.sectionIds.includes(indent.assignedAdpId)) ||
      ctx.roles.some((r) => ['AD', 'DD', 'DP_N', 'DGDP', 'SECY_DP', 'SUPTD', 'CPO', 'COORD_STAFF', 'BUDGET_STAFF', 'CR_STAFF', 'INSPECTORATE'].includes(r as unknown as string));
    if (!canSee) throw new ForbiddenError('Not permitted to comment on this indent');

    if (input.parentId) {
      const parent = await cx.comment.findUnique({ where: { id: input.parentId }, select: { indentId: true } });
      if (!parent || parent.indentId !== input.indentId) {
        throw new ValidationError('Parent comment not on this indent');
      }
    }

    const id = ulid();
    await cx.comment.create({
      data: {
        id,
        indentId: input.indentId,
        authorId: ctx.userId,
        body,
        parentId: input.parentId ?? null,
      },
    });

    // @mention notifications: parse `@local-part` tokens and notify matching
    // users. We also notify the parent comment's author (if different from
    // the mentioner) so replies always surface.
    const mentionedIds = await this.resolveMentionTargets(body, ctx.userId);
    const extraTargets = new Set<string>(mentionedIds);
    if (input.parentId) {
      const parent = await cx.comment.findUnique({ where: { id: input.parentId }, select: { authorId: true } });
      if (parent?.authorId && parent.authorId !== ctx.userId) extraTargets.add(parent.authorId);
    }
    if (extraTargets.size > 0) {
      const indent = await prisma.indent.findUnique({ where: { id: input.indentId }, select: { indentNumber: true, subject: true } });
      const preview = body.length > 140 ? body.slice(0, 140) + '…' : body;
      await notificationService.notifyMany([...extraTargets].map((userId) => ({
        userId,
        type: mentionedIds.includes(userId) ? 'comment.mention' : 'comment.reply',
        title: mentionedIds.includes(userId)
          ? `You were mentioned on ${indent?.indentNumber ?? 'an indent'}`
          : `New reply on ${indent?.indentNumber ?? 'an indent'}`,
        body: `${indent?.subject ?? ''} — "${preview}"`,
        href: `/indents/${input.indentId}`,
      })));
    }

    const row = await cx.comment.findUnique({
      where: { id },
      include: { author: { select: { displayName: true } } },
    });
    return this.toDto(row);
  }

  /**
   * Pull `@local-part` tokens out of the body and resolve each one to a user id.
   * Deliberately ignores the author's own id (self-mentions produce no notification).
   */
  private async resolveMentionTargets(body: string, authorId: string): Promise<string[]> {
    const seen = new Set<string>();
    const tokens: string[] = [];
    for (const match of body.matchAll(/@([a-zA-Z0-9._+-]{2,80})\b/g)) {
      const local = match[1]!.toLowerCase();
      if (!seen.has(local)) { seen.add(local); tokens.push(local); }
    }
    if (tokens.length === 0) return [];

    // Match by email local-part prefix: `@admin` matches `admin@dp.navy`.
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: tokens.map((t) => ({ email: { startsWith: `${t}@` } })),
      },
      select: { id: true },
    });
    return users.map((u) => u.id).filter((id) => id !== authorId);
  }

  public async listForIndent(indentId: string): Promise<readonly CommentDto[]> {
    const rows: Array<{ id: string; indentId: string; authorId: string; author: { displayName: string }; body: string; parentId: string | null; createdAt: Date; deletedAt: Date | null }> =
      await cx.comment.findMany({
        where: { indentId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { displayName: true } } },
      });
    return rows.map((r) => this.toDto(r));
  }

  public async softDelete(ctx: AuthContext, id: string): Promise<void> {
    const row = await cx.comment.findUnique({ where: { id }, select: { authorId: true } });
    if (!row) throw new NotFoundError('Comment', id);
    const isOwner = row.authorId === ctx.userId;
    const isAdmin = ctx.roles.includes('ADMIN' as never);
    if (!isOwner && !isAdmin) throw new ForbiddenError('Cannot delete another user\'s comment');
    await cx.comment.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private toDto(r: { id: string; indentId: string; authorId: string; author: { displayName: string }; body: string; parentId: string | null; createdAt: Date }): CommentDto {
    return {
      id: r.id,
      indentId: r.indentId,
      authorId: r.authorId,
      authorName: r.author.displayName,
      body: r.body,
      parentId: r.parentId,
      createdAt: r.createdAt.toISOString(),
    };
  }
}

export const commentService = new CommentService();
