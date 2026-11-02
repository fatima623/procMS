import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listGrievances } from '@/interfaces/ui/views/ComplianceViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { GrievanceActions } from './GrievanceActions';

export const metadata = { title: 'Grievances • Procurement' };
export const dynamic = 'force-dynamic';

export default async function GrievancesPage() {
  await requireRoles([Role.ADMIN, Role.DGDP, Role.SECY_DP, Role.DP_N, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listGrievances();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Grievances</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/compliance/grievances/new">+ File grievance</Link>
      </div>
      <p className="muted">PPRA Rules 48 & 50 — the Grievance Redressal Committee (odd-numbered members) decides within 10 working days. No contract may be awarded while a pre-award complaint is pending.</p>

      {rows.length === 0 ? (
        <Empty>No grievances filed yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Indent</th>
                <th>Complainant firm</th>
                <th>Stage</th>
                <th>Status</th>
                <th>Filed</th>
                <th>GRC decided</th>
                <th>Appealed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/indents/${r.indentId}`}>{r.indentSubject}</Link></td>
                  <td>{r.firmName ?? <span className="muted">anonymous</span>}</td>
                  <td><StatusPill tone={r.stage === 'PRE_AWARD' ? 'warn' : 'info'}>{r.stage.replace('_', ' ')}</StatusPill></td>
                  <td><StatusPill tone={r.status === 'UPHELD' ? 'danger' : r.status === 'REJECTED' || r.status === 'WITHDRAWN' ? 'ok' : r.status === 'APPEALED' ? 'warn' : 'info'}>{r.status}</StatusPill></td>
                  <td><DateLabel iso={r.filedOn} /></td>
                  <td><DateLabel iso={r.grcDecisionOn} /></td>
                  <td><DateLabel iso={r.appealedToPPRAOn} /></td>
                  <td className="right"><GrievanceActions id={r.id} status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
