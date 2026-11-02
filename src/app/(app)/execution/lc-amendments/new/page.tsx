import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listLCsForPicker } from '@/interfaces/ui/views/WorkflowListViews';
import { LCAmendmentForm } from './LCAmendmentForm';

export const metadata = { title: 'Record LC amendment • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewLCAmendmentPage({ searchParams }: { searchParams: { lcId?: string } }) {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const lcs = await listLCsForPicker();
  const preselectLC = searchParams.lcId && lcs.some((l) => l.id === searchParams.lcId) ? searchParams.lcId : (lcs[0]?.id ?? '');
  return (
    <>
      <h1>Record LC amendment</h1>
      <p className="muted">Capture an LC amendment request and its finalisation with the bank.</p>
      <LCAmendmentForm lcs={lcs} preselectLC={preselectLC} />
    </>
  );
}
