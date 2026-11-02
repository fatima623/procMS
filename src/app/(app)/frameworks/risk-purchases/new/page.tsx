import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listContractsForPicker } from '@/interfaces/ui/views/WorkflowListViews';
import { RiskPurchaseForm } from './RiskPurchaseForm';

export const metadata = { title: 'Open risk-purchase case • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewRiskPurchasePage() {
  await requireRoles([Role.ADMIN, Role.DP_N, Role.DGDP, Role.ADP_STAFF, Role.COORD_STAFF]);
  const contracts = await listContractsForPicker();
  return (
    <>
      <h1>Open risk-purchase case</h1>
      <p className="muted">Capture the defaulting supplier's contract and the reason. The replacement indent/contract and settled amount can be linked later as they progress.</p>
      <RiskPurchaseForm contracts={contracts} />
    </>
  );
}
