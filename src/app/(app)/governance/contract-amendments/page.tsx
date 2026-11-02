import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listContractAmendments } from '@/interfaces/ui/views/GovernanceViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { AmendmentActions } from './AmendmentActions';

export const metadata = { title: 'Contract amendments • Procurement' };
export const dynamic = 'force-dynamic';

export default async function ContractAmendmentsPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF, Role.DP_N, Role.DGDP, Role.SECY_DP]);
  const rows = await listContractAmendments();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Contract amendments</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/governance/contract-amendments/new">+ Propose amendment</Link>
      </div>
      <p className="muted">DPP&amp;I-35 Chapter XXI — a formal change to quantity, delivery period, value or specification of a signed contract. On approval, VALUE / QTY amendments move the contract value in the same transaction.</p>

      {rows.length === 0 ? (
        <Empty>No contract amendments recorded yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Firm</th>
                <th>Scope</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Approved</th>
                <th className="right">Delta value</th>
                <th>Summary</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.contractNumber}</td>
                  <td>{r.firmName}</td>
                  <td><StatusPill tone="info">{r.scope}</StatusPill></td>
                  <td><StatusPill tone={r.status === 'APPROVED' ? 'ok' : r.status === 'REJECTED' ? 'danger' : 'warn'}>{r.status}</StatusPill></td>
                  <td><DateLabel iso={r.requestedOn} /></td>
                  <td><DateLabel iso={r.approvedOn} /></td>
                  <td className="right">
                    {r.deltaValueMinor && r.deltaCurrency
                      ? <MoneyLabel amountMinor={r.deltaValueMinor} currency={r.deltaCurrency} />
                      : <span className="muted">—</span>}
                  </td>
                  <td style={{ maxWidth: 320 }}>{r.summary}</td>
                  <td className="right"><AmendmentActions id={r.id} status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
