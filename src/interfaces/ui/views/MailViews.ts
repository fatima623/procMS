import { prisma } from '@/infrastructure/db/prisma';

export interface MailRow {
  readonly id: string;
  readonly subject: string;
  readonly otherPartyName: string | null;
  readonly sentAt: string;
  readonly readAt: string | null;
}

/** Messages addressed to the user, newest first, plus the unread count. */
export async function listInbox(userId: string): Promise<{ rows: readonly MailRow[]; unreadCount: number }> {
  const [rows, unreadCount] = await Promise.all([
    prisma.message.findMany({ where: { toUserId: userId }, orderBy: { sentAt: 'desc' }, take: 300 }),
    prisma.message.count({ where: { toUserId: userId, readAt: null } }),
  ]);
  const names = await userNames(rows.map((r) => r.fromUserId));
  return {
    rows: rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      otherPartyName: names.get(r.fromUserId) ?? null,
      sentAt: r.sentAt.toISOString(),
      readAt: r.readAt?.toISOString() ?? null,
    })),
    unreadCount,
  };
}

/** Messages the user sent, newest first. `readAt` shows whether the recipient opened it. */
export async function listSent(userId: string): Promise<readonly MailRow[]> {
  const rows = await prisma.message.findMany({ where: { fromUserId: userId }, orderBy: { sentAt: 'desc' }, take: 300 });
  const names = await userNames(rows.map((r) => r.toUserId));
  return rows.map((r) => ({
    id: r.id,
    subject: r.subject,
    otherPartyName: names.get(r.toUserId) ?? null,
    sentAt: r.sentAt.toISOString(),
    readAt: r.readAt?.toISOString() ?? null,
  }));
}

export interface MessageDto {
  readonly id: string;
  readonly fromUserId: string;
  readonly toUserId: string;
  readonly fromName: string | null;
  readonly toName: string | null;
  readonly subject: string;
  readonly body: string;
  readonly sentAt: string;
  readonly readAt: string | null;
  readonly parentMessageId: string | null;
}

export interface MessageThread {
  readonly message: MessageDto;
  /** Whole conversation (root → replies), oldest first, limited to messages the viewer sent or received. */
  readonly thread: readonly MessageDto[];
}

type MessageRecord = {
  id: string; fromUserId: string; toUserId: string; subject: string; body: string;
  sentAt: Date; readAt: Date | null; parentMessageId: string | null;
};

const MAX_DEPTH = 200;

/** Loads a message and its thread. Returns null when the id is unknown; the caller checks access. */
export async function loadMessageThread(id: string, viewerUserId: string): Promise<MessageThread | null> {
  const message = await prisma.message.findUnique({ where: { id } });
  if (!message) return null;

  // Walk up to the root of the conversation.
  let root: MessageRecord = message;
  for (let i = 0; i < MAX_DEPTH && root.parentMessageId; i += 1) {
    const parent = await prisma.message.findUnique({ where: { id: root.parentMessageId } });
    if (!parent) break;
    root = parent;
  }

  // Collect every reply beneath the root, level by level.
  const all: MessageRecord[] = [root];
  let frontier = [root.id];
  for (let i = 0; i < MAX_DEPTH && frontier.length > 0; i += 1) {
    const children = await prisma.message.findMany({ where: { parentMessageId: { in: frontier } } });
    all.push(...children);
    frontier = children.map((c) => c.id);
  }

  const visible = all
    .filter((m) => m.fromUserId === viewerUserId || m.toUserId === viewerUserId)
    .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
  const names = await userNames(visible.flatMap((m) => [m.fromUserId, m.toUserId]).concat(message.fromUserId, message.toUserId));
  return { message: toDto(message, names), thread: visible.map((m) => toDto(m, names)) };
}

/** Active internal (non-firm) users other than the sender, for the "To" dropdown. */
export async function listMailRecipients(excludeUserId: string): Promise<readonly { id: string; label: string }[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true, firmId: null, NOT: { id: excludeUserId } },
    orderBy: { displayName: 'asc' },
    select: { id: true, displayName: true, rank: true, email: true },
  });
  return users.map((u) => {
    // Skip the rank prefix when displayName already starts with it ("Cdr M. Riaz").
    const hasRank = !!u.rank && u.displayName.toLowerCase().startsWith(`${u.rank.toLowerCase()} `);
    return { id: u.id, label: `${u.rank && !hasRank ? `${u.rank} ` : ''}${u.displayName} (${u.email})` };
  });
}

// --- helpers ----------------------------------------------------------------

function toDto(m: MessageRecord, names: Map<string, string>): MessageDto {
  return {
    id: m.id,
    fromUserId: m.fromUserId,
    toUserId: m.toUserId,
    fromName: names.get(m.fromUserId) ?? null,
    toName: names.get(m.toUserId) ?? null,
    subject: m.subject,
    body: m.body,
    sentAt: m.sentAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
    parentMessageId: m.parentMessageId,
  };
}

async function userNames(ids: readonly (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (unique.length === 0) return new Map();
  const users = await prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, displayName: true } });
  return new Map(users.map((u) => [u.id, u.displayName]));
}
