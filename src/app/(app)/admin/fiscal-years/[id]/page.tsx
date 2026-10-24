import { notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminFiscalYearService } from '@/application/admin/AdminFiscalYearService';
import { FiscalYearForm } from '../FiscalYearForm';
import { NotFoundError } from '@/domain/errors/DomainError';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit fiscal year • Admin' };

const service = new AdminFiscalYearService();

export default async function EditFiscalYearPage({ params }: { params: { id: string } }) {
  const ctx = await requireRoles([Role.ADMIN]);
  const fy = await service.get(ctx, params.id).catch((e) => { if (e instanceof NotFoundError) return null; throw e; });
  if (!fy) notFound();
  return (
    <>
      <h1>{fy.label}</h1>
      <FiscalYearForm
        mode="edit"
        fiscalYearId={fy.id}
        initial={{ label: fy.label, startsOn: fy.startsOn, endsOn: fy.endsOn, isActive: fy.isActive }}
      />
    </>
  );
}
