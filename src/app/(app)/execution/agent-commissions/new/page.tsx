import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listContractsForPicker } from '@/interfaces/ui/views/WorkflowListViews';
import { AgentCommissionForm } from './AgentCommissionForm';

export const metadata = { title: 'Disclose agent commission • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewAgentCommissionPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const contracts = await listContractsForPicker();
  return (
    <>
      <h1>Disclose agent commission</h1>
      <p className="muted">Record a commission paid or payable to an agent in connection with the contract. Senior authority approves separately before payment.</p>
      <AgentCommissionForm contracts={contracts} />
    </>
  );
}
