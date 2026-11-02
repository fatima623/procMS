import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listInspections, listDiscrepancies } from '@/interfaces/ui/views/ExecutionObligationViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { ResolveDiscrepancyButton } from './ResolveDiscrepancyButton';
import { RaiseDiscrepancyButton } from './RaiseDiscrepancyButton';

export const metadata = { title: 'Inspections • Procurement' };
export const dynamic = 'force-dynamic';

export default async function InspectionsPage() {
  await requireRoles([Role.ADMIN, Role.INSPECTORATE, Role.ADP_STAFF, Role.COORD_STAFF]);
  const [inspections, discrepancies] = await Promise.all([listInspections(), listDiscrepancies()]);
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Inspection reports</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/execution/inspections/new">+ Record inspection</Link>
      </div>
      <p className="muted">DPP&amp;I-35 Chapter XVI — the Inspectorate certifies that delivered stores meet the contract specification. Any discrepancy must be resolved before the Taking-Over Certificate is issued.</p>

      <h3 style={{ marginTop: 24 }}>Inspections</h3>
      {inspections.length === 0 ? (
        <Empty>No inspections recorded yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Firm</th>
                <th>Performed</th>
                <th>Verdict</th>
                <th className="right">Discrepancies (open / total)</th>
                <th>Summary</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {inspections.map((r) => (
                <tr key={r.id}>
                  <td className="mono"><Link href="/execution/contracts">{r.contractNumber}</Link></td>
                  <td>{r.firmName}</td>
                  <td><DateLabel iso={r.performedOn} /></td>
                  <td><StatusPill tone={r.verdict === 'ACCEPTED' ? 'ok' : r.verdict === 'REJECTED' ? 'danger' : 'warn'}>{r.verdict}</StatusPill></td>
                  <td className="right mono">{r.openDiscrepancies} / {r.totalDiscrepancies}</td>
                  <td style={{ maxWidth: 320 }}>{r.summary}</td>
                  <td className="right">
                    {r.verdict !== 'ACCEPTED' && <RaiseDiscrepancyButton inspectionId={r.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ marginTop: 32 }}>Discrepancies</h3>
      {discrepancies.length === 0 ? (
        <Empty>No discrepancies raised yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Raised</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Resolved</th>
                <th>Description</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {discrepancies.map((d) => (
                <tr key={d.id}>
                  <td className="mono">{d.contractNumber}</td>
                  <td><DateLabel iso={d.raisedOn} /></td>
                  <td><StatusPill tone={d.severity === 'CRITICAL' ? 'danger' : d.severity === 'MAJOR' ? 'warn' : 'info'}>{d.severity}</StatusPill></td>
                  <td><StatusPill tone={d.status === 'RESOLVED' || d.status === 'WAIVED' ? 'ok' : 'warn'}>{d.status}</StatusPill></td>
                  <td><DateLabel iso={d.resolvedOn} /></td>
                  <td style={{ maxWidth: 360 }}>{d.description}</td>
                  <td className="right">{d.status === 'OPEN' && <ResolveDiscrepancyButton id={d.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
