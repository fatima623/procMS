import { ulid } from 'ulid';
import { prisma } from '@/infrastructure/db/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import type { AuthContext } from '@/application/ports/AuthContext';
import { notificationService } from '@/application/notification/NotificationService';
import { replySubject, type ReplyMessageInput, type SendMessageInput } from '@/interfaces/http/schemas/mail';

/**
 * Mail Box service (v4.4.1 §4.4): internal user-to-user messages.
 *
 * Same shape as RegistryService: a singleton of small single-write methods;
 * problems surface as DomainErrors so the HTTP mapper renders 4xx.
 * Only internal (non-firm) users take part, on both ends.
 */
export const mailBoxService = {
  async send(ctx: AuthContext, input: SendMessageInput): Promise<{ id: string }> {
    const sender = await assertInternalSender(ctx);
    await assertInternalActiveRecipient(input.toUserId);
    const id = ulid();
    await prisma.message.create({
      data: { id, fromUserId: ctx.userId, toUserId: input.toUserId, subject: input.subject, body: input.body },
    });
    await notifyRecipient(input.toUserId, id, sender.displayName, input.subject);
    return { id };
  },

  /** Reply goes to the other participant of the parent message. */
  async reply(ctx: AuthContext, parentId: string, input: ReplyMessageInput): Promise<{ id: string }> {
    const parent = await prisma.message.findUnique({
      where: { id: parentId },
      select: { id: true, fromUserId: true, toUserId: true, subject: true },
    });
    if (!parent) throw new NotFoundError('Message', parentId);
    if (parent.fromUserId !== ctx.userId && parent.toUserId !== ctx.userId) {
      throw new ForbiddenError('Only the sender or recipient can reply to this message');
    }
    const sender = await assertInternalSender(ctx);
    const toUserId = parent.fromUserId === ctx.userId ? parent.toUserId : parent.fromUserId;
    await assertInternalActiveRecipient(toUserId);

    const id = ulid();
    const subject = replySubject(parent.subject);
    await prisma.message.create({
      data: { id, fromUserId: ctx.userId, toUserId, subject, body: input.body, parentMessageId: parent.id },
    });
    await notifyRecipient(toUserId, id, sender.displayName, subject);
    return { id };
  },

  /** Only the recipient can mark a message read. Idempotent. */
  async markRead(ctx: AuthContext, id: string): Promise<void> {
    const row = await prisma.message.findUnique({ where: { id }, select: { toUserId: true, readAt: true } });
    if (!row) throw new NotFoundError('Message', id);
    if (row.toUserId !== ctx.userId) throw new ForbiddenError('Only the recipient can mark this message read');
    if (row.readAt) return;
    await prisma.message.updateMany({ where: { id, toUserId: ctx.userId, readAt: null }, data: { readAt: new Date() } });
  },
};

async function assertInternalSender(ctx: AuthContext): Promise<{ displayName: string }> {
  if (ctx.firmId) throw new ForbiddenError('Mail box is for internal users only');
  const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { isActive: true, firmId: true, displayName: true } });
  if (!user || !user.isActive || user.firmId) throw new ForbiddenError('Mail box is for internal users only');
  return { displayName: user.displayName };
}

async function assertInternalActiveRecipient(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true, firmId: true } });
  if (!user || !user.isActive) throw new NotFoundError('User', userId);
  if (user.firmId) throw new ValidationError('Mail can only be sent to internal users', { toUserId: 'firm_user' });
}

async function notifyRecipient(userId: string, messageId: string, senderName: string, subject: string): Promise<void> {
  await notificationService.notify({
    userId,
    type: 'mail.received',
    title: `New mail from ${senderName}: ${subject}`,
    href: `/mail/${messageId}`,
  });
}
