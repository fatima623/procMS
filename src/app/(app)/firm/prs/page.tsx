import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { listFirmPRs } from '@/interfaces/ui/views/FirmViews';
import { Empty } from '@/interfaces/ui/components/Empty';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { AckPRButton } from './AckPRButton';

export const metadata = { title: 'Purchase requisitions • Procurement' };
export const dynamic = 'force-dynamic';

export default async function FirmPRsPage() {
  const ctx = await requireSessionCtx();
  if (!ctx.firmId && !ctx.roles.includes(Role.ADMIN)) redirect('/dashboard');
  const rows = ctx.firmId ? await listFirmPRs(ctx.firmId) : [];
  return (
    <>
      <h1>Purchase requisitions</h1>
      <p className="muted">PRs awarded to your firm. Acknowledge once you receive the fax.</p>
      {rows.length === 0 ? (
        <Empty>No purchase requisitions yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>PR number</th>
                <th className="right">Amount</th>
                <th>Dispatched</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.prNumber}</td>
                  <td className="right"><MoneyLabel amountMinor={r.amountMinor} currency={r.currency} /></td>
                  <td><DateLabel iso={r.faxedAt} /></td>
                  <td>
                    <StatusPill tone={r.status === 'ACKNOWLEDGED' || r.status === 'CLOSED' ? 'ok' : r.status === 'SENT' ? 'warn' : 'default'}>
                      {r.status}
                    </StatusPill>
                  </td>
                  <td className="right">
                    {r.status === 'SENT' ? <AckPRButton prId={r.id} /> : <span className="muted">—</span>}
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
