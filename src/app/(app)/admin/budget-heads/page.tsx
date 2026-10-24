import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminBudgetHeadService } from '@/application/admin/AdminBudgetHeadService';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Budget heads • Admin' };

const service = new AdminBudgetHeadService();

export default async function BudgetHeadsPage() {
  const ctx = await requireRoles([Role.ADMIN]);
  const rows = await service.list(ctx);
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Budget heads</h1>
        <div className="grow" />
        <Link href="/admin/budget-heads/new" className="btn btn-primary">+ New budget head</Link>
      </div>
      {rows.length === 0 ? (
        <Empty>No budget heads defined.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr><th>Code</th><th>Description</th><th className="right">Indents</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td className="mono">{b.code}</td>
                  <td>{b.description}</td>
                  <td className="right mono">{b.indentCount}</td>
                  <td>{b.isActive ? <StatusPill tone="ok">Active</StatusPill> : <StatusPill tone="warn">Inactive</StatusPill>}</td>
                  <td className="right"><Link className="btn" href={`/admin/budget-heads/${b.id}`}>Edit →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
