import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminFirmService } from '@/application/admin/AdminFirmService';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { Pager } from '@/interfaces/ui/components/Pager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Firms • Admin' };

const service = new AdminFirmService();

export default async function FirmsPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const ctx = await requireRoles([Role.ADMIN]);
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const result = await service.list(ctx, { search: searchParams.q, page });
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Firms</h1>
        <div className="grow" />
        <form method="get" style={{ display: 'flex', gap: 8 }}>
          <input className="input" name="q" placeholder="Search code / name / NTN" defaultValue={searchParams.q ?? ''} style={{ width: 280 }} />
          <button className="btn">Search</button>
        </form>
        <Link href="/admin/firms/new" className="btn btn-primary">+ New firm</Link>
      </div>
      {result.items.length === 0 ? (
        <Empty>No firms match.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr><th>Code</th><th>Name</th><th>NTN</th><th>City</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {result.items.map((f) => (
                <tr key={f.id}>
                  <td className="mono">{f.code}</td>
                  <td>{f.name}</td>
                  <td className="mono muted">{f.ntn ?? '—'}</td>
                  <td>{f.city ?? <span className="muted">—</span>}</td>
                  <td>
                    {f.isBlacklisted
                      ? <StatusPill tone="danger">Blacklisted</StatusPill>
                      : f.isActive
                        ? <StatusPill tone="ok">Active</StatusPill>
                        : <StatusPill tone="warn">Inactive</StatusPill>}
                  </td>
                  <td className="right"><Link className="btn" href={`/admin/firms/${f.id}`}>Edit →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager pathname="/admin/firms" page={result.page} pageSize={result.pageSize} total={result.total} searchParams={searchParams as Record<string, string | undefined>} />
    </>
  );
}
