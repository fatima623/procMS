import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listUsersForPicker } from '@/interfaces/ui/views/GovernanceViews';
import { CommitteeForm } from './CommitteeForm';

export const metadata = { title: 'Form committee • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewCommitteePage() {
  await requireRoles([Role.ADMIN, Role.DGDP, Role.SECY_DP]);
  const users = await listUsersForPicker();
  return (
    <>
      <h1>Form committee</h1>
      <p className="muted">Pick the kind, give it a name and a term, then add members. The service refuses a GRC with an even-sized membership.</p>
      <CommitteeForm users={users} />
    </>
  );
}
