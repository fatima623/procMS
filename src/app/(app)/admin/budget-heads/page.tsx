import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminBudgetHeadService } from '@/application/admin/AdminBudgetHeadService';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Budget heads • Admin' };

const service = new AdminBudgetHeadService();

const ICON = {
  tag:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7" cy="7" r="1.5"/></svg>,
  check:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg>,
  stack:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  flame:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 20a6 6 0 0012 0c0-4-3-5-3-8 0-3-2-5-4-6 1 3-1 5-3 7-2 2-2 5 0 7-2 0-2-2-2-4"/></svg>,
};

export default async function BudgetHeadsPage() {
  const ctx = await requireRoles([Role.ADMIN]);
  const rows = await service.list(ctx);
  const active = rows.filter((b) => b.isActive).length;
  const totalIndents = rows.reduce((n, b) => n + b.indentCount, 0);
  const hotHead = rows.reduce<{ code: string; n: number }>((best, b) => b.indentCount > best.n ? { code: b.code, n: b.indentCount } : best, { code: '—', n: 0 });

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Budget heads</h1>
        <div className="grow" />
        <Link href="/admin/budget-heads/new" className="btn btn-primary">+ New budget head</Link>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KpiCard accent="teal"    icon={ICON.tag}   label="Budget heads"  value={rows.length}  sub="Defined codes" />
        <KpiCard accent="emerald" icon={ICON.check} label="Active"        value={active}       sub="In use for new indents" />
        <KpiCard accent="indigo"  icon={ICON.stack} label="Indents (all)" value={totalIndents} sub="Lifetime count across heads" />
        <KpiCard accent="amber"   icon={ICON.flame} label="Hot head"      value={hotHead.code} sub={`${hotHead.n} indent${hotHead.n === 1 ? '' : 's'}`} />
      </section>
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
