import { ulid } from 'ulid';
import { prisma } from '@/infrastructure/db/prisma';
import { NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import type {
  CreateAdvertisementInput,
  CreateContractInput,
  CreateGuaranteeInput,
  CreateInvoiceInput,
  CreatePaymentInput,
  CreateLCInput,
  CreateLCAmendmentInput,
} from '@/interfaces/http/schemas/execution';

/**
 * Admin-only service for the execution-half models. These records capture
 * the real-world side of a procurement case *after* the Purchase Requisition
 * (advertisement published, contract signed, bank guarantee furnished,
 * invoice received, payment released, LC opened/amended). They have no
 * workflow approvals of their own — they are evidence rows that the
 * compliance engine evaluates against the PPRA / DPP&I-35 execution rules.
 *
 * Each method is a single-write transaction; FK/unique violations are
 * surfaced as plain DomainError so the HTTP mapper renders them as 400s.
 */
export const executionAdmin = {
  async createAdvertisement(input: CreateAdvertisementInput): Promise<{ id: string }> {
    const indent = await prisma.indent.findUnique({ where: { id: input.indentId }, select: { id: true } });
    if (!indent) throw new NotFoundError('Indent', input.indentId);
    const id = ulid();
    await prisma.advertisement.create({
      data: {
        id,
        indentId: input.indentId,
        medium: input.medium,
        publishedOn: input.publishedOn,
        biddingDocsIssuedOn: input.biddingDocsIssuedOn ?? null,
        bidSubmissionDeadline: input.bidSubmissionDeadline ?? null,
      },
    });
    return { id };
  },

  async createContract(input: CreateContractInput): Promise<{ id: string }> {
    const [indent, firm, pr] = await Promise.all([
      prisma.indent.findUnique({ where: { id: input.indentId }, select: { id: true } }),
      prisma.firm.findUnique({ where: { id: input.firmId }, select: { id: true } }),
      input.purchaseRequisitionId
        ? prisma.purchaseRequisition.findUnique({ where: { id: input.purchaseRequisitionId }, select: { id: true, contract: { select: { id: true } } } })
        : Promise.resolve(null),
    ]);
    if (!indent) throw new NotFoundError('Indent', input.indentId);
    if (!firm) throw new NotFoundError('Firm', input.firmId);
    if (input.purchaseRequisitionId && !pr) throw new NotFoundError('PurchaseRequisition', input.purchaseRequisitionId);
    if (pr?.contract) throw new ValidationError('That PR already has a contract');
    const existing = await prisma.contract.findUnique({ where: { indentId: input.indentId }, select: { id: true } });
    if (existing) throw new ValidationError(`Indent ${input.indentId} already has contract ${existing.id}`);

    const id = ulid();
    await prisma.contract.create({
      data: {
        id,
        indentId: input.indentId,
        purchaseRequisitionId: input.purchaseRequisitionId ?? null,
        firmId: input.firmId,
        contractNumber: input.contractNumber,
        value: input.value,
        currency: input.currency,
        awardedOn: input.awardedOn ?? null,
        signedOn: input.signedOn ?? null,
        status: input.status,
        takingOverCertifiedOn: input.takingOverCertifiedOn ?? null,
        closedOn: input.closedOn ?? null,
      },
    });
    return { id };
  },

  async createGuarantee(input: CreateGuaranteeInput): Promise<{ id: string }> {
    const contract = await prisma.contract.findUnique({ where: { id: input.contractId }, select: { id: true } });
    if (!contract) throw new NotFoundError('Contract', input.contractId);
    const id = ulid();
    await prisma.guarantee.create({
      data: {
        id,
        contractId: input.contractId,
        type: input.type,
        amount: input.amount,
        currency: input.currency,
        furnishedOn: input.furnishedOn ?? null,
        expiresOn: input.expiresOn ?? null,
      },
    });
    return { id };
  },

  async createInvoice(input: CreateInvoiceInput): Promise<{ id: string }> {
    const contract = await prisma.contract.findUnique({ where: { id: input.contractId }, select: { id: true } });
    if (!contract) throw new NotFoundError('Contract', input.contractId);
    const id = ulid();
    await prisma.invoice.create({
      data: {
        id,
        contractId: input.contractId,
        invoiceNumber: input.invoiceNumber,
        receivedOn: input.receivedOn,
        amount: input.amount,
        currency: input.currency,
      },
    });
    return { id };
  },

  async createPayment(input: CreatePaymentInput): Promise<{ id: string }> {
    const invoice = await prisma.invoice.findUnique({ where: { id: input.invoiceId }, select: { id: true, contractId: true } });
    if (!invoice) throw new NotFoundError('Invoice', input.invoiceId);
    const id = ulid();
    await prisma.payment.create({
      data: {
        id,
        invoiceId: input.invoiceId,
        contractId: invoice.contractId,
        paidOn: input.paidOn,
        amount: input.amount,
        currency: input.currency,
      },
    });
    return { id };
  },

  async createLC(input: CreateLCInput): Promise<{ id: string }> {
    const contract = await prisma.contract.findUnique({ where: { id: input.contractId }, select: { id: true } });
    if (!contract) throw new NotFoundError('Contract', input.contractId);
    const id = ulid();
    await prisma.letterOfCredit.create({
      data: {
        id,
        contractId: input.contractId,
        lcNumber: input.lcNumber,
        openedOn: input.openedOn ?? null,
      },
    });
    return { id };
  },

  async createLCAmendment(input: CreateLCAmendmentInput): Promise<{ id: string }> {
    const lc = await prisma.letterOfCredit.findUnique({ where: { id: input.letterOfCreditId }, select: { id: true } });
    if (!lc) throw new NotFoundError('LetterOfCredit', input.letterOfCreditId);
    const id = ulid();
    await prisma.lCAmendment.create({
      data: {
        id,
        letterOfCreditId: input.letterOfCreditId,
        requestedOn: input.requestedOn,
        finalizedOn: input.finalizedOn ?? null,
      },
    });
    return { id };
  },
};
