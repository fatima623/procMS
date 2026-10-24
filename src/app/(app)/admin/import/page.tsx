import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { ImportPanel } from './ImportPanel';

export const metadata = { title: 'Bulk import • Admin' };

export default async function AdminImportPage() {
  await requireRoles([Role.ADMIN]);
  return (
    <>
      <h1>Bulk import</h1>
      <p className="muted">Upload a CSV to seed firms or users in one shot. Rows that fail validation are reported individually; successful rows commit even if others fail.</p>
      <ImportPanel />
    </>
  );
}
