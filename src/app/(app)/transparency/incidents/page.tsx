import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listIncidents } from '@/interfaces/ui/views/TransparencyViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { IncidentActions } from './IncidentActions';

export const metadata = { title: 'Mis-procurement incidents • Procurement' };
export const dynamic = 'force-dynamic';

export default async function IncidentsPage() {
  await requireRoles([Role.ADMIN, Role.DGDP, Role.SECY_DP, Role.DP_N, Role.COORD_STAFF]);
  const rows = await listIncidents();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Mis-procurement incidents</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/transparency/incidents/new">+ Log incident</Link>
      </div>
      <p className="muted">PPRA Rule 50 — any unauthorised breach of the Rules is mis-procurement. Log incidents here, remediate where possible, and report to PPRA when the breach is confirmed.</p>

      {rows.length === 0 ? (
        <Empty>No mis-procurement incidents on record.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Summary</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Detected</th>
                <th>Remediated</th>
                <th>Reported to PPRA</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.ruleReference}</td>
                  <td style={{ maxWidth: 360 }}>{r.summary}</td>
                  <td><StatusPill tone={r.severity === 'CRITICAL' ? 'danger' : r.severity === 'HIGH' ? 'warn' : 'info'}>{r.severity}</StatusPill></td>
                  <td><StatusPill tone={r.status === 'REMEDIATED' ? 'ok' : r.status === 'REPORTED_TO_PPRA' ? 'warn' : 'danger'}>{r.status.replace(/_/g, ' ')}</StatusPill></td>
                  <td><DateLabel iso={r.detectedOn} /></td>
                  <td><DateLabel iso={r.remediatedOn} /></td>
                  <td><DateLabel iso={r.reportedToPPRAOn} /></td>
                  <td className="right"><IncidentActions id={r.id} status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
