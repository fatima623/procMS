import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminFiscalYearService } from '@/application/admin/AdminFiscalYearService';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Fiscal years • Admin' };

const service = new AdminFiscalYearService();

export default async function FiscalYearsPage() {
  const ctx = await requireRoles([Role.ADMIN]);
  const rows = await service.list(ctx);
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Fiscal years</h1>
        <div className="grow" />
        <Link href="/admin/fiscal-years/new" className="btn btn-primary">+ New fiscal year</Link>
      </div>
      {rows.length === 0 ? (
        <Empty>No fiscal years defined.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr><th>Label</th><th>Starts</th><th>Ends</th><th className="right">Indents</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id}>
                  <td className="mono">{f.label}</td>
                  <td className="mono">{f.startsOn}</td>
                  <td className="mono">{f.endsOn}</td>
                  <td className="right mono">{f.indentCount}</td>
                  <td>{f.isActive ? <StatusPill tone="ok">Active</StatusPill> : <StatusPill tone="default">—</StatusPill>}</td>
                  <td className="right"><Link className="btn" href={`/admin/fiscal-years/${f.id}`}>Edit →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
        Setting a year as <code>Active</code> automatically deactivates whichever year was active before.
      </p>
    </>
  );
}
