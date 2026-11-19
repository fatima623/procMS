import { ulid } from 'ulid';
import { PPRAInvoiceStatus } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import { LINK_REQUIRED_MESSAGE, type CreateDGPRNAckInput } from '@/interfaces/http/schemas/dgprnAck';

/** Invoice statuses DGPR(N) can acknowledge — it has to have been sent to them. */
export const ACKABLE_INVOICE_STATUSES: PPRAInvoiceStatus[] = [PPRAInvoiceStatus.SENT_TO_DGPRN, PPRAInvoiceStatus.PAID];

/**
 * DGPR(N) Acknowledgement service (v4.4.1 §4.28). Same shape as RegistryService:
 * a singleton of small single-write methods; problems surface as DomainErrors.
 */
export const dgprnAckService = {
  async createAcknowledgement(createdByUserId: string, input: CreateDGPRNAckInput): Promise<{ id: string }> {
    if (!input.invoiceId && !input.itPerformaId) {
      throw new ValidationError(LINK_REQUIRED_MESSAGE, { invoiceId: 'required' });
    }

    if (input.invoiceId) {
      const invoice = await prisma.pPRAInvoice.findUnique({
        where: { id: input.invoiceId },
        select: { invoiceNumber: true, status: true },
      });
      if (!invoice) throw new NotFoundError('PPRAInvoice', input.invoiceId);
      if (!ACKABLE_INVOICE_STATUSES.includes(invoice.status)) {
        throw new ValidationError(
          `Invoice ${invoice.invoiceNumber} is ${invoice.status} — only invoices sent to DGPR(N) or paid can be acknowledged`,
          { invoiceId: 'not_sent_to_dgprn' },
        );
      }
    }

    if (input.itPerformaId) {
      const it = await prisma.iTPerforma.findUnique({ where: { id: input.itPerformaId }, select: { id: true } });
      if (!it) throw new NotFoundError('ITPerforma', input.itPerformaId);
    }

    const id = ulid();
    await prisma.dGPRNAcknowledgement.create({
      data: {
        id,
        invoiceId: input.invoiceId ?? null,
        itPerformaId: input.itPerformaId ?? null,
        receivedOn: input.receivedOn,
        referenceNumber: input.referenceNumber,
        remarks: input.remarks?.trim() ? input.remarks.trim() : null,
        createdByUserId,
      },
    });
    return { id };
  },
};
