import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listFirmsForPicker } from '@/interfaces/ui/views/ComplianceViews';
import { FrameworkForm } from './FrameworkForm';

export const metadata = { title: 'New framework • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewFrameworkPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const firms = await listFirmsForPicker();
  return (
    <>
      <h1>New framework agreement</h1>
      <p className="muted">Pick one or more participating firms (OPEN frameworks re-open for mini-competitions; CLOSED ones are fixed-price). Starts in DRAFT; activate separately once signed.</p>
      <FrameworkForm firms={firms} />
    </>
  );
}
