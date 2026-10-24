import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { listFirmPRs } from '@/interfaces/ui/views/FirmViews';
import { Empty } from '@/interfaces/ui/components/Empty';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel, MoneyCompact } from '@/interfaces/ui/components/Money';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';
import { AckPRButton } from './AckPRButton';

export const metadata = { title: 'Purchase requisitions • Procurement' };
export const dynamic = 'force-dynamic';

const ICON = {
  doc:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/></svg>,
  bell:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 004 0"/></svg>,
  check:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg>,
  wallet: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h3"/><path d="M3 10h18"/></svg>,
};

export default async function FirmPRsPage() {
  const ctx = await requireSessionCtx();
  if (!ctx.firmId && !ctx.roles.includes(Role.ADMIN)) redirect('/dashboard');
  const rows = ctx.firmId ? await listFirmPRs(ctx.firmId) : [];
  const awaitingAck = rows.filter((r) => r.status === 'SENT').length;
  const acknowledged = rows.filter((r) => r.status === 'ACKNOWLEDGED' || r.status === 'CLOSED').length;
  const totalValue = rows.reduce((n, r) => n + BigInt(r.amountMinor), 0n);

  return (
    <>
      <h1>Purchase requisitions</h1>
      <p className="muted">PRs awarded to your firm. Acknowledge once you receive the fax.</p>

      {rows.length > 0 && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 14, marginBottom: 18 }}>
          <KpiCard accent="indigo"  icon={ICON.doc}    label="Total PRs"     value={rows.length} sub="Awarded to your firm" />
          <KpiCard accent="amber"   icon={ICON.bell}   label="Awaiting ack"  value={awaitingAck} sub="Click to acknowledge once faxed" />
          <KpiCard accent="emerald" icon={ICON.check}  label="Acknowledged" value={acknowledged} sub="Already confirmed" />
          <KpiCard accent="violet"  icon={ICON.wallet} label="Awarded value" value={<MoneyCompact amountMinor={totalValue.toString()} currency="PKR" precision={2} />} sub="Lifetime, across all PRs" />
        </section>
      )}

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
