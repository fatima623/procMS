import { IndentStatus } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { decimalToMinor } from '@/infrastructure/common/decimal';

/**
 * Admin / COORD / ADP read-side projections for the mid-workflow steps that
 * previously only appeared on the related indent detail page: IT Proformas,
 * Commercial Offers, CSTs and Purchase Requisitions.  These lists let an
 * admin (or coordinating staff) locate any workflow object directly and
 * open or progress it, instead of first navigating to the indent that owns it.
 */

export interface ITProformaRow {
  readonly id: string;
  readonly reference: string;
  readonly indentId: string;
  readonly indentSubject: string;
  readonly status: string;
  readonly indentStatus: string;
  readonly dispatchedAt: string | null;
  readonly closingAt: string | null;
  readonly firmCount: number;
  readonly technicalOffers: number;
  readonly commercialOffers: number;
  readonly createdAt: string;
}

export async function listITProformas(): Promise<readonly ITProformaRow[]> {
  const rows = await prisma.iTPerforma.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      indent: { select: { id: true, subject: true, status: true } },
      _count: { select: { firms: true, technicalOffers: true, commercialOffers: true } },
    },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    reference: r.reference,
    indentId: r.indent.id,
    indentSubject: r.indent.subject,
    status: r.status,
    indentStatus: r.indent.status,
    dispatchedAt: r.dispatchedAt?.toISOString() ?? null,
    closingAt: r.closingAt?.toISOString() ?? null,
    firmCount: r._count.firms,
    technicalOffers: r._count.technicalOffers,
    commercialOffers: r._count.commercialOffers,
    createdAt: r.createdAt.toISOString(),
  }));
}

export interface CommercialOfferRow {
  readonly id: string;
  readonly itPerformaId: string;
  readonly itReference: string;
  readonly indentId: string;
  readonly indentSubject: string;
  readonly firmId: string;
  readonly firmName: string;
  readonly status: string;
  readonly totalPriceMinor: string;
  readonly currency: string;
  readonly bidSecurityMinor: string | null;
  readonly deliveryWeeks: number | null;
  readonly openedAt: string;
}

export async function listCommercialOffers(): Promise<readonly CommercialOfferRow[]> {
  const rows = await prisma.commercialOffer.findMany({
    orderBy: { openedAt: 'desc' },
    include: {
      itPerforma: { select: { reference: true, indent: { select: { id: true, subject: true } } } },
      firm: { select: { id: true, name: true } },
    },
    take: 300,
  });
  return rows.map((r) => ({
    id: r.id,
    itPerformaId: r.itPerformaId,
    itReference: r.itPerforma.reference,
    indentId: r.itPerforma.indent.id,
    indentSubject: r.itPerforma.indent.subject,
    firmId: r.firm.id,
    firmName: r.firm.name,
    status: r.status,
    totalPriceMinor: decimalToMinor(r.totalPrice).toString(),
    currency: r.currency,
    bidSecurityMinor: r.bidSecurityAmount ? decimalToMinor(r.bidSecurityAmount).toString() : null,
    deliveryWeeks: r.deliveryWeeks,
    openedAt: r.openedAt.toISOString(),
  }));
}

export interface CSTRow {
  readonly id: string;
  readonly itPerformaId: string;
  readonly itReference: string;
  readonly indentId: string;
  readonly indentSubject: string;
  readonly status: string;
  readonly singleQuote: boolean;
  readonly lineCount: number;
  readonly hasPR: boolean;
  readonly createdAt: string;
  readonly approvedAt: string | null;
}

export async function listCSTs(): Promise<readonly CSTRow[]> {
  const rows = await prisma.cST.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      itPerforma: { select: { reference: true, indent: { select: { id: true, subject: true } } } },
      _count: { select: { lines: true } },
      purchaseRequisition: { select: { id: true } },
    },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    itPerformaId: r.itPerformaId,
    itReference: r.itPerforma.reference,
    indentId: r.itPerforma.indent.id,
    indentSubject: r.itPerforma.indent.subject,
    status: r.status,
    singleQuote: r.singleQuote,
    lineCount: r._count.lines,
    hasPR: !!r.purchaseRequisition,
    createdAt: r.createdAt.toISOString(),
    approvedAt: r.approvedAt?.toISOString() ?? null,
  }));
}

export interface PRRow {
  readonly id: string;
  readonly prNumber: string;
  readonly indentId: string;
  readonly indentSubject: string;
  readonly firmId: string;
  readonly firmName: string;
  readonly status: string;
  readonly amountMinor: string;
  readonly currency: string;
  readonly faxedAt: string | null;
  readonly createdAt: string;
  readonly hasContract: boolean;
}

export async function listPRs(): Promise<readonly PRRow[]> {
  const rows = await prisma.purchaseRequisition.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      firm: { select: { id: true, name: true } },
      cst: { select: { itPerforma: { select: { indent: { select: { id: true, subject: true } } } } } },
      contract: { select: { id: true } },
    },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    prNumber: r.prNumber,
    indentId: r.cst.itPerforma.indent.id,
    indentSubject: r.cst.itPerforma.indent.subject,
    firmId: r.firm.id,
    firmName: r.firm.name,
    status: r.status,
    amountMinor: decimalToMinor(r.amount).toString(),
    currency: r.currency,
    faxedAt: r.faxedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    hasContract: !!r.contract,
  }));
}

// -----------------------------------------------------------------------------
// Execution half — Advertisement, Contract, Guarantee, Invoice, Payment, LC
// -----------------------------------------------------------------------------

export interface AdvertisementRow {
  readonly id: string;
  readonly indentId: string;
  readonly indentSubject: string;
  readonly medium: string;
  readonly publishedOn: string;
  readonly biddingDocsIssuedOn: string | null;
  readonly bidSubmissionDeadline: string | null;
}

export async function listAdvertisements(): Promise<readonly AdvertisementRow[]> {
  const rows = await prisma.advertisement.findMany({
    orderBy: { publishedOn: 'desc' },
    include: { indent: { select: { id: true, subject: true } } },
    take: 300,
  });
  return rows.map((r) => ({
    id: r.id,
    indentId: r.indent.id,
    indentSubject: r.indent.subject,
    medium: r.medium,
    publishedOn: r.publishedOn.toISOString(),
    biddingDocsIssuedOn: r.biddingDocsIssuedOn?.toISOString() ?? null,
    bidSubmissionDeadline: r.bidSubmissionDeadline?.toISOString() ?? null,
  }));
}

export interface ContractRow {
  readonly id: string;
  readonly contractNumber: string;
  readonly indentId: string;
  readonly indentSubject: string;
  readonly firmId: string;
  readonly firmName: string;
  readonly status: string;
  readonly valueMinor: string;
  readonly currency: string;
  readonly awardedOn: string | null;
  readonly signedOn: string | null;
  readonly takingOverCertifiedOn: string | null;
  readonly closedOn: string | null;
  readonly guaranteeCount: number;
  readonly invoiceCount: number;
  readonly paymentCount: number;
  readonly lcCount: number;
}

export async function listContracts(): Promise<readonly ContractRow[]> {
  const rows = await prisma.contract.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      indent: { select: { id: true, subject: true } },
      firm: { select: { id: true, name: true } },
      _count: { select: { guarantees: true, invoices: true, payments: true, lettersOfCredit: true } },
    },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    contractNumber: r.contractNumber,
    indentId: r.indent.id,
    indentSubject: r.indent.subject,
    firmId: r.firm.id,
    firmName: r.firm.name,
    status: r.status,
    valueMinor: decimalToMinor(r.value).toString(),
    currency: r.currency,
    awardedOn: r.awardedOn?.toISOString() ?? null,
    signedOn: r.signedOn?.toISOString() ?? null,
    takingOverCertifiedOn: r.takingOverCertifiedOn?.toISOString() ?? null,
    closedOn: r.closedOn?.toISOString() ?? null,
    guaranteeCount: r._count.guarantees,
    invoiceCount: r._count.invoices,
    paymentCount: r._count.payments,
    lcCount: r._count.lettersOfCredit,
  }));
}

export interface GuaranteeRow {
  readonly id: string;
  readonly contractId: string;
  readonly contractNumber: string;
  readonly firmName: string;
  readonly type: string;
  readonly amountMinor: string;
  readonly currency: string;
  readonly furnishedOn: string | null;
  readonly expiresOn: string | null;
}

export async function listGuarantees(): Promise<readonly GuaranteeRow[]> {
  const rows = await prisma.guarantee.findMany({
    orderBy: { createdAt: 'desc' },
    include: { contract: { include: { firm: { select: { name: true } } } } },
    take: 300,
  });
  return rows.map((r) => ({
    id: r.id,
    contractId: r.contractId,
    contractNumber: r.contract.contractNumber,
    firmName: r.contract.firm.name,
    type: r.type,
    amountMinor: decimalToMinor(r.amount).toString(),
    currency: r.currency,
    furnishedOn: r.furnishedOn?.toISOString() ?? null,
    expiresOn: r.expiresOn?.toISOString() ?? null,
  }));
}

export interface InvoiceRow {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly contractId: string;
  readonly contractNumber: string;
  readonly firmName: string;
  readonly receivedOn: string;
  readonly amountMinor: string;
  readonly currency: string;
  readonly paymentCount: number;
  readonly paidMinor: string;
}

export async function listInvoices(): Promise<readonly InvoiceRow[]> {
  const rows = await prisma.invoice.findMany({
    orderBy: { receivedOn: 'desc' },
    include: {
      contract: { include: { firm: { select: { name: true } } } },
      payments: true,
    },
    take: 300,
  });
  return rows.map((r) => {
    const paid = r.payments.reduce((sum, p) => sum + decimalToMinor(p.amount), 0n);
    return {
      id: r.id,
      invoiceNumber: r.invoiceNumber,
      contractId: r.contractId,
      contractNumber: r.contract.contractNumber,
      firmName: r.contract.firm.name,
      receivedOn: r.receivedOn.toISOString(),
      amountMinor: decimalToMinor(r.amount).toString(),
      currency: r.currency,
      paymentCount: r.payments.length,
      paidMinor: paid.toString(),
    };
  });
}

export interface PaymentRow {
  readonly id: string;
  readonly contractNumber: string;
  readonly invoiceNumber: string;
  readonly firmName: string;
  readonly paidOn: string;
  readonly amountMinor: string;
  readonly currency: string;
}

export async function listPayments(): Promise<readonly PaymentRow[]> {
  const rows = await prisma.payment.findMany({
    orderBy: { paidOn: 'desc' },
    include: {
      invoice: { select: { invoiceNumber: true } },
      contract: { include: { firm: { select: { name: true } } } },
    },
    take: 300,
  });
  return rows.map((r) => ({
    id: r.id,
    contractNumber: r.contract.contractNumber,
    invoiceNumber: r.invoice.invoiceNumber,
    firmName: r.contract.firm.name,
    paidOn: r.paidOn.toISOString(),
    amountMinor: decimalToMinor(r.amount).toString(),
    currency: r.currency,
  }));
}

export interface LCRow {
  readonly id: string;
  readonly lcNumber: string;
  readonly contractId: string;
  readonly contractNumber: string;
  readonly firmName: string;
  readonly openedOn: string | null;
  readonly amendmentCount: number;
}

export async function listLCs(): Promise<readonly LCRow[]> {
  const rows = await prisma.letterOfCredit.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      contract: { include: { firm: { select: { name: true } } } },
      _count: { select: { amendments: true } },
    },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    lcNumber: r.lcNumber,
    contractId: r.contractId,
    contractNumber: r.contract.contractNumber,
    firmName: r.contract.firm.name,
    openedOn: r.openedOn?.toISOString() ?? null,
    amendmentCount: r._count.amendments,
  }));
}

// -----------------------------------------------------------------------------
// Reference listings for the "+ New" forms
// -----------------------------------------------------------------------------

export interface IndentRef {
  readonly id: string;
  readonly indentNumber: string;
  readonly subject: string;
  readonly status: string;
}

/** Indents at or past IT-approval stage — admin pick-list for Advertisement. */
export async function listIndentsForAdvertisement(): Promise<readonly IndentRef[]> {
  const rows = await prisma.indent.findMany({
    where: {
      status: {
        in: [
          IndentStatus.IT_APPROVAL,
          IndentStatus.IT_DISPATCHED,
          IndentStatus.TECH_OFFERS_OPEN,
          IndentStatus.TSR_IN_PROGRESS,
          IndentStatus.COMMERCIAL_OPEN,
          IndentStatus.CST_PREPARATION,
          IndentStatus.CST_APPROVAL,
          IndentStatus.PR_ISSUED,
        ],
      },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, indentNumber: true, subject: true, status: true },
    take: 100,
  });
  return rows;
}

/** PRs that are ACKNOWLEDGED / CLOSED but do not yet have a contract — ready for award. */
export async function listPRsAwaitingContract(): Promise<readonly {
  readonly id: string;
  readonly prNumber: string;
  readonly indentId: string;
  readonly indentSubject: string;
  readonly firmId: string;
  readonly firmName: string;
  readonly amountMinor: string;
  readonly currency: string;
}[]> {
  const rows = await prisma.purchaseRequisition.findMany({
    where: { contract: null },
    include: {
      firm: { select: { id: true, name: true } },
      cst: { select: { itPerforma: { select: { indent: { select: { id: true, subject: true } } } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return rows.map((r) => ({
    id: r.id,
    prNumber: r.prNumber,
    indentId: r.cst.itPerforma.indent.id,
    indentSubject: r.cst.itPerforma.indent.subject,
    firmId: r.firm.id,
    firmName: r.firm.name,
    amountMinor: decimalToMinor(r.amount).toString(),
    currency: r.currency,
  }));
}

/** Contracts (for picking a parent when creating guarantees / invoices / LCs). */
export async function listContractsForPicker(): Promise<readonly {
  readonly id: string;
  readonly contractNumber: string;
  readonly firmName: string;
  readonly status: string;
}[]> {
  const rows = await prisma.contract.findMany({
    orderBy: { createdAt: 'desc' },
    include: { firm: { select: { name: true } } },
    take: 200,
  });
  return rows.map((r) => ({ id: r.id, contractNumber: r.contractNumber, firmName: r.firm.name, status: r.status }));
}

/** Invoices (for picking a parent when recording a payment). */
export async function listInvoicesForPicker(): Promise<readonly {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly contractNumber: string;
  readonly firmName: string;
  readonly amountMinor: string;
  readonly currency: string;
}[]> {
  const rows = await prisma.invoice.findMany({
    orderBy: { receivedOn: 'desc' },
    include: { contract: { include: { firm: { select: { name: true } } } } },
    take: 300,
  });
  return rows.map((r) => ({
    id: r.id,
    invoiceNumber: r.invoiceNumber,
    contractNumber: r.contract.contractNumber,
    firmName: r.contract.firm.name,
    amountMinor: decimalToMinor(r.amount).toString(),
    currency: r.currency,
  }));
}

/** LCs (for picking a parent when recording an amendment). */
export async function listLCsForPicker(): Promise<readonly {
  readonly id: string;
  readonly lcNumber: string;
  readonly contractNumber: string;
}[]> {
  const rows = await prisma.letterOfCredit.findMany({
    orderBy: { createdAt: 'desc' },
    include: { contract: { select: { contractNumber: true } } },
    take: 200,
  });
  return rows.map((r) => ({ id: r.id, lcNumber: r.lcNumber, contractNumber: r.contract.contractNumber }));
}
