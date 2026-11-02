import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listDecidedGrievances } from '@/interfaces/ui/views/SpecialCaseViews';
import { AppealForm } from './AppealForm';

export const metadata = { title: 'File appeal • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewAppealPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF, Role.FIRM_REP]);
  const grievances = await listDecidedGrievances();
  return (
    <>
      <h1>File appeal</h1>
      <p className="muted">File a second-tier appeal against a decided grievance. Only one appeal per grievance.</p>
      <AppealForm grievances={grievances} />
    </>
  );
}
