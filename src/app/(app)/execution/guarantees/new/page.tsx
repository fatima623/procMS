import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listContractsForPicker } from '@/interfaces/ui/views/WorkflowListViews';
import { GuaranteeForm } from './GuaranteeForm';

export const metadata = { title: 'Record guarantee • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewGuaranteePage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const contracts = await listContractsForPicker();
  return (
    <>
      <h1>Record bank guarantee</h1>
      <p className="muted">Capture a Bid Security, Performance Bond, or Advance Payment Guarantee submitted by the firm.</p>
      <GuaranteeForm contracts={contracts} />
    </>
  );
}
