import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listContractsForPicker } from '@/interfaces/ui/views/WorkflowListViews';
import { LCForm } from './LCForm';

export const metadata = { title: 'Record LC • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewLCPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const contracts = await listContractsForPicker();
  return (
    <>
      <h1>Record Letter of Credit</h1>
      <p className="muted">For an import contract, record the LC opened in favour of the foreign supplier.</p>
      <LCForm contracts={contracts} />
    </>
  );
}
