import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listContractsForPicker } from '@/interfaces/ui/views/WorkflowListViews';
import { ContractAmendmentForm } from './ContractAmendmentForm';

export const metadata = { title: 'Propose amendment • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewAmendmentPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const contracts = await listContractsForPicker();
  return (
    <>
      <h1>Propose contract amendment</h1>
      <p className="muted">Capture the proposed change. The amendment stays PROPOSED until a senior authority approves or rejects it. A VALUE or QTY amendment with a non-null delta moves the contract value at approval time.</p>
      <ContractAmendmentForm contracts={contracts} />
    </>
  );
}
