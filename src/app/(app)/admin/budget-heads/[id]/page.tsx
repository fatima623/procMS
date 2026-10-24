import { notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminBudgetHeadService } from '@/application/admin/AdminBudgetHeadService';
import { prisma } from '@/infrastructure/db/prisma';
import { KpiCard, type Accent } from '@/interfaces/ui/components/KpiCard';
import { BudgetHeadForm } from '../BudgetHeadForm';
import { NotFoundError } from '@/domain/errors/DomainError';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit budget head • Admin' };

const service = new AdminBudgetHeadService();

const H_ICON = {
  tag:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7" cy="7" r="1.5"/></svg>,
  stack:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  check:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg>,
};

export default async function EditBudgetHeadPage({ params }: { params: { id: string } }) {
  const ctx = await requireRoles([Role.ADMIN]);
  const [bh, indentCount, allocationCount] = await Promise.all([
    service.get(ctx, params.id).catch((e) => { if (e instanceof NotFoundError) return null; throw e; }),
    prisma.indent.count({ where: { budgetHeadId: params.id } }),
    prisma.budgetAllocation.count({ where: { budgetHeadId: params.id } }),
  ]);
  if (!bh) notFound();
  const activeAccent: Accent = bh.isActive ? 'emerald' : 'coral';
  return (
    <>
      <h1>{bh.description}</h1>
      <p className="muted mono">{bh.code}</p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KpiCard accent="teal"         icon={H_ICON.tag}   label="Code"       value={bh.code}            sub={bh.description} />
        <KpiCard accent="indigo"       icon={H_ICON.stack} label="Indents"    value={indentCount}        sub={`${allocationCount} allocation${allocationCount === 1 ? '' : 's'} on file`} />
        <KpiCard accent={activeAccent} icon={H_ICON.check} label="State"      value={bh.isActive ? 'Active' : 'Inactive'} sub={bh.isActive ? 'Available on new indents' : 'Hidden from pickers'} />
      </section>

      <BudgetHeadForm
        mode="edit"
        budgetHeadId={bh.id}
        initial={{ code: bh.code, description: bh.description, isActive: bh.isActive }}
      />
    </>
  );
}
