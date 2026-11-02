import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listRiskPurchases } from '@/interfaces/ui/views/FrameworkViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { RiskPurchaseActions } from './RiskPurchaseActions';

export const metadata = { title: 'Risk purchase • Procurement' };
export const dynamic = 'force-dynamic';

export default async function RiskPurchasesPage() {
  await requireRoles([Role.ADMIN, Role.DP_N, Role.DGDP, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listRiskPurchases();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Risk purchase cases</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/frameworks/risk-purchases/new">+ Open case</Link>
      </div>
      <p className="muted">DPP&amp;I-35 Chapter XXII — if a supplier fails to perform, re-tender the defaulted scope at the defaulter's cost and risk. Record the trigger, link the replacement indent/contract, then settle.</p>

      {rows.length === 0 ? (
        <Empty>No risk-purchase cases on record.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Original contract</th>
                <th>Status</th>
                <th>Trigger</th>
                <th>Initiated</th>
                <th>Replacement</th>
                <th className="right">Risk settled</th>
                <th>Settled</th>
                <th>Closed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.originalContractNumber}</td>
                  <td><StatusPill tone={r.status === 'CLOSED' ? 'ok' : r.status === 'SETTLED' ? 'ok' : 'warn'}>{r.status.replace(/_/g, ' ')}</StatusPill></td>
                  <td style={{ maxWidth: 320 }}>{r.triggerReason}</td>
                  <td><DateLabel iso={r.initiatedOn} /></td>
                  <td className="mono">
                    {r.replacementContractNumber ?? (r.replacementIndentId ? `indent: ${r.replacementIndentId.slice(-8)}` : <span className="muted">—</span>)}
                  </td>
                  <td className="right">
                    {r.riskSettledMinor
                      ? <MoneyLabel amountMinor={r.riskSettledMinor} currency={r.currency} />
                      : <span className="muted">—</span>}
                  </td>
                  <td><DateLabel iso={r.settledOn} /></td>
                  <td><DateLabel iso={r.closedOn} /></td>
                  <td className="right"><RiskPurchaseActions id={r.id} status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
