import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminUserService } from '@/application/admin/AdminUserService';
import { prisma } from '@/infrastructure/db/prisma';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Users • Admin' };

const service = new AdminUserService();

const ICON = {
  users:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3 3-5 7-5s7 2 7 5"/><path d="M17 11a3 3 0 100-6"/><path d="M22 20c0-2.5-2-4-5-4.5"/></svg>,
  check:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg>,
  shield:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>,
  firm:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V8l8-5 8 5v13"/><path d="M9 21V12h6v9"/></svg>,
};

export default async function UsersPage({ searchParams }: { searchParams: { page?: string; q?: string } }) {
  const ctx = await requireRoles([Role.ADMIN]);
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const [result, total, active, admins, firmUsers] = await Promise.all([
    service.list(ctx, { page, search: searchParams.q }),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { roles: { some: { role: Role.ADMIN } } } }),
    prisma.user.count({ where: { firmId: { not: null } } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Users</h1>
        <div className="grow" />
        <form method="get" style={{ display: 'flex', gap: 8 }}>
          <input className="input" name="q" placeholder="Search email or name" defaultValue={searchParams.q ?? ''} style={{ width: 280 }} />
          <button className="btn">Search</button>
        </form>
        <Link href="/admin/users/new" className="btn btn-primary">+ New user</Link>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KpiCard accent="indigo"  icon={ICON.users}  label="Total users" value={total}     sub="On the roster" />
        <KpiCard accent="emerald" icon={ICON.check}  label="Active"      value={active}    sub="Can currently sign in" />
        <KpiCard accent="coral"   icon={ICON.shield} label="Admins"      value={admins}    sub="Hold the ADMIN role" />
        <KpiCard accent="sky"     icon={ICON.firm}   label="Firm users"  value={firmUsers} sub="Linked to a vendor firm" />
      </section>

      {result.items.length === 0 ? (
        <Empty>No users match.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Roles</th>
                <th>Sections</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {result.items.map((u) => (
                <tr key={u.id}>
                  <td className="mono">{u.email}</td>
                  <td>{u.displayName}{u.rank ? <span className="muted"> ({u.rank})</span> : null}</td>
                  <td style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {u.roles.map((r) => <StatusPill key={r} tone="info">{r}</StatusPill>)}
                  </td>
                  <td className="mono muted">{u.sectionIds.length}</td>
                  <td>{u.isActive ? <StatusPill tone="ok">Active</StatusPill> : <StatusPill tone="danger">Inactive</StatusPill>}</td>
                  <td className="right"><Link className="btn" href={`/admin/users/${u.id}`}>Edit →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="row row-end" style={{ marginTop: 12, gap: 8 }}>
          <span className="muted">Page {result.page} / {totalPages} ({result.total} total)</span>
          {page > 1 && <Link className="btn" href={{ pathname: '/admin/users', query: { ...searchParams, page: page - 1 } }}>Previous</Link>}
          {page < totalPages && <Link className="btn" href={{ pathname: '/admin/users', query: { ...searchParams, page: page + 1 } }}>Next</Link>}
        </div>
      )}
    </>
  );
}
