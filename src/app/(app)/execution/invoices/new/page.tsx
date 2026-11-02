import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listContractsForPicker } from '@/interfaces/ui/views/WorkflowListViews';
import { InvoiceForm } from './InvoiceForm';

export const metadata = { title: 'Record invoice • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewInvoicePage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const contracts = await listContractsForPicker();
  return (
    <>
      <h1>Record invoice</h1>
      <p className="muted">Record an invoice / running bill received from the supplier.</p>
      <InvoiceForm contracts={contracts} />
    </>
  );
}
