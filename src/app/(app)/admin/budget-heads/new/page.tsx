import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { BudgetHeadForm } from '../BudgetHeadForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'New budget head • Admin' };

export default async function NewBudgetHeadPage() {
  await requireRoles([Role.ADMIN]);
  return (
    <>
      <h1>New budget head</h1>
      <BudgetHeadForm mode="create" />
    </>
  );
}
