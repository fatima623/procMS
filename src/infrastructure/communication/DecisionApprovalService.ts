import { ulid } from 'ulid';
import { DecisionAction, DecisionSubjectType, Role, type Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import {
  BusinessRuleViolationError,
  InvalidStateTransitionError,
  NotFoundError,
  ValidationError,
} from '@/domain/errors/DomainError';
import { UNAPPROVE_REMARKS_MESSAGE } from '@/interfaces/http/schemas/decisionApproval';

/**
 * Decision Approval (v4.4.1 §4.42; OPEN_QUESTIONS Q6): the Communication
 * Section locks an indent or contract from further edits, and can reverse it
 * with Un-Approve. This is a SEPARATE flag from status / CLOSED — locking never
 * changes the workflow status. Every lock and unlock writes an audit event.
 *
 * Enforcement: every write path on Indent / Contract calls the matching
 * assert…NotLocked guard (indent repository save(), rebidding, contract
 * amendments, DP extension / taking-over / close, terminate). Comments and
 * attachments do not edit the record and are not blocked.
 */

type Db = Prisma.TransactionClient | PrismaClient;
export type DecisionSubject = 'INDENT' | 'CONTRACT';

/** Roles that may lock / Un-Approve. Everyone who can see the record sees the badge + history. */
export const DECISION_ROLES: Role[] = [Role.ADMIN, Role.COMMUNICATION_STAFF];

/** APPROVE: lock the record. Only if it is not already locked. */
export async function lockDecision(
  decidedByUserId: string,
  subjectType: DecisionSubject,
  subjectId: string,
  remarks?: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const count = await setLock(tx, subjectType, subjectId, false, true);
    if (count !== 1) {
      if (!(await exists(tx, subjectType, subjectId))) throw notFound(subjectType, subjectId);
      throw new InvalidStateTransitionError('LOCKED', 'APPROVE');
    }
    await writeEvent(tx, subjectType, subjectId, DecisionAction.APPROVE, decidedByUserId, remarks);
  });
}

/** UN_APPROVE: release the lock. Only if locked; remarks are required. */
export async function unlockDecision(
  decidedByUserId: string,
  subjectType: DecisionSubject,
  subjectId: string,
  remarks: string | undefined,
): Promise<void> {
  if (!remarks || remarks.trim().length < 5) throw new ValidationError(UNAPPROVE_REMARKS_MESSAGE, { remarks: 'required' });
  await prisma.$transaction(async (tx) => {
    const count = await setLock(tx, subjectType, subjectId, true, false);
    if (count !== 1) {
      if (!(await exists(tx, subjectType, subjectId))) throw notFound(subjectType, subjectId);
      throw new InvalidStateTransitionError('UNLOCKED', 'UN_APPROVE');
    }
    await writeEvent(tx, subjectType, subjectId, DecisionAction.UN_APPROVE, decidedByUserId, remarks.trim());
  });
}

/** Guard: refuse any edit of a locked indent. Pass `tx` when inside a transaction. */
export async function assertIndentNotLocked(indentId: string, db: Db = prisma): Promise<void> {
  const row = await db.indent.findUnique({ where: { id: indentId }, select: { indentNumber: true, decisionApprovalLocked: true } });
  if (row?.decisionApprovalLocked) {
    throw new BusinessRuleViolationError(`Indent ${row.indentNumber} is locked by Decision Approval — Un-Approve it first`);
  }
}

/** Guard: refuse any edit of a locked contract. Pass `tx` when inside a transaction. */
export async function assertContractNotLocked(contractId: string, db: Db = prisma): Promise<void> {
  const row = await db.contract.findUnique({ where: { id: contractId }, select: { contractNumber: true, decisionApprovalLocked: true } });
  if (row?.decisionApprovalLocked) {
    throw new BusinessRuleViolationError(`Contract ${row.contractNumber} is locked by Decision Approval — Un-Approve it first`);
  }
}

// --- read helper for the pages -------------------------------------------------

export interface DecisionEventView {
  readonly id: string;
  readonly action: 'APPROVE' | 'UN_APPROVE';
  readonly decidedOn: string;
  readonly decidedByName: string | null;
  readonly remarks: string | null;
}

export interface DecisionState {
  readonly locked: boolean;
  /** Newest first. */
  readonly events: readonly DecisionEventView[];
}

/** Lock flag + history for each id (every requested id gets an entry). */
export async function loadDecisionStates(subjectType: DecisionSubject, ids: readonly string[]): Promise<Map<string, DecisionState>> {
  const unique = [...new Set(ids)];
  const result = new Map<string, DecisionState>();
  if (unique.length === 0) return result;

  const [flags, events] = await Promise.all([
    subjectType === 'INDENT'
      ? prisma.indent.findMany({ where: { id: { in: unique } }, select: { id: true, decisionApprovalLocked: true } })
      : prisma.contract.findMany({ where: { id: { in: unique } }, select: { id: true, decisionApprovalLocked: true } }),
    prisma.decisionApprovalEvent.findMany({
      where: { subjectType: DecisionSubjectType[subjectType], subjectId: { in: unique } },
      orderBy: { decidedOn: 'desc' },
    }),
  ]);
  const userIds = [...new Set(events.map((e) => e.decidedByUserId))];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true } })
    : [];
  const names = new Map(users.map((u) => [u.id, u.displayName]));
  const lockedById = new Map(flags.map((f) => [f.id, f.decisionApprovalLocked]));

  for (const id of unique) {
    result.set(id, {
      locked: lockedById.get(id) ?? false,
      events: events
        .filter((e) => e.subjectId === id)
        .map((e) => ({
          id: e.id,
          action: e.action,
          decidedOn: e.decidedOn.toISOString(),
          decidedByName: names.get(e.decidedByUserId) ?? null,
          remarks: e.remarks,
        })),
    });
  }
  return result;
}

// --- helpers --------------------------------------------------------------------

async function setLock(tx: Db, subjectType: DecisionSubject, id: string, from: boolean, to: boolean): Promise<number> {
  const args = { where: { id, decisionApprovalLocked: from }, data: { decisionApprovalLocked: to, version: { increment: 1 } } };
  const res = subjectType === 'INDENT' ? await tx.indent.updateMany(args) : await tx.contract.updateMany(args);
  return res.count;
}

async function exists(tx: Db, subjectType: DecisionSubject, id: string): Promise<boolean> {
  const row = subjectType === 'INDENT'
    ? await tx.indent.findUnique({ where: { id }, select: { id: true } })
    : await tx.contract.findUnique({ where: { id }, select: { id: true } });
  return !!row;
}

async function writeEvent(
  tx: Db,
  subjectType: DecisionSubject,
  subjectId: string,
  action: DecisionAction,
  decidedByUserId: string,
  remarks?: string,
): Promise<void> {
  await tx.decisionApprovalEvent.create({
    data: {
      id: ulid(),
      subjectType: DecisionSubjectType[subjectType],
      subjectId,
      action,
      decidedByUserId,
      remarks: remarks ?? null,
    },
  });
}

function notFound(subjectType: DecisionSubject, id: string): NotFoundError {
  return new NotFoundError(subjectType === 'INDENT' ? 'Indent' : 'Contract', id);
}
