import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listDPExtensions } from '@/interfaces/ui/views/ExecutionObligationViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Delivery Period extensions • Procurement' };
export const dynamic = 'force-dynamic';

export default async function DPExtensionsPage() {
  await requireRoles([Role.ADMIN, Role.DP_N, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listDPExtensions();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Delivery Period extensions</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/execution/dp-extensions/new">+ Extend DP</Link>
      </div>
      <p className="muted">DPP&amp;I-35 Chapter XIII — the DP(Navy) may extend the contractual delivery period on cause. Every extension is recorded with the reason, authority, and the new DP date.</p>

      {rows.length === 0 ? (
        <Empty>No DP extensions recorded yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Firm</th>
                <th>Previous DP</th>
                <th>New DP</th>
                <th>Granted</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono"><Link href="/execution/contracts">{r.contractNumber}</Link></td>
                  <td>{r.firmName}</td>
                  <td><DateLabel iso={r.previousDP} /></td>
                  <td><DateLabel iso={r.newDP} /></td>
                  <td><DateLabel iso={r.grantedOn} /></td>
                  <td style={{ maxWidth: 400 }}>{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
