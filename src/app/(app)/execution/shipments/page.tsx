import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listShipments } from '@/interfaces/ui/views/ExecutionEvidenceViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { MarkReceivedButton } from './MarkReceivedButton';

export const metadata = { title: 'Shipments • Procurement' };
export const dynamic = 'force-dynamic';

export default async function ShipmentsPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF, Role.INSPECTORATE]);
  const rows = await listShipments();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Shipments</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/execution/shipments/new">+ Record shipment</Link>
      </div>
      <p className="muted">DPP&amp;I-35 Chapter XVIII — dispatch of defence stores via approved freight forwarders; the Bill-of-Lading / Airway-Bill number ties the physical goods to the contract.</p>

      {rows.length === 0 ? (
        <Empty>No shipments recorded yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Firm</th>
                <th>Mode</th>
                <th>BL / AWB</th>
                <th>Dispatched</th>
                <th>Received</th>
                <th>Status</th>
                <th>Freight forwarder</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono"><Link href="/execution/contracts">{r.contractNumber}</Link></td>
                  <td>{r.firmName}</td>
                  <td><StatusPill tone="info">{r.mode}</StatusPill></td>
                  <td className="mono">{r.blAwbNumber}</td>
                  <td><DateLabel iso={r.dispatchedOn} /></td>
                  <td><DateLabel iso={r.receivedOn} /></td>
                  <td><StatusPill tone={r.receivedOn ? 'ok' : 'warn'}>{r.receivedOn ? 'RECEIVED' : 'IN TRANSIT'}</StatusPill></td>
                  <td>{r.freightForwarder ?? <span className="muted">—</span>}</td>
                  <td className="right">{!r.receivedOn && <MarkReceivedButton id={r.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
