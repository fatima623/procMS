import Link from 'next/link';
import { InventoryLedgerKind } from '@prisma/client';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { inventoryLedgerService } from '@/infrastructure/stores/InventoryLedgerService';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Inventory Ledger • Stores' };
export const dynamic = 'force-dynamic';

export default async function StoresLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  await requireSessionCtx();
  const params = await searchParams;
  const kindFilter = params.kind && Object.values(InventoryLedgerKind).includes(params.kind as InventoryLedgerKind)
    ? (params.kind as InventoryLedgerKind)
    : undefined;

  const entries = await inventoryLedgerService.list(kindFilter ? { kind: kindFilter } : undefined);

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Inventory Ledger</h1>
          <p className="muted" style={{ margin: '4px 0 0 0' }}>
            Issuance against demand &amp; receiving against tender (ProcMS v4.4.1 manual pp. 230–231).
          </p>
        </div>
        <div className="grow" />
        <Link className="btn btn-primary" href="/stores/ledger/new">
          + Record Ledger Entry
        </Link>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <Link
          href="/stores/ledger"
          className={`btn ${!kindFilter ? 'btn-primary' : ''}`}
          style={{ fontSize: 13, padding: '4px 10px' }}
        >
          All
        </Link>
        <Link
          href="/stores/ledger?kind=ISSUANCE"
          className={`btn ${kindFilter === 'ISSUANCE' ? 'btn-primary' : ''}`}
          style={{ fontSize: 13, padding: '4px 10px' }}
        >
          Issuance (Out)
        </Link>
        <Link
          href="/stores/ledger?kind=RECEIVING"
          className={`btn ${kindFilter === 'RECEIVING' ? 'btn-primary' : ''}`}
          style={{ fontSize: 13, padding: '4px 10px' }}
        >
          Receiving (In)
        </Link>
      </div>

      {entries.length === 0 ? (
        <Empty>No ledger entries recorded yet.</Empty>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Item Name</th>
              <th className="right">Quantity</th>
              <th>UOM</th>
              <th>Source / Ref</th>
              <th>Entered By</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td><DateLabel iso={e.happenedOn} /></td>
                <td>
                  <StatusPill tone={e.kind === 'RECEIVING' ? 'ok' : 'info'}>
                    {e.kind}
                  </StatusPill>
                </td>
                <td className="font-semibold">{e.itemName}</td>
                <td className="right mono">{String(e.quantity)}</td>
                <td>{e.uom}</td>
                <td className="mono muted">
                  {e.sourceDemandId ? `Demand: ${e.sourceDemandId}` : e.sourceITPerformaId ? `IT: ${e.sourceITPerformaId}` : 'Manual'}
                </td>
                <td>{e.enteredBy.displayName}</td>
                <td className="muted">{e.remarks || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
