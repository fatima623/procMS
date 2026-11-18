import Link from 'next/link';
import { VehicleRequisitionStatus } from '@prisma/client';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { vehicleRequisitionService } from '@/infrastructure/transport/VehicleRequisitionService';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { Empty } from '@/interfaces/ui/components/Empty';
import { RequisitionActions } from './RequisitionActions';

export const metadata = { title: 'Vehicle Requisitions • Admin' };
export const dynamic = 'force-dynamic';

function toneForStatus(status: VehicleRequisitionStatus) {
  if (status === 'APPROVED' || status === 'COMPLETED') return 'ok' as const;
  if (status === 'REJECTED') return 'danger' as const;
  return 'warn' as const;
}

export default async function VehicleRequisitionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireSessionCtx();
  const params = await searchParams;
  const statusFilter = params.status && Object.values(VehicleRequisitionStatus).includes(params.status as VehicleRequisitionStatus)
    ? (params.status as VehicleRequisitionStatus)
    : undefined;

  const requisitions = await vehicleRequisitionService.list(statusFilter ? { status: statusFilter } : undefined);

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Vehicle Requisitions</h1>
          <p className="muted" style={{ margin: '4px 0 0 0' }}>
            Transport requests &amp; pool allotment (ProcMS v4.4.1 manual pp. 232–235).
          </p>
        </div>
        <div className="grow" />
        <Link className="btn btn-primary" href="/admin/transport/requisitions/new">
          + Raise Requisition
        </Link>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <Link
          href="/admin/transport/requisitions"
          className={`btn ${!statusFilter ? 'btn-primary' : ''}`}
          style={{ fontSize: 13, padding: '4px 10px' }}
        >
          All
        </Link>
        {Object.values(VehicleRequisitionStatus).map((s) => (
          <Link
            key={s}
            href={`/admin/transport/requisitions?status=${s}`}
            className={`btn ${statusFilter === s ? 'btn-primary' : ''}`}
            style={{ fontSize: 13, padding: '4px 10px' }}
          >
            {s}
          </Link>
        ))}
      </div>

      {requisitions.length === 0 ? (
        <Empty>No vehicle requisitions found.</Empty>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Req #</th>
              <th>Raised By</th>
              <th>Route</th>
              <th>Date / Time</th>
              <th className="right">Passengers</th>
              <th>Purpose</th>
              <th>Vehicle</th>
              <th>Status</th>
              <th className="right">Action</th>
            </tr>
          </thead>
          <tbody>
            {requisitions.map((r) => (
              <tr key={r.id}>
                <td className="mono font-semibold">{r.requisitionNumber}</td>
                <td>{r.raisedBy.displayName}</td>
                <td>{r.fromLocation} → {r.toLocation}</td>
                <td>
                  <DateLabel iso={r.requiredFrom} />
                </td>
                <td className="right mono">{r.passengerCount}</td>
                <td>{r.purpose}</td>
                <td className="mono">{r.assignedVehicleRef || <span className="muted">—</span>}</td>
                <td>
                  <StatusPill tone={toneForStatus(r.status)}>{r.status}</StatusPill>
                </td>
                <td className="right">
                  <RequisitionActions requisitionId={r.id} status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
