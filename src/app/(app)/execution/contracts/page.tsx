import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listContracts } from '@/interfaces/ui/views/WorkflowListViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { IssueTakingOverButton } from './IssueTakingOverButton';

export const metadata = { title: 'Contracts • Procurement' };
export const dynamic = 'force-dynamic';

export default async function ContractsPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listContracts();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Contracts</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/execution/contracts/new">+ Award contract</Link>
      </div>
      <p className="muted">DPP&amp;I-35 Chapter XII — signed award of the Purchase Requisition. One contract per indent.</p>

      {rows.length === 0 ? (
        <Empty>No contracts recorded yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Indent</th>
                <th>Firm</th>
                <th>Status</th>
                <th className="right">Value</th>
                <th>Awarded</th>
                <th>Signed</th>
                <th>Taking-over</th>
                <th>Closed</th>
                <th className="right">BGs / Inv / Pay / LC</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.contractNumber}</td>
                  <td><Link href={`/indents/${r.indentId}`}>{r.indentSubject}</Link></td>
                  <td>{r.firmName}</td>
                  <td><StatusPill tone={r.status === 'COMPLETED' || r.status === 'CLOSED' ? 'ok' : r.status === 'TERMINATED' ? 'danger' : 'info'}>{r.status}</StatusPill></td>
                  <td className="right"><MoneyLabel amountMinor={r.valueMinor} currency={r.currency} /></td>
                  <td><DateLabel iso={r.awardedOn} /></td>
                  <td><DateLabel iso={r.signedOn} /></td>
                  <td><DateLabel iso={r.takingOverCertifiedOn} /></td>
                  <td><DateLabel iso={r.closedOn} /></td>
                  <td className="right mono">{r.guaranteeCount} / {r.invoiceCount} / {r.paymentCount} / {r.lcCount}</td>
                  <td className="right">
                    {!r.takingOverCertifiedOn && (r.status === 'SIGNED' || r.status === 'IN_PROGRESS') && <IssueTakingOverButton contractId={r.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
