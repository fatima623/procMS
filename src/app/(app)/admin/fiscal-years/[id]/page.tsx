import { notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminFiscalYearService } from '@/application/admin/AdminFiscalYearService';
import { prisma } from '@/infrastructure/db/prisma';
import { KpiCard, type Accent } from '@/interfaces/ui/components/KpiCard';
import { FiscalYearForm } from '../FiscalYearForm';
import { NotFoundError } from '@/domain/errors/DomainError';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit fiscal year • Admin' };

const service = new AdminFiscalYearService();

const H_ICON = {
  cal:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg>,
  stack:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  pin:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L8 10v9l4 3 4-3v-9z"/></svg>,
};

export default async function EditFiscalYearPage({ params }: { params: { id: string } }) {
  const ctx = await requireRoles([Role.ADMIN]);
  const [fy, indentCount] = await Promise.all([
    service.get(ctx, params.id).catch((e) => { if (e instanceof NotFoundError) return null; throw e; }),
    prisma.indent.count({ where: { fiscalYearId: params.id } }),
  ]);
  if (!fy) notFound();
  const activeAccent: Accent = fy.isActive ? 'emerald' : 'violet';
  return (
    <>
      <h1>{fy.label}</h1>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KpiCard accent="violet"       icon={H_ICON.cal}   label="Window"  value={fy.label}       sub={`${fy.startsOn} → ${fy.endsOn}`} />
        <KpiCard accent="indigo"       icon={H_ICON.stack} label="Indents" value={indentCount}    sub="Created in this year" />
        <KpiCard accent={activeAccent} icon={H_ICON.pin}   label="State"   value={fy.isActive ? 'Active' : 'Historical'} sub={fy.isActive ? 'Current reporting year' : 'Reference-only'} />
      </section>

      <FiscalYearForm
        mode="edit"
        fiscalYearId={fy.id}
        initial={{ label: fy.label, startsOn: fy.startsOn, endsOn: fy.endsOn, isActive: fy.isActive }}
      />
    </>
  );
}
