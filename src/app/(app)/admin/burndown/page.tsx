import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { loadBurndown } from '@/interfaces/ui/views/BurndownView';
import { Empty } from '@/interfaces/ui/components/Empty';
import { MoneyCompact, MoneyLabel } from '@/interfaces/ui/components/Money';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';

export const metadata = { title: 'Budget burn-down • Admin' };
export const dynamic = 'force-dynamic';

const RISK_TONE = {
  ok: 'ok' as const, watch: 'info' as const, warn: 'warn' as const, critical: 'danger' as const,
};

export default async function BurndownPage({ searchParams }: { searchParams: { fy?: string } }) {
  await requireRoles([Role.ADMIN]);
  const fiscalYears = await prisma.fiscalYear.findMany({
    orderBy: { startsOn: 'desc' },
    select: { id: true, label: true, isActive: true },
  });
  const selectedId = searchParams.fy ?? fiscalYears.find((f) => f.isActive)?.id ?? fiscalYears[0]?.id;
  const data = selectedId ? await loadBurndown(selectedId) : null;

  return (
    <>
      <div className="row" style={{ marginBottom: 10 }}>
        <h1 style={{ margin: 0 }}>Budget burn-down</h1>
        <div className="grow" />
        <form method="get" className="row" style={{ gap: 6 }}>
          <label className="dim" style={{ fontSize: 12 }}>Fiscal year</label>
          <select name="fy" className="select" defaultValue={selectedId ?? ''} style={{ minWidth: 140 }}>
            {fiscalYears.map((f) => <option key={f.id} value={f.id}>{f.label}{f.isActive ? ' (active)' : ''}</option>)}
          </select>
          <button className="btn" type="submit">Apply</button>
        </form>
      </div>
      <p className="muted">
        Per budget head: allocated vs committed (in-flight indents) vs awarded (issued PRs), with an end-of-year projection extrapolated from the current burn rate.
      </p>

      {!data ? (
        <Empty>Pick a fiscal year to see the burn-down.</Empty>
      ) : (
        <>
          <section className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <KPI label="FY" value={data.fiscalYearLabel} sub={`${data.startsOn} → ${data.endsOn}`} />
            <KPI label="Elapsed" value={`${data.elapsedPct}%`} sub={`${data.daysElapsed} / ${data.daysInYear} days`} />
            <KPI label="Total allocated" value={<MoneyCompact amountMinor={data.totals.allocatedMinor} currency="PKR" precision={2} />} />
            <KPI label="Committed" value={<MoneyCompact amountMinor={data.totals.committedMinor} currency="PKR" precision={2} />} />
            <KPI label="Awarded" value={<MoneyCompact amountMinor={data.totals.awardedMinor} currency="PKR" precision={2} />} />
            <KPI
              label="Remaining"
              value={<MoneyCompact amountMinor={data.totals.remainingMinor} currency="PKR" precision={2} />}
              sub={`${data.totals.utilizationPct}% utilised`}
            />
          </section>

          {data.rows.length === 0 ? (
            <Empty>No budget allocations or activity in this fiscal year yet.</Empty>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Head</th>
                    <th className="right">Allocated</th>
                    <th className="right">Awarded</th>
                    <th className="right">Committed</th>
                    <th className="right">Remaining</th>
                    <th style={{ minWidth: 220 }}>Utilisation</th>
                    <th className="right">Projected EOY</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => {
                    const pctAwarded = Math.min(100, r.awardedPct);
                    const pctUtil = Math.min(100, r.utilizationPct);
                    const projectedOver = BigInt(r.projectedOverrunMinor) > 0n;
                    return (
                      <tr key={r.budgetHeadCode}>
                        <td className="mono">{r.budgetHeadCode}
                          <div className="muted" style={{ fontSize: 11 }}>{r.description}</div>
                        </td>
                        <td className="right"><MoneyCompact amountMinor={r.allocatedMinor} currency="PKR" precision={2} /></td>
                        <td className="right"><MoneyCompact amountMinor={r.awardedMinor} currency="PKR" precision={2} /></td>
                        <td className="right muted"><MoneyCompact amountMinor={r.committedMinor} currency="PKR" precision={2} /></td>
                        <td className="right">
                          {BigInt(r.remainingMinor) < 0n ? (
                            <span style={{ color: 'var(--danger)' }}>−<MoneyCompact amountMinor={(-BigInt(r.remainingMinor)).toString()} currency="PKR" precision={2} /></span>
                          ) : <MoneyCompact amountMinor={r.remainingMinor} currency="PKR" precision={2} />}
                        </td>
                        <td>
                          <div style={{ position: 'relative', height: 10, background: 'var(--bg-input)', borderRadius: 5, border: '1px solid var(--border)', overflow: 'hidden' }}>
                            {/* Awarded */}
                            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pctAwarded}%`, background: 'var(--accent)' }} />
                            {/* Committed stacked on top of awarded */}
                            <div style={{ position: 'absolute', left: `${pctAwarded}%`, top: 0, height: '100%', width: `${Math.max(0, pctUtil - pctAwarded)}%`, background: 'var(--accent-weak)' }} />
                          </div>
                          <div className="muted mono" style={{ fontSize: 11, marginTop: 2 }}>{r.utilizationPct}% committed · {r.awardedPct}% spent</div>
                        </td>
                        <td className="right">
                          <MoneyCompact amountMinor={r.projectedEOYMinor} currency="PKR" precision={2} />
                          {projectedOver && (
                            <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>
                              +<MoneyCompact amountMinor={r.projectedOverrunMinor} currency="PKR" precision={2} /> over
                            </div>
                          )}
                        </td>
                        <td><StatusPill tone={RISK_TONE[r.riskLevel]}>{r.riskLevel.toUpperCase()}</StatusPill></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            <strong>Risk</strong> is based on the projected EOY spend ÷ allocation:
            <StatusPill tone="ok">OK</StatusPill> &lt; 90 %, <StatusPill tone="info">WATCH</StatusPill> 90-100 %, <StatusPill tone="warn">WARN</StatusPill> 100-120 %, <StatusPill tone="danger">CRITICAL</StatusPill> &gt; 120 %.
            Projection uses linear extrapolation of awarded value — if your spend is lumpy at year-end, treat it as a conservative guide, not a precise forecast.
          </p>
          <p className="muted" style={{ fontSize: 12 }}>
            Totals this FY: allocated <MoneyLabel amountMinor={data.totals.allocatedMinor} currency="PKR" /> ·
            awarded <MoneyLabel amountMinor={data.totals.awardedMinor} currency="PKR" /> ·
            committed <MoneyLabel amountMinor={data.totals.committedMinor} currency="PKR" />.
          </p>
        </>
      )}
    </>
  );
}

function KPI({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div>
      <div className="dim" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
