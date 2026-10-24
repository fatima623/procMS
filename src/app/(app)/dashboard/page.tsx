import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { loadDashboardSummary, SLA_DAYS } from '@/interfaces/ui/views/DashboardView';
import { StatusPill, toneForIndentStatus } from '@/interfaces/ui/components/StatusPill';
import { MoneyLabel, MoneyCompact } from '@/interfaces/ui/components/Money';
import { Sparkbar } from '@/interfaces/ui/components/Sparkbar';
import { WelcomeTour, type TourStep } from './WelcomeTour';

export const metadata = { title: 'Dashboard • Procurement' };
export const dynamic = 'force-dynamic';

const PRIORITY_TONE: Record<string, 'danger' | 'warn' | 'info' | 'default'> = {
  URGENT: 'danger', HIGH: 'warn', NORMAL: 'info', LOW: 'default',
};

export default async function DashboardPage({ searchParams }: { searchParams: { fy?: string } }) {
  const ctx = await requireSessionCtx();
  const s = await loadDashboardSummary(ctx, { ...(searchParams.fy ? { fiscalYearId: searchParams.fy } : {}) });
  const isAdmin = ctx.roles.includes(Role.ADMIN);

  const tiles: { show: boolean; title: string; value: number | string; href: string; sub?: string }[] = [
    { show: isAdmin, title: 'Total indents', value: s.adminTotalIndents, sub: `${s.adminActiveIndents} active · ${s.adminClosedIndents} closed`, href: '/indents' },
    { show: isAdmin, title: 'Pending approvals (all roles)', value: s.adminPendingApprovals, sub: 'Steps waiting across every chain', href: '/approvals' },
    { show: ctx.roles.includes(Role.INDENTER), title: 'My indents', value: s.indentsMine, sub: s.openObservationsAgainstMe > 0 ? `${s.openObservationsAgainstMe} observation${s.openObservationsAgainstMe === 1 ? '' : 's'} to resolve` : 'All clear', href: '/indents' },
    { show: ctx.sectionIds.length > 0 && !isAdmin, title: 'Section workload', value: s.indentsOwnedByMySection, sub: 'Indents in my section', href: '/indents' },
    { show: !isAdmin && (s.pendingApprovalsForMyRoles > 0 || [Role.AD, Role.DD, Role.DP_N, Role.DGDP, Role.SECY_DP, Role.SUPTD, Role.CPO].some((r) => ctx.roles.includes(r))), title: 'Awaiting my decision', value: s.pendingApprovalsForMyRoles, sub: 'Approval steps queued', href: '/approvals' },
    { show: ctx.roles.includes(Role.INSPECTORATE), title: 'Active TSRs', value: s.tsrsActive, sub: 'Technical scrutiny in progress', href: '/tsrs' },
    { show: !!ctx.firmId, title: 'Open IT invites', value: s.firmInvitesOpen, sub: 'Tenders accepting offers', href: '/firm/invites' },
    { show: !!ctx.firmId, title: 'Queries awaiting reply', value: s.firmQueriesOpen, href: '/firm/queries' },
    { show: !!ctx.firmId, title: 'PRs pending acknowledgement', value: s.firmPRsPending, href: '/firm/prs' },
  ];

  const firmStats = s.adminFirmStats;
  const an = s.adminAnalytics;
  const selectedFyLabel = s.fiscalYears.find((f) => f.id === s.selectedFiscalYearId)?.label ?? 'All';
  const slaPct = an.sla.samples === 0 ? 100 : Math.round((an.sla.withinSla / an.sla.samples) * 100);

  const tourSteps: TourStep[] = isAdmin
    ? [
        { tourId: 'fy-picker',     title: 'Fiscal-year scope',         body: 'Everything below rescopes to the year you pick here. The 6-month intake chart stays on calendar months so you can still see momentum.' },
        { tourId: 'kpi-tiles',     title: 'Headline KPIs',             body: 'Total indents, pending approvals across every role, active firms, and a tap-through to each. Click any card to drill in.' },
        { tourId: 'pipeline-card', title: 'Pipeline value',            body: 'Live estimated value of in-flight indents, broken down by priority, with the top-5 biggest ones on the right.' },
        { tourId: 'sla-tracker',   title: 'SLA tracker',               body: 'Priority-weighted target cycle times. The top breaches table shows which indents are most overdue — click an indent to open it.' },
        { tourId: 'status-chips',  title: 'Status breakdown',          body: 'Every chip is a filter — click one to see all the indents currently in that status.' },
      ]
    : [
        { tourId: 'kpi-tiles', title: 'Your workload', body: 'A quick glance at what the system is waiting on from you.' },
      ];

  return (
    <>
      <WelcomeTour tourKey={isAdmin ? 'admin-dashboard-v1' : 'user-dashboard-v1'} steps={tourSteps} />
      <div className="row" style={{ gap: 12, marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <div className="grow" />
        {isAdmin && s.fiscalYears.length > 0 && (
          <form method="get" className="row" style={{ gap: 6 }} data-tour-id="fy-picker">
            <label className="dim" style={{ fontSize: 12 }} htmlFor="fy">Fiscal year</label>
            <select id="fy" name="fy" className="select" defaultValue={s.selectedFiscalYearId ?? ''} style={{ minWidth: 140 }}>
              <option value="">— All —</option>
              {s.fiscalYears.map((f) => <option key={f.id} value={f.id}>{f.label}{f.isActive ? ' (active)' : ''}</option>)}
            </select>
            <button className="btn" type="submit">Apply</button>
          </form>
        )}
      </div>
      <p className="muted">
        Signed in as <span className="mono">{ctx.userId.slice(-8)}</span>. Roles: <span className="mono">{ctx.roles.join(', ') || 'none'}</span>.
        {isAdmin && <> · Scoped to <strong>{selectedFyLabel}</strong>.</>}
      </p>

      <section data-tour-id="kpi-tiles" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 20 }}>
        {tiles.filter((t) => t.show).map((t) => (
          <Link key={t.title} href={t.href} className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div className="dim" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{t.title}</div>
            <div style={{ fontSize: 28, fontWeight: 600 }}>{t.value}</div>
            {t.sub && <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>{t.sub}</div>}
          </Link>
        ))}
      </section>

      {isAdmin && (
        <>
          {/* Executive KPI row */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 24 }}>
            <div className="card" style={{ margin: 0 }}>
              <div className="dim" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg cycle time</div>
              <div style={{ fontSize: 28, fontWeight: 600 }}>{an.cycleTime.avgDays}<span className="muted" style={{ fontSize: 14, fontWeight: 400 }}> days</span></div>
              <div className="muted" style={{ fontSize: 12 }}>Median {an.cycleTime.medianDays}d · sample {an.cycleTime.sampleSize}</div>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <div className="dim" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Within SLA</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: slaPct >= 90 ? 'var(--ok)' : slaPct >= 75 ? '#fde047' : 'var(--danger)' }}>{slaPct}%</div>
              <div className="muted" style={{ fontSize: 12 }}>{an.sla.withinSla} of {an.sla.samples} active indents</div>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <div className="dim" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rejections</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--danger)' }}>{an.rejectionStats.rejected}</div>
              <div className="muted" style={{ fontSize: 12 }}>+ {an.rejectionStats.cancelled} cancelled · rate {s.adminTotalIndents > 0 ? Math.round(((an.rejectionStats.rejected + an.rejectionStats.cancelled) / s.adminTotalIndents) * 100) : 0}%</div>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <div className="dim" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Awarded value</div>
              <div style={{ fontSize: 28, fontWeight: 600 }}>
                <MoneyCompact amountMinor={an.pareto.reduce((acc, b) => acc + BigInt(b.awardedMinor), 0n).toString()} currency="PKR" precision={2} />
              </div>
              <div className="muted" style={{ fontSize: 12 }}>Sum of PR amounts in {selectedFyLabel}</div>
            </div>
          </section>

          {/* Compliance / needs attention */}
          {an.compliance.length > 0 && (
            <section className="card" style={{ borderLeft: '3px solid var(--danger)' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚠ Needs attention</span>
                <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>({an.compliance.length} item{an.compliance.length === 1 ? '' : 's'})</span>
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
                {an.compliance.map((c) => (
                  <li key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'start' }}>
                    <StatusPill tone={c.severity === 'high' ? 'danger' : c.severity === 'medium' ? 'warn' : 'info'}>{c.severity}</StatusPill>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>
                        {c.href ? <Link href={c.href}>{c.title}</Link> : c.title}
                        <span className="muted mono" style={{ marginLeft: 8, fontSize: 12 }}>×{c.count}</span>
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>{c.detail}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Firms + SLA + Pipeline value */}
          <section className="card">
            <div className="row" style={{ marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Firms</h3>
              <div className="grow" />
              <Link href="/admin/firms/scorecard" className="btn btn-ghost" style={{ fontSize: 12 }}>Scorecard →</Link>
              <Link href="/admin/firms" className="btn btn-ghost" style={{ fontSize: 12 }}>Manage →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              <FirmStat tone="info"   label="Active"             value={firmStats.active}            hint="Ready for tender" href="/admin/firms" />
              <FirmStat tone="warn"   label="Needs verification" value={firmStats.needsVerification} hint="No NTN or no activity" href="/admin/firms" />
              <FirmStat tone="muted"  label="Inactive"           value={firmStats.inactive}          hint="Deactivated by admin" href="/admin/firms" />
              <FirmStat tone="danger" label="Blacklisted"        value={firmStats.blacklisted}       hint="Excluded from tenders" href="/admin/firms" />
            </div>
          </section>

          {/* SLA tracker */}
          <section className="card" data-tour-id="sla-tracker">
            <div className="row">
              <h3 style={{ margin: 0 }}>SLA tracker</h3>
              <div className="grow" />
              <span className="muted" style={{ fontSize: 12 }}>
                Targets: URGENT {SLA_DAYS.URGENT}d · HIGH {SLA_DAYS.HIGH}d · NORMAL {SLA_DAYS.NORMAL}d · LOW {SLA_DAYS.LOW}d
              </span>
            </div>
            {an.sla.samples === 0 ? (
              <div className="muted" style={{ marginTop: 10 }}>No submitted active indents in {selectedFyLabel}.</div>
            ) : (
              <>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 10, background: 'var(--bg-input)', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ width: `${slaPct}%`, height: '100%', background: slaPct >= 90 ? 'var(--ok)' : slaPct >= 75 ? '#fde047' : 'var(--danger)' }} />
                  </div>
                  <span className="mono" style={{ fontSize: 13, minWidth: 60, textAlign: 'right' }}>{slaPct}%</span>
                </div>
                {an.sla.breaches.length > 0 && (
                  <>
                    <h4 style={{ margin: '14px 0 6px', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>Top breaches</h4>
                    <table className="table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Indent</th>
                          <th>Priority</th>
                          <th className="right">Age</th>
                          <th className="right">SLA</th>
                          <th className="right">Over by</th>
                        </tr>
                      </thead>
                      <tbody>
                        {an.sla.breaches.map((b) => (
                          <tr key={b.indentId}>
                            <td className="mono"><Link href={`/indents/${b.indentId}`}>{b.indentNumber}</Link>
                              <div className="muted" style={{ fontSize: 11 }}>{b.subject}</div>
                            </td>
                            <td><StatusPill tone={PRIORITY_TONE[b.priority] ?? 'default'}>{b.priority}</StatusPill></td>
                            <td className="right mono">{b.ageDays}d</td>
                            <td className="right mono muted">{b.slaDays}d</td>
                            <td className="right mono" style={{ color: 'var(--danger)', fontWeight: 600 }}>+{b.overBy}d</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )}
          </section>

          {/* Pipeline value card */}
          <section className="card" data-tour-id="pipeline-card">
            <div className="row" style={{ marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Pipeline value (active indents)</h3>
              <div className="grow" />
              <span className="muted" style={{ fontSize: 12 }}>Active: {s.adminActiveIndents}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 2fr', gap: 24, alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.1 }}>
                  <MoneyCompact amountMinor={s.adminTotalPipelineValueMinor} currency="PKR" precision={2} />
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Exact: <MoneyLabel amountMinor={s.adminTotalPipelineValueMinor} currency="PKR" /></div>
                <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>Avg per active indent: <MoneyCompact amountMinor={s.adminAverageIndentValueMinor} currency="PKR" precision={1} /></div>
                {s.adminPriorityBreakdown.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div className="dim" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>By priority</div>
                    <div className="stack-sm">
                      {s.adminPriorityBreakdown.map((p) => (
                        <div key={p.priority} className="row" style={{ gap: 8 }}>
                          <StatusPill tone={PRIORITY_TONE[p.priority] ?? 'default'}>{p.priority}</StatusPill>
                          <span className="mono muted" style={{ fontSize: 12 }}>×{p.count}</span>
                          <span className="grow" />
                          <span className="mono"><MoneyCompact amountMinor={p.valueMinor} currency="PKR" precision={1} /></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div className="dim" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Top 5 by estimated value</div>
                {s.adminTopIndents.length === 0 ? <div className="muted">No active indents.</div> : (
                  <table className="table" style={{ margin: 0 }}>
                    <thead><tr><th>Indent #</th><th>Subject</th><th>Status</th><th className="right">Value</th></tr></thead>
                    <tbody>
                      {s.adminTopIndents.map((r) => (
                        <tr key={r.id}>
                          <td className="mono"><Link href={`/indents/${r.id}`}>{r.indentNumber}</Link></td>
                          <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subject}</td>
                          <td><StatusPill tone={toneForIndentStatus(r.status)}>{r.status}</StatusPill></td>
                          <td className="right"><MoneyCompact amountMinor={r.valueMinor} currency="PKR" precision={1} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>

          {/* Spend concentration (Pareto) */}
          <section className="card">
            <h3>Spend concentration</h3>
            <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
              Firms by awarded PR value in {selectedFyLabel}. Pareto rule: a healthy procurement typically sees {'<'} 80 % awarded to the top 20 % of suppliers.
            </p>
            {an.pareto.length === 0 ? (
              <div className="muted">No PRs issued in {selectedFyLabel}.</div>
            ) : (
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: 24 }}>#</th>
                    <th>Firm</th>
                    <th className="right">PRs</th>
                    <th className="right">Awarded</th>
                    <th>Cumulative share</th>
                  </tr>
                </thead>
                <tbody>
                  {an.pareto.map((p, idx) => (
                    <tr key={p.firmId}>
                      <td className="mono muted">{idx + 1}</td>
                      <td>{p.firmName}</td>
                      <td className="right mono">{p.prCount}</td>
                      <td className="right"><MoneyCompact amountMinor={p.awardedMinor} currency="PKR" precision={1} /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border)' }}>
                            <div style={{ width: `${p.cumulativePct}%`, height: '100%', background: p.cumulativePct > 80 ? 'var(--danger)' : p.cumulativePct > 50 ? '#fde047' : 'var(--accent)' }} />
                          </div>
                          <span className="mono" style={{ fontSize: 11, minWidth: 48, textAlign: 'right' }}>{p.cumulativePct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Approval heatmap */}
          <section className="card">
            <h3>Approval heatmap</h3>
            <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>Median hours per role per subject · darker = more decisions on that cell.</p>
            {an.heatmap.length === 0 ? (
              <div className="muted">No approval decisions on record.</div>
            ) : (
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Indent</th>
                    <th>IT Proforma</th>
                    <th>CST</th>
                  </tr>
                </thead>
                <tbody>
                  {an.heatmap.map((r) => {
                    const max = Math.max(1, ...r.cells.map((c) => c.decisions));
                    return (
                      <tr key={r.role}>
                        <td><StatusPill tone="info">{r.role}</StatusPill></td>
                        {r.cells.map((c) => {
                          const intensity = c.decisions === 0 ? 0 : 0.15 + 0.55 * (c.decisions / max);
                          return (
                            <td key={c.subject} style={{
                              background: c.decisions === 0 ? 'transparent' : `rgba(74, 156, 255, ${intensity})`,
                              padding: '10px',
                            }}>
                              {c.decisions === 0 ? (
                                <span className="muted">—</span>
                              ) : (
                                <>
                                  <div className="mono" style={{ fontWeight: 600 }}>{c.medianHours}<span className="muted" style={{ fontWeight: 400, fontSize: 11 }}> hr</span></div>
                                  <div className="muted" style={{ fontSize: 11 }}>{c.decisions} decision{c.decisions === 1 ? '' : 's'}</div>
                                </>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {/* Bottlenecks + chain velocity */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14 }}>
            <div className="card" style={{ margin: 0 }}>
              <h3>Stage bottlenecks</h3>
              <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>Average time active indents have been sitting in each status.</p>
              {an.bottlenecks.length === 0 ? <div className="muted">No active indents.</div> : (
                <table className="table" style={{ margin: 0 }}>
                  <thead><tr><th>Status</th><th className="right">Count</th><th className="right">Avg age</th></tr></thead>
                  <tbody>
                    {an.bottlenecks.map((b) => (
                      <tr key={b.status}>
                        <td><StatusPill tone={toneForIndentStatus(b.status)}>{b.status}</StatusPill></td>
                        <td className="right mono">{b.count}</td>
                        <td className="right mono" style={{ color: b.avgAgeDays > 14 ? 'var(--danger)' : b.avgAgeDays > 7 ? '#fde047' : 'inherit' }}>{b.avgAgeDays} d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="card" style={{ margin: 0 }}>
              <h3>Chain velocity</h3>
              <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>Average hours each role takes between receiving and deciding on a step.</p>
              {an.chainVelocity.length === 0 ? <div className="muted">No decisions recorded yet.</div> : (
                <table className="table" style={{ margin: 0 }}>
                  <thead><tr><th>Role</th><th className="right">Decisions</th><th className="right">Avg hrs</th></tr></thead>
                  <tbody>
                    {an.chainVelocity.map((v) => (
                      <tr key={v.role}>
                        <td><StatusPill tone="info">{v.role}</StatusPill></td>
                        <td className="right mono">{v.decisions}</td>
                        <td className="right mono">{v.avgHours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="card">
            <div className="row">
              <h3 style={{ margin: 0 }}>Indent intake — last 6 months</h3>
              <div className="grow" />
              <span className="muted" style={{ fontSize: 12 }}>Grouped by creation month (UTC)</span>
            </div>
            <Sparkbar data={an.monthlyTrend.map((m) => ({ label: m.label.slice(5), value: m.count, secondary: m.valueMinor }))} valueFmt={(n) => String(n)} height={120} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12 }} className="muted">
              <span>Total: {an.monthlyTrend.reduce((a, b) => a + b.count, 0)} indents</span>
              <span>Value: <MoneyCompact amountMinor={an.monthlyTrend.reduce((acc, m) => acc + BigInt(m.valueMinor), 0n).toString()} currency="PKR" precision={1} /></span>
            </div>
          </section>

          <section className="card">
            <h3>Budget head utilization <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>· {selectedFyLabel}</span></h3>
            <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>Committed = in-flight indents · Awarded = issued PRs.</p>
            {an.budgetUtilization.length === 0 ? <div className="muted">No budget head activity in {selectedFyLabel}.</div> : (
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr><th>Head</th><th>Description</th><th className="right">Active indents</th><th className="right">Committed</th><th className="right">Awarded</th></tr>
                </thead>
                <tbody>
                  {an.budgetUtilization.map((b) => (
                    <tr key={b.budgetHeadCode}>
                      <td className="mono">{b.budgetHeadCode}</td>
                      <td>{b.description}</td>
                      <td className="right mono">{b.indentCount}</td>
                      <td className="right"><MoneyCompact amountMinor={b.committedMinor} currency="PKR" precision={1} /></td>
                      <td className="right"><MoneyCompact amountMinor={b.awardedMinor} currency="PKR" precision={1} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {s.adminStatusBreakdown.length > 0 && (
            <section className="card" data-tour-id="status-chips">
              <h3>Status breakdown</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {s.adminStatusBreakdown.map((b) => (
                  <Link key={b.status} href={{ pathname: '/indents', query: { status: b.status } }} className="row"
                    style={{ gap: 8, border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', textDecoration: 'none', color: 'inherit' }}>
                    <StatusPill tone={toneForIndentStatus(b.status)}>{b.status}</StatusPill>
                    <span className="mono">{b.count}</span>
                  </Link>
                ))}
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Click any status to filter the Indents list.</div>
            </section>
          )}
        </>
      )}

      {ctx.roles.includes(Role.INDENTER) && (
        <section className="card" style={{ marginTop: 24 }}>
          <h3>Quick actions</h3>
          <Link href="/indents/new" className="btn btn-primary">+ New indent</Link>
        </section>
      )}
    </>
  );
}

function FirmStat({ tone, label, value, hint, href }: {
  tone: 'info' | 'warn' | 'muted' | 'danger';
  label: string; value: number; hint: string; href: string;
}) {
  const accent = tone === 'danger' ? 'var(--danger)' : tone === 'warn' ? '#fde047' : tone === 'muted' ? 'var(--text-muted)' : 'var(--accent-hover)';
  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit', display: 'block', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
      <div className="dim" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: accent, marginTop: 4 }}>{value}</div>
      <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{hint}</div>
    </Link>
  );
}
