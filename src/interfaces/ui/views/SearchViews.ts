import { Role } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import type { AuthContext } from '@/application/ports/AuthContext';

export interface IndentHit {
  readonly kind: 'indent';
  readonly id: string;
  readonly indentId: string;
  readonly indentNumber: string;
  readonly controlNumber: string | null;
  readonly subject: string;
  readonly status: string;
  readonly snippet: string;
}
export interface CommentHit {
  readonly kind: 'comment';
  readonly id: string;
  readonly indentId: string;
  readonly indentNumber: string;
  readonly indentSubject: string;
  readonly authorName: string;
  readonly snippet: string;
  readonly createdAt: string;
}
export type SearchHit = IndentHit | CommentHit;

export interface SearchResult {
  readonly query: string;
  readonly indents: readonly IndentHit[];
  readonly comments: readonly CommentHit[];
  readonly totalIndents: number;
  readonly totalComments: number;
}

/**
 * Lightweight search. Not a real full-text index (MySQL FULLTEXT needs
 * MyISAM / InnoDB fulltext setup) — just a case-insensitive LIKE match
 * across the fields that matter. Fast enough for < 100k rows and keeps
 * the schema simple.
 *
 * Row-level authorisation: non-privileged callers only see hits inside
 * indents they're entitled to view (same policy as /indents).
 */
export async function searchEverything(ctx: AuthContext, rawQuery: string, limitPerType = 25): Promise<SearchResult> {
  const q = rawQuery.trim();
  if (q.length < 2) {
    return { query: q, indents: [], comments: [], totalIndents: 0, totalComments: 0 };
  }

  const isPrivileged = ctx.roles.some((r) =>
    ([Role.ADMIN, Role.AD, Role.DD, Role.DP_N, Role.DGDP, Role.SECY_DP, Role.SUPTD, Role.CPO, Role.COORD_STAFF, Role.BUDGET_STAFF, Role.CR_STAFF, Role.INSPECTORATE] as Role[]).includes(r),
  );

  // Indent-visibility clause reused across both queries.
  const indentVisibilityWhere = isPrivileged
    ? {}
    : {
        OR: [
          { indenterId: ctx.userId },
          ...(ctx.sectionIds.length ? [{ sectionId: { in: [...ctx.sectionIds] } }] : []),
          ...(ctx.sectionIds.length ? [{ assignedAdpId: { in: [...ctx.sectionIds] } }] : []),
        ],
      };

  const [indents, totalIndents, commentRows, totalComments] = await Promise.all([
    prisma.indent.findMany({
      where: {
        AND: [
          indentVisibilityWhere,
          {
            OR: [
              { indentNumber: { contains: q } },
              { controlNumber: { contains: q } },
              { subject: { contains: q } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limitPerType,
      select: { id: true, indentNumber: true, controlNumber: true, subject: true, status: true },
    }),
    prisma.indent.count({
      where: {
        AND: [
          indentVisibilityWhere,
          {
            OR: [
              { indentNumber: { contains: q } },
              { controlNumber: { contains: q } },
              { subject: { contains: q } },
            ],
          },
        ],
      },
    }),
    // Cast-around pending prisma generate for Comment model.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).comment.findMany({
      where: {
        deletedAt: null,
        body: { contains: q },
        indent: indentVisibilityWhere,
      },
      orderBy: { createdAt: 'desc' },
      take: limitPerType,
      include: {
        author: { select: { displayName: true } },
        indent: { select: { id: true, indentNumber: true, subject: true } },
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).comment.count({
      where: {
        deletedAt: null,
        body: { contains: q },
        indent: indentVisibilityWhere,
      },
    }),
  ]) as [
    Array<{ id: string; indentNumber: string; controlNumber: string | null; subject: string; status: string }>,
    number,
    Array<{ id: string; body: string; createdAt: Date; author: { displayName: string }; indent: { id: string; indentNumber: string; subject: string } }>,
    number,
  ];

  const indentHits: IndentHit[] = indents.map((r) => ({
    kind: 'indent',
    id: `i:${r.id}`,
    indentId: r.id,
    indentNumber: r.indentNumber,
    controlNumber: r.controlNumber,
    subject: r.subject,
    status: r.status,
    snippet: makeSnippet(r.subject, q),
  }));

  const commentHits: CommentHit[] = commentRows.map((r) => ({
    kind: 'comment',
    id: `c:${r.id}`,
    indentId: r.indent.id,
    indentNumber: r.indent.indentNumber,
    indentSubject: r.indent.subject,
    authorName: r.author.displayName,
    snippet: makeSnippet(r.body, q),
    createdAt: r.createdAt.toISOString(),
  }));

  return { query: q, indents: indentHits, comments: commentHits, totalIndents, totalComments };
}

/** Build a ~160-char preview centred on the first match. */
function makeSnippet(text: string, needle: string): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(needle.toLowerCase());
  if (idx < 0) return text.slice(0, 160);
  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + needle.length + 100);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end)}${suffix}`;
}
