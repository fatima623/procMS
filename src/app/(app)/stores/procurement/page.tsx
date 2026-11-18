import Link from 'next/link';
import { InternalProcurementStatus } from '@prisma/client';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { internalProcurementService } from '@/infrastructure/stores/InternalProcurementService';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { Empty } from '@/interfaces/ui/components/Empty';
import { MoneyLabel } from '@/interfaces/ui/components/Money';

export const metadata = { title: 'Internal Procurement • Stores' };
export const dynamic = 'force-dynamic';

function toneForStatus(status: InternalProcurementStatus) {
  if (status === 'ORDERED' || status === 'CLOSED') return 'ok' as const;
  if (status === 'CANCELLED') return 'danger' as const;
  if (status === 'QUOTED') return 'info' as const;
  return 'warn' as const;
}

export default async function StoresProcurementPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireSessionCtx();
  const params = await searchParams;
  const statusFilter = params.status && Object.values(InternalProcurementStatus).includes(params.status as InternalProcurementStatus)
    ? (params.status as InternalProcurementStatus)
    : undefined;

  const procurements = await internalProcurementService.list(statusFilter ? { status: statusFilter } : undefined);

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Internal Procurement</h1>
          <p className="muted" style={{ margin: '4px 0 0 0' }}>
            Small discretionary purchases &amp; supply orders (ProcMS v4.4.1 manual pp. 221–229).
          </p>
        </div>
        <div className="grow" />
        <Link className="btn btn-primary" href="/stores/procurement/new">
          + New Procurement
        </Link>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <Link
          href="/stores/procurement"
          className={`btn ${!statusFilter ? 'btn-primary' : ''}`}
          style={{ fontSize: 13, padding: '4px 10px' }}
        >
          All
        </Link>
        {Object.values(InternalProcurementStatus).map((s) => (
          <Link
            key={s}
            href={`/stores/procurement?status=${s}`}
            className={`btn ${statusFilter === s ? 'btn-primary' : ''}`}
            style={{ fontSize: 13, padding: '4px 10px' }}
          >
            {s}
          </Link>
        ))}
      </div>

      {procurements.length === 0 ? (
        <Empty>No internal procurements found.</Empty>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Raised By</th>
              <th>Raised On</th>
              <th className="right">Items</th>
              <th className="right">Firms</th>
              <th>Status</th>
              <th>Supply Order</th>
              <th className="right">Action</th>
            </tr>
          </thead>
          <tbody>
            {procurements.map((p) => (
              <tr key={p.id}>
                <td className="mono font-semibold">
                  <Link href={`/stores/procurement/${p.id}`}>{p.reference}</Link>
                </td>
                <td>{p.raisedBy.displayName}</td>
                <td><DateLabel iso={p.raisedOn} /></td>
                <td className="right mono">{p._count.items}</td>
                <td className="right mono">{p._count.invitedFirms}</td>
                <td>
                  <StatusPill tone={toneForStatus(p.status)}>{p.status}</StatusPill>
                </td>
                <td>
                  {p.supplyOrder ? (
                    <span>
                      {p.supplyOrder.firm.name} (
                      <MoneyLabel amountMinor={p.supplyOrder.totalValueMinor} currency={p.supplyOrder.currency} />)
                    </span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td className="right">
                  <Link className="btn" href={`/stores/procurement/${p.id}`}>
                    Manage →
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
