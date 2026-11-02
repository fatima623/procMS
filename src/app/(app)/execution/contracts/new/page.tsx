import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listPRsAwaitingContract } from '@/interfaces/ui/views/WorkflowListViews';
import { ContractForm } from './ContractForm';

export const metadata = { title: 'Award contract • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewContractPage({ searchParams }: { searchParams: { prId?: string } }) {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const prs = await listPRsAwaitingContract();
  const preselectPR = searchParams.prId && prs.some((p) => p.id === searchParams.prId) ? searchParams.prId : (prs[0]?.id ?? '');
  return (
    <>
      <h1>Award contract</h1>
      <p className="muted">Captures the signed contract that follows an acknowledged Purchase Requisition. Pick a PR to pre-fill the indent, firm and amount.</p>
      <ContractForm prs={prs} preselectPR={preselectPR} />
    </>
  );
}
