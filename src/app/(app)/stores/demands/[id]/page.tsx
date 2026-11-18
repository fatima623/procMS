import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { internalDemandService } from '@/infrastructure/stores/InternalDemandService';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { DemandDetailActions, DeleteDemandItemButton } from './DemandDetailActions';

export const metadata = { title: 'Demand Details • Stores' };
export const dynamic = 'force-dynamic';

function toneForStatus(status: string) {
  if (status === 'ISSUED') return 'ok' as const;
  if (status === 'CLOSED') return 'default' as const;
  return 'warn' as const;
}

export default async function DemandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSessionCtx();
  const { id } = await params;

  let demand;
  try {
    demand = await internalDemandService.get(id);
  } catch {
    notFound();
  }

  const isClosed = demand.status === 'CLOSED';

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <h1 style={{ margin: 0 }}>{demand.demandNumber}</h1>
            <StatusPill tone={toneForStatus(demand.status)}>{demand.status}</StatusPill>
          </div>
          <p className="muted" style={{ margin: '4px 0 0 0' }}>
            Raised on <DateLabel iso={demand.raisedOn} /> by {demand.raisedBy.displayName}
          </p>
        </div>
        <div className="grow" />
        <Link className="btn" href="/stores/demands">
          ← Back to demands
        </Link>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 24px', margin: 0 }}>
          <dt className="muted">Demand Number</dt>
          <dd className="mono font-semibold">{demand.demandNumber}</dd>

          <dt className="muted">Target Section</dt>
          <dd>{demand.raisedForSection.name} ({demand.raisedForSection.code})</dd>

          <dt className="muted">Raised By</dt>
          <dd>{demand.raisedBy.displayName}</dd>

          <dt className="muted">Date Raised</dt>
          <dd><DateLabel iso={demand.raisedOn} /></dd>

          <dt className="muted">Current Status</dt>
          <dd><StatusPill tone={toneForStatus(demand.status)}>{demand.status}</StatusPill></dd>

          <dt className="muted">Notes / Justification</dt>
          <dd>{demand.notes || <span className="muted">No notes provided.</span>}</dd>
        </dl>

        <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <DemandDetailActions demandId={demand.id} status={demand.status} />
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div className="row" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Requested Items ({demand.items.length})</h2>
        </div>

        {demand.items.length === 0 ? (
          <p className="muted">No items in this demand.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item Name</th>
                <th className="right">Quantity</th>
                <th>UOM</th>
                <th>Remarks</th>
                {!isClosed && <th className="right">Action</th>}
              </tr>
            </thead>
            <tbody>
              {demand.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="mono muted">{index + 1}</td>
                  <td className="font-semibold">{item.itemName}</td>
                  <td className="right mono">{item.quantity.toString()}</td>
                  <td>{item.uom}</td>
                  <td className="muted">{item.remarks || '—'}</td>
                  {!isClosed && (
                    <td className="right">
                      <DeleteDemandItemButton
                        demandId={demand.id}
                        itemId={item.id}
                        disabled={isClosed}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
