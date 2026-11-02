import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listFMSEligibleIndents } from '@/interfaces/ui/views/SpecialCaseViews';
import { FMSForm } from './FMSForm';

export const metadata = { title: 'Open FMS case • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewFMSPage() {
  await requireRoles([Role.ADMIN, Role.DP_N, Role.DGDP, Role.SECY_DP]);
  const indents = await listFMSEligibleIndents();
  return (
    <>
      <h1>Open FMS case</h1>
      <p className="muted">Attach a government-to-government procurement to an indent that has not yet got one. The LOR is the opening step; the LOA follows later.</p>
      <FMSForm indents={indents} />
    </>
  );
}
