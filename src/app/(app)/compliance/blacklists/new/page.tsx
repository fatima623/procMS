import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listFirmsForPicker } from '@/interfaces/ui/views/ComplianceViews';
import { BlacklistForm } from './BlacklistForm';

export const metadata = { title: 'Declare blacklist • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewBlacklistPage() {
  await requireRoles([Role.ADMIN, Role.DGDP, Role.SECY_DP]);
  const firms = await listFirmsForPicker();
  return (
    <>
      <h1>Declare blacklist</h1>
      <p className="muted">PPRA Rule 19 — grounds, duration and the signed order must be recorded. The bidder has 30 days from this declaration to petition the Authority for review.</p>
      <BlacklistForm firms={firms} />
    </>
  );
}
