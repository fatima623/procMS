import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { DisposalForm } from './DisposalForm';

export const metadata = { title: 'New disposal case • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewDisposalPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  return (
    <>
      <h1>New disposal case</h1>
      <p className="muted">Create a case with one or more lots. Open it for bids once ready; award each lot as winning bids come in.</p>
      <DisposalForm />
    </>
  );
}
