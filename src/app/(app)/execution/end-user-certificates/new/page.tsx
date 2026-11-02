import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listContractsForPicker } from '@/interfaces/ui/views/WorkflowListViews';
import { EUCForm } from './EUCForm';

export const metadata = { title: 'Issue EUC • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewEUCPage() {
  await requireRoles([Role.ADMIN, Role.DP_N, Role.DGDP]);
  const contracts = await listContractsForPicker();
  return (
    <>
      <h1>Issue End-User Certificate</h1>
      <p className="muted">For imports of controlled goods, record the issuing authority's EUC. Only DP(N) / DGDP / ADMIN can issue.</p>
      <EUCForm contracts={contracts} />
    </>
  );
}
