import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { FirmForm } from '../FirmForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'New firm • Admin' };

export default async function NewFirmPage() {
  await requireRoles([Role.ADMIN]);
  return (
    <>
      <h1>New firm</h1>
      <FirmForm mode="create" />
    </>
  );
}
