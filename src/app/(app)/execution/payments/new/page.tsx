import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listInvoicesForPicker } from '@/interfaces/ui/views/WorkflowListViews';
import { PaymentForm } from './PaymentForm';

export const metadata = { title: 'Record payment • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewPaymentPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const invoices = await listInvoicesForPicker();
  return (
    <>
      <h1>Record payment</h1>
      <p className="muted">Record a payment release against an invoice. Multiple payments against one invoice are allowed (partial releases).</p>
      <PaymentForm invoices={invoices} />
    </>
  );
}
