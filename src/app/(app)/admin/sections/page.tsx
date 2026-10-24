import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminSectionService } from '@/application/admin/AdminSectionService';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sections • Admin' };

const service = new AdminSectionService();

const ICON = {
  grid:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  check:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg>,
  users:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3 3-5 7-5s7 2 7 5"/><path d="M17 11a3 3 0 100-6"/><path d="M22 20c0-2.5-2-4-5-4.5"/></svg>,
  tree:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="4" r="2"/><circle cx="6" cy="20" r="2"/><circle cx="18" cy="20" r="2"/><path d="M12 6v6M12 12l-6 6M12 12l6 6"/></svg>,
};

export default async function SectionsPage() {
  const ctx = await requireRoles([Role.ADMIN]);
  const rows = await service.list(ctx);
  const active = rows.filter((s) => s.isActive).length;
  const totalMembers = rows.reduce((n, s) => n + s.memberCount, 0);
  const byKind = rows.reduce<Record<string, number>>((acc, s) => { acc[s.kind] = (acc[s.kind] ?? 0) + 1; return acc; }, {});
  const kindsLine = Object.entries(byKind).map(([k, n]) => `${n} ${k.toLowerCase()}`).join(' · ');

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Sections</h1>
        <div className="grow" />
        <Link href="/admin/sections/new" className="btn btn-primary">+ New section</Link>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KpiCard accent="indigo"  icon={ICON.grid}  label="Total sections" value={rows.length} sub="All units" />
        <KpiCard accent="emerald" icon={ICON.check} label="Active"         value={active}      sub="Currently in use" />
        <KpiCard accent="sky"     icon={ICON.users} label="Total members"  value={totalMembers} sub="Across every section" />
        <KpiCard accent="violet"  icon={ICON.tree}  label="By kind"        value={Object.keys(byKind).length} sub={kindsLine || 'No sections defined'} />
      </section>
      {rows.length === 0 ? (
        <Empty>No sections defined.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Kind</th>
                <th className="right">Members</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="mono">{s.code}</td>
                  <td>{s.name}</td>
                  <td className="muted">{s.kind}</td>
                  <td className="right mono">{s.memberCount}</td>
                  <td>{s.isActive ? <StatusPill tone="ok">Active</StatusPill> : <StatusPill tone="danger">Inactive</StatusPill>}</td>
                  <td className="right"><Link className="btn" href={`/admin/sections/${s.id}`}>Edit →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
