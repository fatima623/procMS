import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listFiscalYears, listBudgetHeads } from '@/interfaces/ui/views/PlanningViews';
import { AnnualPlanForm } from './AnnualPlanForm';

export const metadata = { title: 'Draft annual plan • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewAnnualPlanPage() {
  await requireRoles([Role.ADMIN, Role.DGDP, Role.SECY_DP, Role.DP_N, Role.COORD_STAFF]);
  const [fiscalYears, budgetHeads] = await Promise.all([listFiscalYears(), listBudgetHeads()]);
  return (
    <>
      <h1>Draft annual procurement plan</h1>
      <p className="muted">Add one row per intended procurement. The plan starts in DRAFT; publish it later from the plans list.</p>
      <AnnualPlanForm fiscalYears={fiscalYears} budgetHeads={budgetHeads} />
    </>
  );
}
