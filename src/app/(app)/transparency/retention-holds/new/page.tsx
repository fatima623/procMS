import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { RetentionHoldForm } from './RetentionHoldForm';

export const metadata = { title: 'Place retention hold • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewRetentionHoldPage() {
  await requireRoles([Role.ADMIN, Role.DGDP, Role.SECY_DP, Role.DP_N]);
  return (
    <>
      <h1>Place retention hold</h1>
      <p className="muted">Freeze an indent, contract, or firm record under hold. Disposal / purge jobs skip subjects with an active hold.</p>
      <RetentionHoldForm />
    </>
  );
}
