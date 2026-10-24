import { notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminBudgetAllocationService } from '@/application/admin/AdminBudgetAllocationService';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';
import { MoneyCompact } from '@/interfaces/ui/components/Money';
import { AllocationForm } from '../AllocationForm';
import { NotFoundError } from '@/domain/errors/DomainError';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit allocation • Admin' };

const service = new AdminBudgetAllocationService();

const H_ICON = {
  wallet: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h3"/><path d="M3 10h18"/></svg>,
  lock:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 118 0v4"/></svg>,
  flame:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 20a6 6 0 0012 0c0-4-3-5-3-8 0-3-2-5-4-6 1 3-1 5-3 7-2 2-2 5 0 7-2 0-2-2-2-4"/></svg>,
};

export default async function EditAllocationPage({ params }: { params: { id: string } }) {
  const ctx = await requireRoles([Role.ADMIN]);
  const row = await service.get(ctx, params.id).catch((e) => { if (e instanceof NotFoundError) return null; throw e; });
  if (!row) notFound();
  const toDecimal = (minor: string): string => {
    const n = BigInt(minor);
    const abs = n < 0n ? -n : n;
    return `${abs / 10_000n}.${(abs % 10_000n).toString().padStart(4, '0')}`;
  };
  const pct = (num: string, den: string) => {
    const d = BigInt(den); if (d === 0n) return 0;
    return Math.round(Number((BigInt(num) * 100n) / d));
  };
  const reservedPct = pct(row.reservedMinor, row.allocatedMinor);
  const spentPct    = pct(row.spentMinor,    row.allocatedMinor);
  return (
    <>
      <h1>Edit allocation</h1>
      <p className="muted mono">{row.fiscalYearLabel} • {row.budgetHeadCode}{row.sectionCode ? ` • ${row.sectionCode}` : ''}</p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KpiCard accent="emerald" icon={H_ICON.wallet} label="Allocated" value={<MoneyCompact amountMinor={row.allocatedMinor} currency={row.currency} precision={2} />} sub="Total budget set aside" />
        <KpiCard accent="amber"   icon={H_ICON.lock}   label="Reserved"  value={<MoneyCompact amountMinor={row.reservedMinor} currency={row.currency} precision={2} />} sub={`${reservedPct}% of allocated`} />
        <KpiCard accent="coral"   icon={H_ICON.flame}  label="Spent"     value={<MoneyCompact amountMinor={row.spentMinor} currency={row.currency} precision={2} />} sub={`${spentPct}% of allocated`} />
      </section>

      <AllocationForm
        mode="edit"
        allocationId={row.id}
        initial={{ allocated: toDecimal(row.allocatedMinor), currency: row.currency }}
      />
    </>
  );
}
