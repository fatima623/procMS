import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminUserService } from '@/application/admin/AdminUserService';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Users • Admin' };

const service = new AdminUserService();

export default async function UsersPage({ searchParams }: { searchParams: { page?: string; q?: string } }) {
  const ctx = await requireRoles([Role.ADMIN]);
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const result = await service.list(ctx, { page, search: searchParams.q });
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
