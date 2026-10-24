import { Role } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import type { AuthContext } from '@/application/ports/AuthContext';
import { decimalToMinor } from '@/infrastructure/common/decimal';

export interface PendingApprovalRow {
  readonly chainId: string;
  readonly stepId: string;
  readonly subject: string;
  readonly subjectId: string;
  readonly role: string;
  readonly stepIndex: number;
  readonly createdAt: string;
  readonly indentNumber: string | null;
  readonly indentSubject: string | null;
  readonly indentValueMinor: string | null;
  readonly indentCurrency: string | null;
  readonly indentId: string | null;
}

/**
 * Lists approval chain steps the caller is eligible to act on.
 *
 * - For regular approval actors: filtered to steps whose role the caller holds.
 * - For ADMIN: shows every PENDING step across every chain (admin oversight),
 *   so the dashboard count matches what they see here.
 */
export async function listPendingApprovals(ctx: AuthContext): Promise<readonly PendingApprovalRow[]> {
  const isAdmin = ctx.roles.includes(Role.ADMIN);
  if (ctx.roles.length === 0) return [];

  const roleFilter = isAdmin ? undefined : (ctx.roles as unknown as any[]);

  const steps = await prisma.approvalStep.findMany({
    where: {
      status: 'PENDING',
      chain: { status: 'PENDING' },
      ...(roleFilter ? { role: { in: roleFilter } } : {}),
    },
    include: { chain: true },
    orderBy: { chain: { createdAt: 'asc' } },
    take: 500,
  });

  // Only the step at currentIndex is actually actionable; filter in-memory
  // because Prisma can't compare two columns of the same join.
  const actionable = steps.filter((s) => s.stepIndex === s.chain.currentIndex);
  if (actionable.length === 0) return [];

  // Resolve owning indents for enrichment (one query per subject type).
  const indentChainSubjectIds = actionable
    .filter((s) => s.chain.subject === 'INDENT')
    .map((s) => s.chain.subjectId);
  const itChainSubjectIds = actionable
    .filter((s) => s.chain.subject === 'IT_PROFORMA')
    .map((s) => s.chain.subjectId);
  const cstChainSubjectIds = actionable
    .filter((s) => s.chain.subject === 'CST')
    .map((s) => s.chain.subjectId);

  const [indentRowsDirect, itRows, cstRows] = await Promise.all([
    prisma.indent.findMany({
      where: { id: { in: indentChainSubjectIds } },
      select: { id: true, indentNumber: true, subject: true, estimatedValue: true, currency: true },
    }),
    prisma.iTPerforma.findMany({
      where: { id: { in: itChainSubjectIds } },
      select: { id: true, indent: { select: { id: true, indentNumber: true, subject: true, estimatedValue: true, currency: true } } },
    }),
    prisma.cST.findMany({
      where: { id: { in: cstChainSubjectIds } },
      select: {
        id: true,
        itPerforma: {
          select: { indent: { select: { id: true, indentNumber: true, subject: true, estimatedValue: true, currency: true } } },
        },
      },
    }),
  ]);

  const indentById = new Map(indentRowsDirect.map((r) => [r.id, r]));
  const itToIndent = new Map(itRows.map((r) => [r.id, r.indent]));
  const cstToIndent = new Map(cstRows.map((r) => [r.id, r.itPerforma.indent]));

  return actionable.map((s) => {
    const indent =
      s.chain.subject === 'INDENT'
        ? indentById.get(s.chain.subjectId) ?? null
        : s.chain.subject === 'IT_PROFORMA'
          ? itToIndent.get(s.chain.subjectId) ?? null
          : cstToIndent.get(s.chain.subjectId) ?? null;
    return {
      chainId: s.chainId,
      stepId: s.id,
      subject: s.chain.subject,
      subjectId: s.chain.subjectId,
      role: s.role,
      stepIndex: s.stepIndex,
      createdAt: s.chain.createdAt.toISOString(),
      indentId: indent?.id ?? null,
      indentNumber: indent?.indentNumber ?? null,
      indentSubject: indent?.subject ?? null,
      indentValueMinor: indent ? decimalToMinor(indent.estimatedValue as unknown as string).toString() : null,
      indentCurrency: indent?.currency ?? null,
    };
  });
}
