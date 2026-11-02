import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listContractsForPicker } from '@/interfaces/ui/views/WorkflowListViews';
import { LDForm } from './LDForm';

export const metadata = { title: 'Assess LD • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewLDPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const contracts = await listContractsForPicker();
  return (
    <>
      <h1>Assess liquidated damages</h1>
      <p className="muted">Capture the delay window, the computed LD amount, and any waiver.</p>
      <LDForm contracts={contracts} />
    </>
  );
}
