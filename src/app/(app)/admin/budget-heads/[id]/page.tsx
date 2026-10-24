import { notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminBudgetHeadService } from '@/application/admin/AdminBudgetHeadService';
import { BudgetHeadForm } from '../BudgetHeadForm';
import { NotFoundError } from '@/domain/errors/DomainError';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit budget head • Admin' };

const service = new AdminBudgetHeadService();

export default async function EditBudgetHeadPage({ params }: { params: { id: string } }) {
  const ctx = await requireRoles([Role.ADMIN]);
  const bh = await service.get(ctx, params.id).catch((e) => { if (e instanceof NotFoundError) return null; throw e; });
  if (!bh) notFound();
  return (
    <>
      <h1>{bh.description}</h1>
      <p className="muted mono">{bh.code}</p>
      <BudgetHeadForm
        mode="edit"
        budgetHeadId={bh.id}
        initial={{ code: bh.code, description: bh.description, isActive: bh.isActive }}
      />
    </>
  );
}
