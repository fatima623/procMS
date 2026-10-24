import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminBudgetAllocationService } from '@/application/admin/AdminBudgetAllocationService';
import { Empty } from '@/interfaces/ui/components/Empty';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { Pager } from '@/interfaces/ui/components/Pager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Budget allocations • Admin' };

const service = new AdminBudgetAllocationService();

export default async function BudgetAllocationsPage({ searchParams }: { searchParams: { page?: string } }) {
  const ctx = await requireRoles([Role.ADMIN]);
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const result = await service.list(ctx, { page });
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Budget allocations</h1>
        <div className="grow" />
        <Link href="/admin/budget-allocations/new" className="btn btn-primary">+ New allocation</Link>
      </div>
      <p className="muted">Per fiscal year × budget head × (optional) section. Reserved/Spent are driven by indent commitments & PR issuance.</p>
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
