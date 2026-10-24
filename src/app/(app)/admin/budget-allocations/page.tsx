import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminBudgetAllocationService } from '@/application/admin/AdminBudgetAllocationService';
import { prisma } from '@/infrastructure/db/prisma';
import { decimalToMinor } from '@/infrastructure/common/decimal';
import { Empty } from '@/interfaces/ui/components/Empty';
import { MoneyLabel, MoneyCompact } from '@/interfaces/ui/components/Money';
import { Pager } from '@/interfaces/ui/components/Pager';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Budget allocations • Admin' };

const service = new AdminBudgetAllocationService();

const ICON = {
  wallet: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h3"/><path d="M3 10h18"/></svg>,
  lock:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 118 0v4"/></svg>,
  flame:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 20a6 6 0 0012 0c0-4-3-5-3-8 0-3-2-5-4-6 1 3-1 5-3 7-2 2-2 5 0 7-2 0-2-2-2-4"/></svg>,
  grid:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
};

export default async function BudgetAllocationsPage({ searchParams }: { searchParams: { page?: string } }) {
  const ctx = await requireRoles([Role.ADMIN]);
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const [result, agg, totalRows] = await Promise.all([
    service.list(ctx, { page }),
    prisma.budgetAllocation.aggregate({ _sum: { allocated: true, reserved: true, spent: true } }),
    prisma.budgetAllocation.count(),
  ]);
  const toMinor = (v: unknown) => v == null ? '0' : decimalToMinor(v as unknown as string).toString();
  const allocated = toMinor(agg._sum.allocated);
  const reserved  = toMinor(agg._sum.reserved);
  const spent     = toMinor(agg._sum.spent);
  const pct = (num: string, den: string) => {
    const d = BigInt(den); if (d === 0n) return 0;
    return Math.round(Number((BigInt(num) * 100n) / d));
  };

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Budget allocations</h1>
        <div className="grow" />
        <Link href="/admin/budget-allocations/new" className="btn btn-primary">+ New allocation</Link>
      </div>
      <p className="muted">Per fiscal year × budget head × (optional) section. Reserved/Spent are driven by indent commitments & PR issuance.</p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KpiCard accent="indigo"  icon={ICON.grid}   label="Allocations"       value={totalRows} sub="Rows on file" />
        <KpiCard accent="emerald" icon={ICON.wallet} label="Allocated"         value={<MoneyCompact amountMinor={allocated} currency="PKR" precision={2} />} sub="Total budget set aside" />
        <KpiCard accent="amber"   icon={ICON.lock}   label="Reserved"          value={<MoneyCompact amountMinor={reserved} currency="PKR" precision={2} />} sub={`${pct(reserved, allocated)}% of allocated`} />
        <KpiCard accent="coral"   icon={ICON.flame}  label="Spent"             value={<MoneyCompact amountMinor={spent} currency="PKR" precision={2} />} sub={`${pct(spent, allocated)}% of allocated`} />
      </section>
      {result.items.length === 0 ? (
        <Empty>No allocations yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Fiscal year</th>
                <th>Head</th>
                <th>Section</th>
                <th className="right">Allocated</th>
                <th className="right">Reserved</th>
                <th className="right">Spent</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {result.items.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{a.fiscalYearLabel}</td>
                  <td className="mono">{a.budgetHeadCode}</td>
                  <td className="mono">{a.sectionCode ?? <span className="muted">—</span>}</td>
                  <td className="right"><MoneyLabel amountMinor={a.allocatedMinor} currency={a.currency} /></td>
                  <td className="right muted"><MoneyLabel amountMinor={a.reservedMinor} currency={a.currency} /></td>
                  <td className="right muted"><MoneyLabel amountMinor={a.spentMinor} currency={a.currency} /></td>
                  <td className="right"><Link className="btn" href={`/admin/budget-allocations/${a.id}`}>Edit →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager pathname="/admin/budget-allocations" page={result.page} pageSize={result.pageSize} total={result.total} searchParams={searchParams as Record<string, string | undefined>} />
    </>
  );
}
