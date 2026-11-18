import Link from 'next/link';
import { InternalDemandStatus } from '@prisma/client';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { internalDemandService } from '@/infrastructure/stores/InternalDemandService';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Stores Demands • Procurement' };
export const dynamic = 'force-dynamic';

function toneForStatus(status: InternalDemandStatus) {
  if (status === 'ISSUED') return 'ok' as const;
  if (status === 'CLOSED') return 'default' as const;
  return 'warn' as const;
}

export default async function StoresDemandsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireSessionCtx();
  const params = await searchParams;
  const statusFilter = params.status && Object.values(InternalDemandStatus).includes(params.status as InternalDemandStatus)
    ? (params.status as InternalDemandStatus)
    : undefined;

  const demands = await internalDemandService.list(statusFilter ? { status: statusFilter } : undefined);

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Internal Item Demands</h1>
          <p className="muted" style={{ margin: '4px 0 0 0' }}>
            Upstream store item requests from sections (ProcMS v4.4.1 manual pp. 217–220).
          </p>
        </div>
        <div className="grow" />
        <Link className="btn btn-primary" href="/stores/demands/new">
          + Raise Demand
        </Link>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <Link
          href="/stores/demands"
          className={`btn ${!statusFilter ? 'btn-primary' : ''}`}
          style={{ fontSize: 13, padding: '4px 10px' }}
        >
          All
        </Link>
        {Object.values(InternalDemandStatus).map((s) => (
          <Link
            key={s}
            href={`/stores/demands?status=${s}`}
            className={`btn ${statusFilter === s ? 'btn-primary' : ''}`}
            style={{ fontSize: 13, padding: '4px 10px' }}
          >
            {s}
          </Link>
        ))}
      </div>

      {demands.length === 0 ? (
        <Empty>No internal demands found.</Empty>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Demand #</th>
              <th>Section</th>
              <th>Raised By</th>
              <th>Raised On</th>
              <th className="right">Items</th>
              <th>Status</th>
              <th className="right">Action</th>
            </tr>
          </thead>
          <tbody>
            {demands.map((d) => (
              <tr key={d.id}>
                <td className="mono font-semibold">
                  <Link href={`/stores/demands/${d.id}`}>{d.demandNumber}</Link>
                </td>
                <td>{d.raisedForSection.name} ({d.raisedForSection.code})</td>
                <td>{d.raisedBy.displayName}</td>
                <td><DateLabel iso={d.raisedOn} /></td>
                <td className="right mono">{d._count.items}</td>
                <td>
                  <StatusPill tone={toneForStatus(d.status)}>{d.status}</StatusPill>
                </td>
                <td className="right">
                  <Link className="btn" href={`/stores/demands/${d.id}`}>
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
