import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listContractsForPicker, listInvoicesForPicker } from '@/interfaces/ui/views/WorkflowListViews';
import { ShipmentForm } from './ShipmentForm';

export const metadata = { title: 'Record shipment • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewShipmentPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const [contracts, invoices] = await Promise.all([listContractsForPicker(), listInvoicesForPicker()]);
  return (
    <>
      <h1>Record shipment</h1>
      <p className="muted">Capture the dispatch of stores. Receipt date can be filled now or later via "Mark received".</p>
      <ShipmentForm contracts={contracts} invoices={invoices} />
    </>
  );
}
