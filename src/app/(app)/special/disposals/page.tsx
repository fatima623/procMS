import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listDisposals, listDisposalLots } from '@/interfaces/ui/views/SpecialCaseViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { DisposalActions } from './DisposalActions';
import { AwardLotButton } from './AwardLotButton';

export const metadata = { title: 'Disposals • Procurement' };
export const dynamic = 'force-dynamic';

export default async function DisposalsPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const [cases, lots] = await Promise.all([listDisposals(), listDisposalLots()]);
  type Lot = (typeof lots)[number];
  const lotsByCase = new Map<string, Lot[]>();
  for (const l of lots) {
    const g = lotsByCase.get(l.caseId) ?? [];
    g.push(l);
    lotsByCase.set(l.caseId, g);
  }
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Disposal of surplus stores</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/special/disposals/new">+ New disposal case</Link>
      </div>
      <p className="muted">DPP&amp;I-35 Chapter XXV — auction, tender, scrap-sale or transfer of surplus defence stores. One case has many lots; each lot gets its own winning bid.</p>

      {cases.length === 0 ? (
        <Empty>No disposal cases on record.</Empty>
      ) : (
        <div className="stack-md">
          {cases.map((c) => (
            <div key={c.id} className="card" style={{ padding: 16 }}>
              <div className="row" style={{ marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>{c.reference}</h3>
                <div style={{ marginLeft: 10, display: 'inline-flex', gap: 6 }}>
                  <StatusPill tone="info">{c.kind}</StatusPill>
                  <StatusPill tone={c.status === 'COMPLETED' ? 'ok' : c.status === 'CANCELLED' ? 'danger' : 'warn'}>{c.status.replace(/_/g, ' ')}</StatusPill>
                </div>
                <div className="grow" />
                <DisposalActions id={c.id} status={c.status} />
              </div>
              <p className="muted" style={{ margin: 0 }}>{c.description}</p>
              <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', margin: '8px 0 0' }}>
                <dt className="muted">Initiated</dt><dd><DateLabel iso={c.initiatedOn} /></dd>
                <dt className="muted">Bids open</dt><dd><DateLabel iso={c.bidOpensOn} /></dd>
                <dt className="muted">Bids close</dt><dd><DateLabel iso={c.bidClosesOn} /></dd>
                <dt className="muted">Awarded on</dt><dd><DateLabel iso={c.awardedOn} /></dd>
                <dt className="muted">Completed on</dt><dd><DateLabel iso={c.completedOn} /></dd>
                <dt className="muted">Lots awarded</dt><dd className="mono">{c.awardedLotCount} / {c.lotCount}</dd>
                <dt className="muted">Total proceeds</dt><dd>{c.totalProceedsMinor ? <MoneyLabel amountMinor={c.totalProceedsMinor} currency={c.currency} /> : <span className="muted">—</span>}</dd>
              </dl>
              <table className="table" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>Lot</th>
                    <th>Description</th>
                    <th className="right">Reserve</th>
                    <th className="right">Winning bid</th>
                    <th>Winner</th>
                    <th>Awarded</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(lotsByCase.get(c.id) ?? []).map((l) => (
                    <tr key={l.id}>
                      <td className="mono">{l.lotNumber}</td>
                      <td>{l.description}</td>
                      <td className="right">
                        {l.reservePriceMinor
                          ? <MoneyLabel amountMinor={l.reservePriceMinor} currency={l.currency} />
                          : <span className="muted">—</span>}
                      </td>
                      <td className="right">
                        {l.winningBidMinor
                          ? <MoneyLabel amountMinor={l.winningBidMinor} currency={l.currency} />
                          : <span className="muted">—</span>}
                      </td>
                      <td>{l.winningBidderName ?? <span className="muted">—</span>}</td>
                      <td><DateLabel iso={l.awardedOn} /></td>
                      <td className="right">
                        {!l.winningBidMinor && (c.status === 'OPEN_FOR_BIDS' || c.status === 'AWARDED') && (
                          <AwardLotButton lotId={l.id} currency={l.currency} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
