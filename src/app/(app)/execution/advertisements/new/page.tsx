import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listIndentsForAdvertisement } from '@/interfaces/ui/views/WorkflowListViews';
import { AdvertisementForm } from './AdvertisementForm';

export const metadata = { title: 'Record advertisement • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewAdvertisementPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const indents = await listIndentsForAdvertisement();
  return (
    <>
      <h1>Record advertisement</h1>
      <p className="muted">Capture when and where the tender notice was published (PPRA Rule 12). Minimum response time: 15 days for national competitive bidding; 45 days for international.</p>
      <AdvertisementForm indents={indents} />
    </>
  );
}
