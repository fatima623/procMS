import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listFMSCases } from '@/interfaces/ui/views/SpecialCaseViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { FMSActions } from './FMSActions';

export const metadata = { title: 'FMS cases • Procurement' };
export const dynamic = 'force-dynamic';

export default async function FMSPage() {
  await requireRoles([Role.ADMIN, Role.DP_N, Role.DGDP, Role.SECY_DP]);
  const rows = await listFMSCases();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Foreign Military Sales (FMS)</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/special/fms/new">+ Open FMS case</Link>
      </div>
      <p className="muted">DPP&amp;I-35 Chapter XXIV — government-to-government procurement. The LOR → LOA → acceptance → implementation chain replaces IT dispatch and commercial offers.</p>

      {rows.length === 0 ? (
        <Empty>No FMS cases on record.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Case #</th>
                <th>Indent</th>
                <th>Authority</th>
                <th>Status</th>
                <th>LOR</th>
                <th>LOA received</th>
                <th>Accepted</th>
                <th className="right">LOA value</th>
                <th>Delivery</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.caseNumber}</td>
                  <td><Link href={`/indents/${r.indentId}`}>{r.indentSubject}</Link></td>
                  <td>{r.foreignAuthority}</td>
                  <td><StatusPill tone={r.status === 'CLOSED' ? 'ok' : r.status === 'CANCELLED' ? 'danger' : 'info'}>{r.status.replace(/_/g, ' ')}</StatusPill></td>
                  <td><DateLabel iso={r.lorSubmittedOn} /></td>
                  <td><DateLabel iso={r.loaReceivedOn} /></td>
                  <td><DateLabel iso={r.loaAcceptedOn} /></td>
                  <td className="right">
                    {r.loaValueMinor
                      ? <MoneyLabel amountMinor={r.loaValueMinor} currency={r.currency} />
                      : <span className="muted">—</span>}
                  </td>
                  <td><DateLabel iso={r.deliveryCompletedOn ?? r.deliveryExpectedBy} /></td>
                  <td className="right"><FMSActions id={r.id} status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
