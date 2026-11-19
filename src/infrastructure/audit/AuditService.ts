import { ulid } from 'ulid';
import { AuditItemStatus, AuditObjectionStatus, AuditRecordStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { InvalidStateTransitionError, NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import type {
  AddDraftParaInput,
  AddItemInput,
  AddObjectionInput,
  CreateAuditRecordInput,
  LinkItemObjectionInput,
  ReplyItemInput,
  ReplyObjectionInput,
} from '@/interfaces/http/schemas/audit';

/** Roles that run the Audit Section. */
export const AUDIT_ROLES: Role[] = [Role.ADMIN, Role.AUDIT_STAFF];

/**
 * Audit Section service (v4.4.1 §4.29–§4.30).
 *
 *   Record:    OPEN ──close──▶ CLOSED
 *              OPEN ──settle─▶ SETTLED   (all objections SETTLED + all items CLEARED)
 *   Objection: OPEN ──reply──▶ REPLIED ──settle──▶ SETTLED
 *   Item:      AWAITED ──reply──▶ REPLY ──clear──▶ CLEARED
 *
 * Nothing under a CLOSED/SETTLED record can change. Every status change is a
 * compare-and-set (`updateMany where status = from`), so concurrent clicks
 * cannot both win. Same singleton shape as RegistryService.
 */
export const auditService = {
  async createRecord(createdByUserId: string, input: CreateAuditRecordInput): Promise<{ id: string }> {
    const fy = await prisma.fiscalYear.findUnique({ where: { id: input.fiscalYearId }, select: { id: true } });
    if (!fy) throw new ValidationError(`Fiscal year not found: ${input.fiscalYearId}`, { fiscalYearId: 'not_found' });
    if (input.subjectIndentId) {
      const indent = await prisma.indent.findUnique({ where: { id: input.subjectIndentId }, select: { id: true } });
      if (!indent) throw new ValidationError(`Indent not found: ${input.subjectIndentId}`, { subjectIndentId: 'not_found' });
    }
    if (input.subjectContractId) {
      const contract = await prisma.contract.findUnique({ where: { id: input.subjectContractId }, select: { id: true } });
      if (!contract) throw new ValidationError(`Contract not found: ${input.subjectContractId}`, { subjectContractId: 'not_found' });
    }

    const id = ulid();
    await prisma.auditRecord.create({
      data: {
        id,
        auditSection: input.auditSection,
        fiscalYearId: input.fiscalYearId,
        subjectIndentId: input.subjectIndentId ?? null,
        subjectContractId: input.subjectContractId ?? null,
        raisedOn: input.raisedOn,
        documentKey: input.documentKey?.trim() ? input.documentKey.trim() : null,
        createdByUserId,
      },
    });
    return { id };
  },

  async closeRecord(id: string): Promise<void> {
    const res = await prisma.auditRecord.updateMany({
      where: { id, status: AuditRecordStatus.OPEN },
      data: { status: AuditRecordStatus.CLOSED, version: { increment: 1 } },
    });
    if (res.count !== 1) await throwRecordTransition(id, 'close');
  },

  /** OPEN → SETTLED, only when every objection is SETTLED and every item CLEARED. */
  async settleRecord(id: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const row = await tx.auditRecord.findUnique({ where: { id }, select: { status: true } });
      if (!row) throw new NotFoundError('AuditRecord', id);
      if (row.status !== AuditRecordStatus.OPEN) throw new InvalidStateTransitionError(row.status, 'settle');
      const [openObjections, openItems] = await Promise.all([
        tx.auditObjection.count({ where: { auditRecordId: id, status: { not: AuditObjectionStatus.SETTLED } } }),
        tx.auditItem.count({ where: { auditRecordId: id, status: { not: AuditItemStatus.CLEARED } } }),
      ]);
      if (openObjections > 0 || openItems > 0) {
        throw new ValidationError(
          `Cannot settle: ${openObjections} objection(s) not settled, ${openItems} item(s) not cleared`,
          { status: 'children_open' },
        );
      }
      const res = await tx.auditRecord.updateMany({
        where: { id, status: AuditRecordStatus.OPEN },
        data: { status: AuditRecordStatus.SETTLED, version: { increment: 1 } },
      });
      if (res.count !== 1) throw new InvalidStateTransitionError('changed', 'settle');
    });
  },

  // --- objections -----------------------------------------------------------

  async addObjection(recordId: string, input: AddObjectionInput): Promise<{ id: string }> {
    await assertOpenRecord(recordId);
    const id = ulid();
    await prisma.auditObjection.create({
      data: {
        id,
        auditRecordId: recordId,
        ground: input.ground,
        para: input.para,
        amountInvolvedMinor: input.amountInvolvedMinor,
        currency: input.currency,
      },
    });
    return { id };
  },

  async replyObjection(repliedByUserId: string, recordId: string, objectionId: string, input: ReplyObjectionInput): Promise<void> {
    await assertOpenRecord(recordId);
    await assertObjectionInRecord(recordId, objectionId);
    const res = await prisma.auditObjection.updateMany({
      where: { id: objectionId, status: AuditObjectionStatus.OPEN },
      data: {
        status: AuditObjectionStatus.REPLIED,
        replyText: input.replyText,
        repliedOn: input.repliedOn ?? today(),
        repliedByUserId,
      },
    });
    if (res.count !== 1) await throwObjectionTransition(objectionId, 'reply');
  },

  async settleObjection(recordId: string, objectionId: string): Promise<void> {
    await assertOpenRecord(recordId);
    await assertObjectionInRecord(recordId, objectionId);
    const res = await prisma.auditObjection.updateMany({
      where: { id: objectionId, status: AuditObjectionStatus.REPLIED },
      data: { status: AuditObjectionStatus.SETTLED },
    });
    if (res.count !== 1) await throwObjectionTransition(objectionId, 'settle');
  },

  // --- items ----------------------------------------------------------------

  async addItem(recordId: string, input: AddItemInput): Promise<{ id: string }> {
    await assertOpenRecord(recordId);
    const id = ulid();
    await prisma.auditItem.create({ data: { id, auditRecordId: recordId, itemText: input.itemText } });
    return { id };
  },

  async replyItem(recordId: string, itemId: string, input: ReplyItemInput): Promise<void> {
    await assertOpenRecord(recordId);
    await assertItemInRecord(recordId, itemId);
    const res = await prisma.auditItem.updateMany({
      where: { id: itemId, status: AuditItemStatus.AWAITED },
      data: { status: AuditItemStatus.REPLY, replyText: input.replyText },
    });
    if (res.count !== 1) await throwItemTransition(itemId, 'reply');
  },

  async clearItem(recordId: string, itemId: string): Promise<void> {
    await assertOpenRecord(recordId);
    await assertItemInRecord(recordId, itemId);
    const res = await prisma.auditItem.updateMany({
      where: { id: itemId, status: AuditItemStatus.REPLY },
      data: { status: AuditItemStatus.CLEARED },
    });
    if (res.count !== 1) await throwItemTransition(itemId, 'clear');
  },

  async addDraftPara(createdByUserId: string, recordId: string, itemId: string, input: AddDraftParaInput): Promise<{ id: string }> {
    await assertOpenRecord(recordId);
    await assertItemInRecord(recordId, itemId);
    const id = ulid();
    await prisma.auditDraftPara.create({
      data: { id, auditItemId: itemId, paraText: input.paraText, submittedOn: input.submittedOn, createdByUserId },
    });
    return { id };
  },

  /** Link an item to an objection of the SAME audit record. */
  async linkItemToObjection(recordId: string, itemId: string, input: LinkItemObjectionInput): Promise<{ id: string }> {
    await assertOpenRecord(recordId);
    await assertItemInRecord(recordId, itemId);
    const objection = await prisma.auditObjection.findUnique({
      where: { id: input.auditObjectionId },
      select: { auditRecordId: true },
    });
    if (!objection) throw new NotFoundError('AuditObjection', input.auditObjectionId);
    if (objection.auditRecordId !== recordId) {
      throw new ValidationError('Item and objection belong to different audit records', { auditObjectionId: 'other_record' });
    }
    const existing = await prisma.auditItemObjectionLink.findUnique({
      where: { auditItemId_auditObjectionId: { auditItemId: itemId, auditObjectionId: input.auditObjectionId } },
      select: { id: true },
    });
    if (existing) throw alreadyLinked();

    const id = ulid();
    try {
      await prisma.auditItemObjectionLink.create({ data: { id, auditItemId: itemId, auditObjectionId: input.auditObjectionId } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw alreadyLinked();
      throw err;
    }
    return { id };
  },
};

// --- guards -------------------------------------------------------------------

async function assertOpenRecord(recordId: string): Promise<void> {
  const row = await prisma.auditRecord.findUnique({ where: { id: recordId }, select: { status: true } });
  if (!row) throw new NotFoundError('AuditRecord', recordId);
  if (row.status !== AuditRecordStatus.OPEN) {
    throw new ValidationError(`Audit record is ${row.status} — no further changes`, { auditRecordId: 'locked' });
  }
}

async function assertObjectionInRecord(recordId: string, objectionId: string): Promise<void> {
  const row = await prisma.auditObjection.findUnique({ where: { id: objectionId }, select: { auditRecordId: true } });
  if (!row || row.auditRecordId !== recordId) throw new NotFoundError('AuditObjection', objectionId);
}

async function assertItemInRecord(recordId: string, itemId: string): Promise<void> {
  const row = await prisma.auditItem.findUnique({ where: { id: itemId }, select: { auditRecordId: true } });
  if (!row || row.auditRecordId !== recordId) throw new NotFoundError('AuditItem', itemId);
}

async function throwRecordTransition(id: string, event: string): Promise<never> {
  const row = await prisma.auditRecord.findUnique({ where: { id }, select: { status: true } });
  if (!row) throw new NotFoundError('AuditRecord', id);
  throw new InvalidStateTransitionError(row.status, event);
}

async function throwObjectionTransition(id: string, event: string): Promise<never> {
  const row = await prisma.auditObjection.findUnique({ where: { id }, select: { status: true } });
  if (!row) throw new NotFoundError('AuditObjection', id);
  throw new InvalidStateTransitionError(row.status, event);
}

async function throwItemTransition(id: string, event: string): Promise<never> {
  const row = await prisma.auditItem.findUnique({ where: { id }, select: { status: true } });
  if (!row) throw new NotFoundError('AuditItem', id);
  throw new InvalidStateTransitionError(row.status, event);
}

function alreadyLinked(): ValidationError {
  return new ValidationError('This item is already linked to that objection', { auditObjectionId: 'duplicate' });
}

/** Today's calendar date at UTC midnight, for a DATE column. */
function today(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}
