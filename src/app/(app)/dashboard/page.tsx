import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { loadDashboardSummary, SLA_DAYS } from '@/interfaces/ui/views/DashboardView';
import { StatusPill, toneForIndentStatus } from '@/interfaces/ui/components/StatusPill';
import { MoneyLabel, MoneyCompact } from '@/interfaces/ui/components/Money';
import { Sparkbar } from '@/interfaces/ui/components/Sparkbar';
import { KpiCard, HeroCard, type Accent } from '@/interfaces/ui/components/KpiCard';
import { WelcomeTour, type TourStep } from './WelcomeTour';

export const metadata = { title: 'Dashboard • Procurement' };
export const dynamic = 'force-dynamic';

const PRIORITY_TONE: Record<string, 'danger' | 'warn' | 'info' | 'default'> = {
  URGENT: 'danger', HIGH: 'warn', NORMAL: 'info', LOW: 'default',
};

/* -- Tiny inline icon set — keeps bundle size trivial and renders crisply in both themes. -- */
const I = {
  stack:     <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  clock:     <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  user:      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>,
  users:     <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3 3-5 7-5s7 2 7 5"/><path d="M17 11a3 3 0 100-6"/><path d="M22 20c0-2.5-2-4-5-4.5"/></svg>,
  check:     <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg>,
  wrench:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 7a4 4 0 11-5 5l-6 6 2 2 6-6a4 4 0 015-5l-2 2 1 1 1-1 1 1-1 1 1 1 1-1z"/></svg>,
  mail:      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>,
  chat:      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  doc:       <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/></svg>,
  gauge:     <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 10-15.5 6"/><path d="M12 12l5-3"/></svg>,
  shield:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>,
  x:         <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>,
  wallet:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h3"/><path d="M3 10h18"/></svg>,
  firm:      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V8l8-5 8 5v13"/><path d="M9 21V12h6v9"/></svg>,
  warn:      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L2 20h20z"/><path d="M12 10v5M12 18h.01"/></svg>,
  ban:       <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M5 5l14 14"/></svg>,
};

export default async function DashboardPage({ searchParams }: { searchParams: { fy?: string } }) {
  const ctx = await requireSessionCtx();
  const s = await loadDashboardSummary(ctx, { ...(searchParams.fy ? { fiscalYearId: searchParams.fy } : {}) });
  const isAdmin = ctx.roles.includes(Role.ADMIN);

  // Role-aware tile set, each with its own accent + icon.
  type Tile = { show: boolean; accent: Accent; icon: React.ReactNode; title: string; value: number | string; href: string; sub?: string };
  const tiles: Tile[] = [
    { show: isAdmin, accent: 'indigo', icon: I.stack, title: 'Total indents', value: s.adminTotalIndents, sub: `${s.adminActiveIndents} active · ${s.adminClosedIndents} closed`, href: '/indents' },
    { show: isAdmin, accent: 'amber',  icon: I.clock, title: 'Pending approvals (all roles)', value: s.adminPendingApprovals, sub: 'Steps waiting across every chain', href: '/approvals' },
    { show: ctx.roles.includes(Role.INDENTER), accent: 'sky', icon: I.user, title: 'My indents', value: s.indentsMine, sub: s.openObservationsAgainstMe > 0 ? `${s.openObservationsAgainstMe} observation${s.openObservationsAgainstMe === 1 ? '' : 's'} to resolve` : 'All clear', href: '/indents' },
    { show: ctx.sectionIds.length > 0 && !isAdmin, accent: 'violet', icon: I.users, title: 'Section workload', value: s.indentsOwnedByMySection, sub: 'Indents in my section', href: '/indents' },
    { show: !isAdmin && (s.pendingApprovalsForMyRoles > 0 || [Role.AD, Role.DD, Role.DP_N, Role.DGDP, Role.SECY_DP, Role.SUPTD, Role.CPO].some((r) => ctx.roles.includes(r))), accent: 'coral', icon: I.check, title: 'Awaiting my decision', value: s.pendingApprovalsForMyRoles, sub: 'Approval steps queued', href: '/approvals' },
    { show: ctx.roles.includes(Role.INSPECTORATE), accent: 'teal', icon: I.wrench, title: 'Active TSRs', value: s.tsrsActive, sub: 'Technical scrutiny in progress', href: '/tsrs' },
    { show: !!ctx.firmId, accent: 'emerald', icon: I.mail, title: 'Open IT invites', value: s.firmInvitesOpen, sub: 'Tenders accepting offers', href: '/firm/invites' },
    { show: !!ctx.firmId, accent: 'pink',    icon: I.chat, title: 'Queries awaiting reply', value: s.firmQueriesOpen, href: '/firm/queries' },
    { show: !!ctx.firmId, accent: 'sky',     icon: I.doc,  title: 'PRs pending acknowledgement', value: s.firmPRsPending, href: '/firm/prs' },
  ];

  const firmStats = s.adminFirmStats;
  const an = s.adminAnalytics;
  const selectedFyLabel = s.fiscalYears.find((f) => f.id === s.selectedFiscalYearId)?.label ?? 'All';
  const slaPct = an.sla.samples === 0 ? 100 : Math.round((an.sla.withinSla / an.sla.samples) * 100);
  const slaAccent: Accent = slaPct >= 90 ? 'emerald' : slaPct >= 75 ? 'amber' : 'coral';
  const rejectRate = s.adminTotalIndents > 0 ? Math.round(((an.rejectionStats.rejected + an.rejectionStats.cancelled) / s.adminTotalIndents) * 100) : 0;
  const awardedTotal = an.pareto.reduce((acc, b) => acc + BigInt(b.awardedMinor), 0n).toString();

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

      {/* Role-aware headline tiles with per-metric accents */}
      <section data-tour-id="kpi-tiles" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 20 }}>
        {tiles.filter((t) => t.show).map((t) => (
          <KpiCard key={t.title} accent={t.accent} icon={t.icon} label={t.title} value={t.value} sub={t.sub} href={t.href} />
        ))}
      </section>

      {isAdmin && (
        <>
          {/* Executive hero + KPI row — mixed accents */}
          <section style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1.3fr) repeat(3, 1fr)', gap: 16, marginTop: 28 }} className="exec-row">
            <HeroCard
              accent="violet"
              label={`Awarded value · ${selectedFyLabel}`}
              value={<MoneyCompact amountMinor={awardedTotal} currency="PKR" precision={2} />}
              sub={`Sum of PR amounts across ${an.pareto.length} firm${an.pareto.length === 1 ? '' : 's'}`}
            />
            <KpiCard accent="sky"      icon={I.gauge}  label="Avg cycle time" value={an.cycleTime.avgDays} suffix=" days" sub={`Median ${an.cycleTime.medianDays}d · sample ${an.cycleTime.sampleSize}`} />
            <KpiCard accent={slaAccent} icon={I.shield} label="Within SLA" value={`${slaPct}%`} sub={`${an.sla.withinSla} of ${an.sla.samples} active indents`} />
            <KpiCard accent="coral"    icon={I.x}      label="Rejections" value={an.rejectionStats.rejected} sub={`+ ${an.rejectionStats.cancelled} cancelled · rate ${rejectRate}%`} />
          </section>

          {/* Compliance / needs attention */}
          {an.compliance.length > 0 && (
            <section className="card" style={{ borderLeft: '3px solid var(--acc-coral)' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="icon-chip sm c-coral" aria-hidden>{I.warn}</span>
                <span>Needs attention</span>
                <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>({an.compliance.length} item{an.compliance.length === 1 ? '' : 's'})</span>
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
                {an.compliance.map((c) => (
                  <li key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'start' }}>
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

          {/* Firms — now a four-up strip of KpiCards (compact variant) */}
          <section className="card">
            <div className="row" style={{ marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>Firms</h3>
              <div className="grow" />
              <Link href="/admin/firms/scorecard" className="btn btn-ghost" style={{ fontSize: 12 }}>Scorecard →</Link>
              <Link href="/admin/firms" className="btn btn-ghost" style={{ fontSize: 12 }}>Manage →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <KpiCard accent="emerald" icon={I.firm}   label="Active"             value={firmStats.active}            sub="Ready for tender"           href="/admin/firms" />
              <KpiCard accent="amber"   icon={I.warn}   label="Needs verification" value={firmStats.needsVerification} sub="No NTN or no activity"     href="/admin/firms" />
              <KpiCard accent="indigo"  icon={I.users}  label="Inactive"           value={firmStats.inactive}          sub="Deactivated by admin"      href="/admin/firms" />
              <KpiCard accent="coral"   icon={I.ban}    label="Blacklisted"        value={firmStats.blacklisted}       sub="Excluded from tenders"     href="/admin/firms" />
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
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, height: 12, background: 'var(--bg-input)', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{
                      width: `${slaPct}%`, height: '100%',
                      background: slaPct >= 90 ? 'var(--acc-emerald-grad)' : slaPct >= 75 ? 'var(--acc-amber-grad)' : 'var(--acc-coral-grad)',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <span className="mono" style={{ fontSize: 14, minWidth: 60, textAlign: 'right', fontWeight: 600 }}>{slaPct}%</span>
                </div>
                {an.sla.breaches.length > 0 && (
                  <>
                    <h4 style={{ margin: '18px 0 6px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', fontWeight: 600 }}>Top breaches</h4>
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
                            <td className="right mono" style={{ color: 'var(--acc-coral)', fontWeight: 700 }}>+{b.overBy}d</td>
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
            <div className="row" style={{ marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>Pipeline value <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>(active indents)</span></h3>
              <div className="grow" />
              <span className="muted" style={{ fontSize: 12 }}>Active: <strong style={{ color: 'var(--text)' }}>{s.adminActiveIndents}</strong></span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) 2fr', gap: 28, alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em', background: 'var(--acc-indigo-grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  <MoneyCompact amountMinor={s.adminTotalPipelineValueMinor} currency="PKR" precision={2} />
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Exact: <MoneyLabel amountMinor={s.adminTotalPipelineValueMinor} currency="PKR" /></div>
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Avg per active indent: <MoneyCompact amountMinor={s.adminAverageIndentValueMinor} currency="PKR" precision={1} /></div>
                {s.adminPriorityBreakdown.length > 0 && (
                  <div style={{ marginTop: 18 }}>
                    <div className="dim" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontWeight: 600 }}>By priority</div>
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
                <div className="dim" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontWeight: 600 }}>Top 5 by estimated value</div>
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
                            <div style={{
                              width: `${p.cumulativePct}%`, height: '100%',
                              background: p.cumulativePct > 80 ? 'var(--acc-coral-grad)' : p.cumulativePct > 50 ? 'var(--acc-amber-grad)' : 'var(--acc-sky-grad)',
                            }} />
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
                              background: c.decisions === 0 ? 'transparent' : `rgba(129, 140, 248, ${intensity})`,
                              padding: '10px',
                              borderRadius: c.decisions === 0 ? 0 : 'var(--radius-sm)',
                            }}>
                              {c.decisions === 0 ? (
                                <span className="muted">—</span>
                              ) : (
                                <>
                                  <div className="mono" style={{ fontWeight: 700 }}>{c.medianHours}<span className="muted" style={{ fontWeight: 400, fontSize: 11 }}> hr</span></div>
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
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
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
                        <td className="right mono" style={{ color: b.avgAgeDays > 14 ? 'var(--acc-coral)' : b.avgAgeDays > 7 ? 'var(--acc-amber)' : 'inherit', fontWeight: b.avgAgeDays > 7 ? 600 : 400 }}>{b.avgAgeDays} d</td>
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
                    style={{ gap: 8, border: '1px solid var(--border)', padding: '8px 14px', borderRadius: 999, textDecoration: 'none', color: 'inherit', background: 'var(--bg-chip)', transition: 'transform 0.1s ease, box-shadow 0.1s ease' }}>
                    <StatusPill tone={toneForIndentStatus(b.status)}>{b.status}</StatusPill>
                    <span className="mono" style={{ fontWeight: 600 }}>{b.count}</span>
                  </Link>
                ))}
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>Click any status to filter the Indents list.</div>
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
