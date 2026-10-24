import { notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminBudgetAllocationService } from '@/application/admin/AdminBudgetAllocationService';
import { AllocationForm } from '../AllocationForm';
import { NotFoundError } from '@/domain/errors/DomainError';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit allocation • Admin' };

const service = new AdminBudgetAllocationService();

export default async function EditAllocationPage({ params }: { params: { id: string } }) {
  const ctx = await requireRoles([Role.ADMIN]);
  const row = await service.get(ctx, params.id).catch((e) => { if (e instanceof NotFoundError) return null; throw e; });
  if (!row) notFound();
  const toDecimal = (minor: string): string => {
    const n = BigInt(minor);
    const abs = n < 0n ? -n : n;
    return `${abs / 10_000n}.${(abs % 10_000n).toString().padStart(4, '0')}`;
  };
  return (
    <>
      <h1>Edit allocation</h1>
      <p className="muted mono">{row.fiscalYearLabel} • {row.budgetHeadCode}{row.sectionCode ? ` • ${row.sectionCode}` : ''}</p>
      <AllocationForm
        mode="edit"
        allocationId={row.id}
        initial={{ allocated: toDecimal(row.allocatedMinor), currency: row.currency }}
      />
    </>
  );
}
