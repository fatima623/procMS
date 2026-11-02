import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listContractsForPicker } from '@/interfaces/ui/views/WorkflowListViews';
import { InsuranceForm } from './InsuranceForm';

export const metadata = { title: 'Record insurance • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewInsurancePage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const contracts = await listContractsForPicker();
  return (
    <>
      <h1>Record insurance policy</h1>
      <p className="muted">Capture a marine, war-risk, transit, or comprehensive policy covering the contract's deliveries.</p>
      <InsuranceForm contracts={contracts} />
    </>
  );
}
