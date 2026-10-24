import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { FiscalYearForm } from '../FiscalYearForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'New fiscal year • Admin' };

export default async function NewFiscalYearPage() {
  await requireRoles([Role.ADMIN]);
  return (
    <>
      <h1>New fiscal year</h1>
      <FiscalYearForm mode="create" />
    </>
  );
}
