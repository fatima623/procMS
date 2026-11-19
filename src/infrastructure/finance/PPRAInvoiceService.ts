import { ulid } from 'ulid';
import { PPRAInvoiceStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { InvalidStateTransitionError, NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import type {
  CreatePPRAInvoiceInput,
  MarkPaidInput,
  ReturnPPRAInvoiceInput,
  SendToDGPRNInput,
} from '@/interfaces/http/schemas/ppraInvoice';

/** Roles that handle PPRA invoices. */
export const PPRA_INVOICE_ROLES: Role[] = [Role.ADMIN, Role.BUDGET_STAFF, Role.ADP_STAFF];

/**
 * PPRA Invoices service (v4.4.1 §4.27).
 *
 *   RECEIVED ──returnToPPRA──▶ RETURNED   (final; PPRA's corrected invoice is a NEW invoice)
 *   RECEIVED ──sendToDGPRN───▶ SENT_TO_DGPRN ──markPaid──▶ PAID
 *
 * Same shape as RegistryService: a singleton of small methods; problems
 * surface as DomainErrors so the HTTP mapper renders 4xx.
 */
export const ppraInvoiceService = {
  async createInvoice(createdByUserId: string, input: CreatePPRAInvoiceInput): Promise<{ id: string }> {
    const clash = await prisma.pPRAInvoice.findUnique({ where: { invoiceNumber: input.invoiceNumber }, select: { id: true } });
    if (clash) throw duplicateNumber(input.invoiceNumber);

    const found = await prisma.iTPerforma.findMany({ where: { id: { in: input.itPerformaIds } }, select: { id: true } });
    const foundIds = new Set(found.map((f) => f.id));
    const missing = input.itPerformaIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new ValidationError(`IT Proforma not found: ${missing.join(', ')}`, { itPerformaIds: 'not_found' });
    }

    const id = ulid();
    try {
      await prisma.$transaction(async (tx) => {
        await tx.pPRAInvoice.create({
          data: {
            id,
            invoiceNumber: input.invoiceNumber,
            receivedOn: input.receivedOn,
            amount: new Prisma.Decimal(input.amount),
            currency: input.currency,
            documentKey: input.documentKey?.trim() ? input.documentKey.trim() : null,
            createdByUserId,
          },
        });
        await tx.pPRAInvoiceITLink.createMany({
          data: input.itPerformaIds.map((itPerformaId) => ({ id: ulid(), ppraInvoiceId: id, itPerformaId })),
        });
      });
    } catch (err) {
      // Two users saving the same number at once: the unique index catches it.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw duplicateNumber(input.invoiceNumber);
      throw err;
    }
    return { id };
  },

  async returnToPPRA(id: string, input: ReturnPPRAInvoiceInput): Promise<void> {
    await transition(id, PPRAInvoiceStatus.RECEIVED, 'returnToPPRA', {
      status: PPRAInvoiceStatus.RETURNED,
      returnedReason: input.reason,
      returnedOn: input.returnedOn ?? today(),
    });
  },

  async sendToDGPRN(id: string, input: SendToDGPRNInput): Promise<void> {
    await transition(id, PPRAInvoiceStatus.RECEIVED, 'sendToDGPRN', {
      status: PPRAInvoiceStatus.SENT_TO_DGPRN,
      sentToDGPRNOn: input.sentOn ?? today(),
    });
  },

  async markPaid(id: string, input: MarkPaidInput): Promise<void> {
    await transition(id, PPRAInvoiceStatus.SENT_TO_DGPRN, 'markPaid', {
      status: PPRAInvoiceStatus.PAID,
      paidOn: input.paidOn ?? today(),
    });
  },
};

/**
 * Compare-and-set on status: the update only lands while the invoice is still
 * in `from`, so two users acting at once cannot both win.
 */
async function transition(
  id: string,
  from: PPRAInvoiceStatus,
  event: string,
  data: Prisma.PPRAInvoiceUpdateManyMutationInput,
): Promise<void> {
  const res = await prisma.pPRAInvoice.updateMany({
    where: { id, status: from },
    data: { ...data, version: { increment: 1 } },
  });
  if (res.count === 1) return;
  const row = await prisma.pPRAInvoice.findUnique({ where: { id }, select: { status: true } });
  if (!row) throw new NotFoundError('PPRAInvoice', id);
  throw new InvalidStateTransitionError(row.status, event);
}

function duplicateNumber(invoiceNumber: string): ValidationError {
  return new ValidationError(`Invoice number ${invoiceNumber} is already used`, { invoiceNumber: 'duplicate' });
}

/** Today's calendar date at UTC midnight, for a DATE column. */
function today(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}
