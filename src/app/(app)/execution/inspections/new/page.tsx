import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listContractsForPicker } from '@/interfaces/ui/views/WorkflowListViews';
import { InspectionForm } from './InspectionForm';

export const metadata = { title: 'Record inspection • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewInspectionPage() {
  await requireRoles([Role.ADMIN, Role.INSPECTORATE]);
  const contracts = await listContractsForPicker();
  return (
    <>
      <h1>Record inspection</h1>
      <p className="muted">Inspectorate verdict on delivered stores. If the verdict is <strong>DISCREPANCY</strong>, raise discrepancy rows from the inspections list.</p>
      <InspectionForm contracts={contracts} />
    </>
  );
}
