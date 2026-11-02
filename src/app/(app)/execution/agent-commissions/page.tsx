import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listAgentCommissions } from '@/interfaces/ui/views/ExecutionEvidenceViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { ApproveCommissionButton } from './ApproveCommissionButton';

export const metadata = { title: 'Agent commissions • Procurement' };
export const dynamic = 'force-dynamic';

export default async function AgentCommissionsPage() {
  await requireRoles([Role.ADMIN, Role.DP_N, Role.DGDP, Role.SECY_DP, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listAgentCommissions();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Agent commissions</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/execution/agent-commissions/new">+ Disclose commission</Link>
      </div>
      <p className="muted">DPP&amp;I-35 Chapter XX — any agent commission paid in connection with a contract must be disclosed and approved before payment.</p>

      {rows.length === 0 ? (
        <Empty>No agent commissions disclosed yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Firm</th>
                <th>Agent</th>
                <th className="right">% of contract</th>
                <th className="right">Amount</th>
                <th>Disclosed</th>
                <th>Approved</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono"><Link href="/execution/contracts">{r.contractNumber}</Link></td>
                  <td>{r.firmName}</td>
                  <td>{r.agentName}</td>
                  <td className="right mono">{r.percent}%</td>
                  <td className="right"><MoneyLabel amountMinor={r.amountMinor} currency={r.currency} /></td>
                  <td><DateLabel iso={r.disclosedOn} /></td>
                  <td><DateLabel iso={r.approvedOn} /></td>
                  <td><StatusPill tone={r.approvedOn ? 'ok' : 'warn'}>{r.approvedOn ? 'APPROVED' : 'DISCLOSED'}</StatusPill></td>
                  <td className="right">{!r.approvedOn && <ApproveCommissionButton id={r.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
