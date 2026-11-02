import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listAppeals } from '@/interfaces/ui/views/SpecialCaseViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { AppealActions } from './AppealActions';

export const metadata = { title: 'Appeals • Procurement' };
export const dynamic = 'force-dynamic';

export default async function AppealsPage() {
  await requireRoles([Role.ADMIN, Role.DGDP, Role.SECY_DP, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listAppeals();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Appeals</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/special/appeals/new">+ File appeal</Link>
      </div>
      <p className="muted">PPRA Rule 50 and DPP&amp;I-35 Chapter XXVIII — a bidder dissatisfied with the GRC's decision may appeal to the Authority. Filing an appeal returns the parent grievance to APPEALED (which blocks any award on that indent).</p>

      {rows.length === 0 ? (
        <Empty>No appeals filed yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Grievance</th>
                <th>Filed</th>
                <th>Status</th>
                <th>Decided</th>
                <th>Basis</th>
                <th>Decision text</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.grievanceId}</td>
                  <td><DateLabel iso={r.filedOn} /></td>
                  <td><StatusPill tone={r.status === 'UPHELD' ? 'danger' : r.status === 'REJECTED' || r.status === 'WITHDRAWN' ? 'ok' : 'warn'}>{r.status}</StatusPill></td>
                  <td><DateLabel iso={r.decidedOn} /></td>
                  <td style={{ maxWidth: 320 }}>{r.basis}</td>
                  <td style={{ maxWidth: 320 }}>{r.decisionText ?? <span className="muted">—</span>}</td>
                  <td className="right"><AppealActions id={r.id} status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
