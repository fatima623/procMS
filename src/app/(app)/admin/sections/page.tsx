import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminSectionService } from '@/application/admin/AdminSectionService';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sections • Admin' };

const service = new AdminSectionService();

export default async function SectionsPage() {
  const ctx = await requireRoles([Role.ADMIN]);
  const rows = await service.list(ctx);
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Sections</h1>
        <div className="grow" />
        <Link href="/admin/sections/new" className="btn btn-primary">+ New section</Link>
      </div>
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
