import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listCommercialOffers } from '@/interfaces/ui/views/WorkflowListViews';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Commercial Offers • Procurement' };
export const dynamic = 'force-dynamic';

const ICON = {
  envelope: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>,
  shield:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>,
  wallet:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h3"/><path d="M3 10h18"/></svg>,
};

export default async function CommercialOffersPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listCommercialOffers();
  const received = rows.filter((r) => r.status === 'RECEIVED').length;
  const totalMinor = rows.reduce((sum, r) => sum + BigInt(r.totalPriceMinor), 0n);
  const withSecurity = rows.filter((r) => r.bidSecurityMinor && BigInt(r.bidSecurityMinor) > 0n).length;

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Commercial offers</h1>
        <div className="grow" />
        <span className="muted" style={{ fontSize: 13 }}>Open commercial envelopes from the indent in COMMERCIAL_OPEN status</span>
      </div>
      <p className="muted">Price envelopes opened for technically accepted firms (Chapter IX DPP&amp;I-35).</p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KpiCard accent="sky"     icon={ICON.envelope} label="Total offers" value={rows.length} sub={`${received} just received`} />
        <KpiCard accent="indigo"  icon={ICON.wallet}   label="Combined bid value" value={<MoneyLabel amountMinor={totalMinor.toString()} currency="PKR" />} sub="Across all open offers" />
        <KpiCard accent="emerald" icon={ICON.shield}   label="With bid security" value={withSecurity} sub="PPRA Rule 25 compliant" />
      </section>

      {rows.length === 0 ? (
        <Empty>No commercial offers opened yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>IT Reference</th>
                <th>Indent</th>
                <th>Firm</th>
                <th>Status</th>
                <th className="right">Total price</th>
                <th className="right">Bid security</th>
                <th className="right">Delivery (weeks)</th>
                <th>Opened</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.itReference}</td>
                  <td><Link href={`/indents/${r.indentId}`}>{r.indentSubject}</Link></td>
                  <td>{r.firmName}</td>
                  <td><StatusPill tone={r.status === 'ACCEPTED' ? 'ok' : r.status === 'REJECTED' ? 'danger' : 'info'}>{r.status}</StatusPill></td>
                  <td className="right"><MoneyLabel amountMinor={r.totalPriceMinor} currency={r.currency} /></td>
                  <td className="right">
                    {r.bidSecurityMinor
                      ? <MoneyLabel amountMinor={r.bidSecurityMinor} currency={r.currency} />
                      : <span className="muted">—</span>}
                  </td>
                  <td className="right mono">{r.deliveryWeeks ?? '—'}</td>
                  <td><DateLabel iso={r.openedAt} /></td>
                  <td className="right"><Link className="btn" href={`/indents/${r.indentId}`}>Open indent →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
