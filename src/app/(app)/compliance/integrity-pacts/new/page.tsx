import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listFirmsForPicker, listLiveIndentsForPicker } from '@/interfaces/ui/views/ComplianceViews';
import { IntegrityPactForm } from './IntegrityPactForm';

export const metadata = { title: 'Register integrity pact • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewIntegrityPactPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const [indents, firms] = await Promise.all([
    listLiveIndentsForPicker(),
    listFirmsForPicker(),
  ]);
  return (
    <>
      <h1>Register integrity pact</h1>
      <p className="muted">For procurements over PKR 10 M (PPRA Rule 7). Record the buyer-signed pact first; the supplier counter-signature can be recorded later from the list page.</p>
      <IntegrityPactForm indents={indents} firms={firms} />
    </>
  );
}
