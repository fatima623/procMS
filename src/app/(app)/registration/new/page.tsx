import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listFirmsForPicker } from '@/interfaces/ui/views/ComplianceViews';
import { RegistrationForm } from './RegistrationForm';

export const metadata = { title: 'Submit registration • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewRegistrationPage() {
  await requireRoles([Role.ADMIN, Role.COORD_STAFF, Role.ADP_STAFF, Role.FIRM_REP]);
  const firms = await listFirmsForPicker();
  return (
    <>
      <h1>Submit firm registration</h1>
      <p className="muted">Submit a pre-qualification case for the lead agency to vet. On approval, the registration becomes a dated certificate for that category.</p>
      <RegistrationForm firms={firms} />
    </>
  );
}
