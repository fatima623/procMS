import { Role } from '@prisma/client';
import Link from 'next/link';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { loadFirmScorecard, type FirmScorecardRow } from '@/interfaces/ui/views/FirmScorecardView';
import { Empty } from '@/interfaces/ui/components/Empty';
import { MoneyCompact } from '@/interfaces/ui/components/Money';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';

export const metadata = { title: 'Firm comparison • Admin' };
export const dynamic = 'force-dynamic';

export default async function FirmComparePage({ searchParams }: { searchParams: { fy?: string; firms?: string } }) {
  await requireRoles([Role.ADMIN]);
  const fiscalYears = await prisma.fiscalYear.findMany({ orderBy: { startsOn: 'desc' }, select: { id: true, label: true, isActive: true } });
  const selectedFyId = searchParams.fy ?? fiscalYears.find((f) => f.isActive)?.id ?? null;

  const allFirms = await prisma.firm.findMany({ orderBy: { name: 'asc' }, select: { id: true, code: true, name: true } });
  const requestedIds = (searchParams.firms ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const picked = requestedIds.slice(0, 4);

  const scorecard = picked.length > 0
    ? await loadFirmScorecard({ ...(selectedFyId ? { fiscalYearId: selectedFyId } : {}) })
    : [];
  const rowsById = new Map(scorecard.map((r) => [r.firmId, r]));
  const compareRows = picked.map((id) => rowsById.get(id)).filter((r): r is FirmScorecardRow => !!r);
  const selectedLabel = fiscalYears.find((f) => f.id === selectedFyId)?.label ?? 'All time';

  return (
    <>
      <div className="row" style={{ marginBottom: 10 }}>
        <h1 style={{ margin: 0 }}>Firm comparison</h1>
        <div className="grow" />
        <Link href={{ pathname: '/admin/firms/scorecard', query: { ...(selectedFyId ? { fy: selectedFyId } : {}) } }} className="btn btn-ghost" style={{ fontSize: 12 }}>Scorecard →</Link>
      </div>

      <form method="get" className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 12, alignItems: 'end' }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Fiscal year</label>
            <select name="fy" className="select" defaultValue={selectedFyId ?? ''}>
              <option value="">— All time —</option>
              {fiscalYears.map((f) => <option key={f.id} value={f.id}>{f.label}{f.isActive ? ' (active)' : ''}</option>)}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Firms (hold Ctrl to pick up to 4)</label>
            <select name="firms" className="select" multiple size={6} defaultValue={picked} style={{ minHeight: 140 }}>
              {allFirms.map((f) => <option key={f.id} value={f.id}>{f.code} — {f.name}</option>)}
            </select>
          </div>
          <div><button className="btn btn-primary" type="submit">Compare</button></div>
        </div>
      </form>

      {compareRows.length === 0 ? (
        <Empty>Pick two to four firms above to see them side by side.</Empty>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 220 }}>Metric</th>
                {compareRows.map((r) => (
                  <th key={r.firmId}>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div className="muted mono" style={{ fontSize: 11 }}>{r.code}{r.city ? ` · ${r.city}` : ''}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row label="Status" cells={compareRows.map((r) => r.isBlacklisted ? <StatusPill tone="danger">Blacklisted</StatusPill> : <StatusPill tone="ok">Active</StatusPill>)} />
              <Row label="Invites received" cells={compareRows.map((r) => <span className="mono">{r.invites}</span>)} />
              <Row label="Technical offers submitted" cells={compareRows.map((r) => <span className="mono">{r.technicalOffers}</span>)} />
              <Row label="Technical accepted" cells={compareRows.map((r) => (
                <>
                  <span className="mono">{r.technicalAccepted}</span>
                  {r.technicalOffers > 0 && <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>({r.technicalAcceptPct}%)</span>}
                </>
              ))} />
              <Row label="Commercial opened" cells={compareRows.map((r) => <span className="mono">{r.commercialOpened}</span>)} />
              <Row label="PRs won" cells={compareRows.map((r) => <span className="mono" style={{ fontWeight: 600 }}>{r.prsWon}</span>)} />
              <Row label="Win rate" cells={compareRows.map((r) => (
                <WinRateBar winRate={r.winRatePct} hasInvites={r.invites > 0} />
              ))} highlightMax={compareRows.map((r) => r.winRatePct)} />
              <Row label="Awarded value" cells={compareRows.map((r) => (
                BigInt(r.awardedMinor) > 0n ? <MoneyCompact amountMinor={r.awardedMinor} currency="PKR" precision={2} /> : <span className="muted">—</span>
              ))} highlightMax={compareRows.map((r) => Number(BigInt(r.awardedMinor) / 10_000n))} />
              <Row label="Avg query reply" cells={compareRows.map((r) => (
                <span className="mono" style={{
                  color: r.avgQueryResponseHours === null ? 'var(--text-muted)'
                    : r.avgQueryResponseHours > 48 ? 'var(--danger)'
                    : r.avgQueryResponseHours > 24 ? '#fde047'
                    : 'var(--ok)',
                }}>{r.avgQueryResponseHours === null ? '—' : `${r.avgQueryResponseHours} hr`}</span>
              ))} highlightMin={compareRows.map((r) => r.avgQueryResponseHours ?? Infinity)} />
            </tbody>
          </table>
        </div>
      )}
      <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        Scope: <strong>{selectedLabel}</strong>. Winners on each row are highlighted — bigger is better except for "Avg query reply", where lower is better.
      </p>
    </>
  );
}

function Row({
  label, cells, highlightMax, highlightMin,
}: {
  label: string;
  cells: readonly React.ReactNode[];
  highlightMax?: readonly number[];
  highlightMin?: readonly number[];
}) {
  // Decide which cell wins. `highlightMax` → highest value wins; `highlightMin` → lowest wins (ignore Infinity).
  let winnerIdx = -1;
  if (highlightMax && highlightMax.length === cells.length) {
    const best = Math.max(...highlightMax);
    if (best > 0) winnerIdx = highlightMax.indexOf(best);
  } else if (highlightMin && highlightMin.length === cells.length) {
    const valid = highlightMin.filter((n) => Number.isFinite(n));
    if (valid.length > 0) {
      const best = Math.min(...valid);
      winnerIdx = highlightMin.indexOf(best);
    }
  }
  return (
    <tr>
      <td className="dim" style={{ fontSize: 12 }}>{label}</td>
      {cells.map((c, i) => (
        <td key={i} className="right" style={{
          background: i === winnerIdx ? 'rgba(74, 156, 255, 0.08)' : 'transparent',
          fontWeight: i === winnerIdx ? 600 : 400,
        }}>
          {c}
        </td>
      ))}
    </tr>
  );
}

function WinRateBar({ winRate, hasInvites }: { winRate: number; hasInvites: boolean }) {
  if (!hasInvites) return <span className="muted">—</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
      <div style={{ width: 70, height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{ width: `${Math.min(100, winRate)}%`, height: '100%', background: winRate >= 50 ? 'var(--ok)' : winRate >= 20 ? '#fde047' : 'var(--text-muted)' }} />
      </div>
      <span className="mono" style={{ fontSize: 12, minWidth: 40 }}>{winRate}%</span>
    </div>
  );
}
