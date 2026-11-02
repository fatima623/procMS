import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listFirmsForPicker, listLiveIndentsForPicker } from '@/interfaces/ui/views/ComplianceViews';
import { GrievanceForm } from './GrievanceForm';

export const metadata = { title: 'File grievance • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewGrievancePage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF, Role.FIRM_REP]);
  const [indents, firms] = await Promise.all([listLiveIndentsForPicker(), listFirmsForPicker()]);
  return (
    <>
      <h1>File grievance</h1>
      <p className="muted">Record a bidder's complaint against the eligibility, criteria or terms of the bid (pre-award) or anything post-award. The complaint is addressed by the GRC within 10 working days (PPRA Rule 48).</p>
      <GrievanceForm indents={indents} firms={firms} />
    </>
  );
}
