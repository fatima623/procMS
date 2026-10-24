import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { loadFirmScorecard } from '@/interfaces/ui/views/FirmScorecardView';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { MoneyCompact } from '@/interfaces/ui/components/Money';

export const metadata = { title: 'Firm scorecard • Admin' };
export const dynamic = 'force-dynamic';

export default async function FirmScorecardPage({ searchParams }: { searchParams: { fy?: string } }) {
  await requireRoles([Role.ADMIN]);
  const fiscalYears = await prisma.fiscalYear.findMany({
    orderBy: { startsOn: 'desc' },
    select: { id: true, label: true, isActive: true },
  });
  const selectedFyId = searchParams.fy ?? fiscalYears.find((f) => f.isActive)?.id ?? null;
  const rows = await loadFirmScorecard({ ...(selectedFyId ? { fiscalYearId: selectedFyId } : {}) });
  const selectedLabel = fiscalYears.find((f) => f.id === selectedFyId)?.label ?? 'All time';

  return (
    <>
      <div className="row" style={{ marginBottom: 10 }}>
        <h1 style={{ margin: 0 }}>Firm scorecard</h1>
        <div className="grow" />
        <form method="get" className="row" style={{ gap: 6 }}>
          <label className="dim" style={{ fontSize: 12 }}>Fiscal year</label>
          <select name="fy" className="select" defaultValue={selectedFyId ?? ''} style={{ minWidth: 140 }}>
            <option value="">— All time —</option>
            {fiscalYears.map((f) => <option key={f.id} value={f.id}>{f.label}{f.isActive ? ' (active)' : ''}</option>)}
          </select>
          <button className="btn" type="submit">Apply</button>
        </form>
      </div>
      <p className="muted">
        Vendor performance funnel · scoped to <strong>{selectedLabel}</strong>. Columns go left-to-right from invitation through to award, so you can spot where each firm drops off.
      </p>

      {rows.length === 0 ? (
        <Empty>No firms on file.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Firm</th>
                <th className="right">Invites</th>
                <th className="right">Tech offers</th>
                <th className="right">Tech accepted</th>
                <th className="right">Commercial opened</th>
                <th className="right">PRs won</th>
                <th className="right">Win rate</th>
                <th className="right">Awarded</th>
                <th className="right">Avg query reply</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.firmId}>
                  <td>
                    <div>
                      {r.name}
                      {r.isBlacklisted && <span style={{ marginLeft: 8 }}><StatusPill tone="danger">Blacklisted</StatusPill></span>}
                    </div>
                    <div className="muted mono" style={{ fontSize: 11 }}>{r.code}{r.city ? ` · ${r.city}` : ''}</div>
                  </td>
                  <td className="right mono">{r.invites}</td>
                  <td className="right mono">{r.technicalOffers}</td>
                  <td className="right mono">
                    {r.technicalAccepted}
                    {r.technicalOffers > 0 && <div className="muted" style={{ fontSize: 11 }}>{r.technicalAcceptPct}%</div>}
                  </td>
                  <td className="right mono">{r.commercialOpened}</td>
                  <td className="right mono" style={{ fontWeight: 600 }}>{r.prsWon}</td>
                  <td className="right">
                    {r.invites > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <div style={{ width: 70, height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border)' }}>
                          <div style={{ width: `${Math.min(100, r.winRatePct)}%`, height: '100%', background: r.winRatePct >= 50 ? 'var(--ok)' : r.winRatePct >= 20 ? '#fde047' : 'var(--text-muted)' }} />
                        </div>
                        <span className="mono" style={{ fontSize: 12, minWidth: 40 }}>{r.winRatePct}%</span>
                      </div>
                    ) : <span className="muted">—</span>}
                  </td>
                  <td className="right">
                    {BigInt(r.awardedMinor) > 0n
                      ? <MoneyCompact amountMinor={r.awardedMinor} currency="PKR" precision={1} />
                      : <span className="muted">—</span>}
                  </td>
                  <td className="right mono" style={{
                    color: r.avgQueryResponseHours === null ? 'var(--text-muted)' : r.avgQueryResponseHours > 48 ? 'var(--danger)' : r.avgQueryResponseHours > 24 ? '#fde047' : 'var(--ok)',
                  }}>
                    {r.avgQueryResponseHours === null ? '—' : `${r.avgQueryResponseHours} hr`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        <strong>Win rate</strong> = PRs won ÷ IT invites.
        <strong style={{ marginLeft: 10 }}>Avg query reply</strong> = mean (answeredAt − askedAt) across every TSR query raised to the firm; green ≤ 24 h, amber ≤ 48 h, red beyond.
      </p>
    </>
  );
}
