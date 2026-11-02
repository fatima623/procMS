import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listContractsForPicker } from '@/interfaces/ui/views/WorkflowListViews';
import { DPExtensionForm } from './DPExtensionForm';

export const metadata = { title: 'Extend DP • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewDPExtensionPage() {
  await requireRoles([Role.ADMIN, Role.DP_N, Role.ADP_STAFF, Role.COORD_STAFF]);
  const contracts = await listContractsForPicker();
  return (
    <>
      <h1>Extend delivery period</h1>
      <p className="muted">Record a formal extension of the contractual DP. The reason text and the signed order (document key) should be captured.</p>
      <DPExtensionForm contracts={contracts} />
    </>
  );
}
