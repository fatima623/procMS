import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listInvoicesForPicker } from '@/interfaces/ui/views/WorkflowListViews';
import { prisma } from '@/infrastructure/db/prisma';
import { executionObligations } from '@/infrastructure/execution/ExecutionObligationService';
import { PaymentForm } from './PaymentForm';

export const metadata = { title: 'Record payment • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewPaymentPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const invoices = await listInvoicesForPicker();

  // Precompute net outstanding LD per contract that appears in the picker, so
  // the form can show a "deduct this from the next payment" hint.
  const invoicesWithContract = await prisma.invoice.findMany({
    where: { id: { in: invoices.map((i) => i.id) } },
    select: { id: true, contractId: true },
  });
  const contractIds = Array.from(new Set(invoicesWithContract.map((i) => i.contractId)));
  const outstanding = Object.fromEntries(
    await Promise.all(
      contractIds.map(async (cid) => [cid, (await executionObligations.outstandingLDMinor(cid)).toString()] as const),
    ),
  );
  const invoiceToContract: Record<string, string> = Object.fromEntries(invoicesWithContract.map((i) => [i.id, i.contractId]));

  return (
    <>
      <h1>Record payment</h1>
      <p className="muted">Record a payment release against an invoice. Multiple payments against one invoice are allowed (partial releases). <strong>Deduct any outstanding Liquidated Damages</strong> before releasing.</p>
      <PaymentForm invoices={invoices} outstandingLDByContract={outstanding} invoiceToContract={invoiceToContract} />
    </>
  );
}
