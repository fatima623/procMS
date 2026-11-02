import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { IncidentForm } from './IncidentForm';

export const metadata = { title: 'Log incident • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewIncidentPage() {
  await requireRoles([Role.ADMIN, Role.DGDP, Role.SECY_DP, Role.DP_N, Role.COORD_STAFF]);
  return (
    <>
      <h1>Log mis-procurement incident</h1>
      <p className="muted">Record a specific breach of the Rules. Severity defaults to MEDIUM; critical breaches should be escalated and reported.</p>
      <IncidentForm />
    </>
  );
}
