import Link from 'next/link';
import type { CompliancePosture } from '@/interfaces/ui/views/CompliancePostureView';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';

interface Tile {
  readonly href: string;
  readonly label: string;
  readonly value: number;
  readonly tone: 'ok' | 'warn' | 'danger' | 'info';
  readonly sub: string;
}

/**
 * Admin compliance posture panel — one row per guard surface, each a link
 * into the admin page that owns it. The tone is derived at render time:
 * zero → ok (green), 1+ → warn/danger depending on the rule.
 */
export function CompliancePosturePanel({ posture }: { readonly posture: CompliancePosture }) {
  const tiles: Tile[] = [
    { href: '/compliance/blacklists',       label: 'Active blacklists',           value: posture.activeBlacklists,           tone: posture.activeBlacklists > 0 ? 'danger' : 'ok',  sub: 'PPRA Rule 19' },
    { href: '/compliance/grievances',       label: 'Pending grievances',          value: posture.pendingGrievances,          tone: posture.pendingGrievances > 0 ? 'warn' : 'ok',   sub: 'PPRA Rule 48 — decide ≤ 10 wd' },
    { href: '/compliance/grievances',       label: 'Appealed grievances',         value: posture.appealedGrievances,         tone: posture.appealedGrievances > 0 ? 'warn' : 'ok',  sub: 'Blocks award until decided' },
    { href: '/special/appeals',             label: 'Pending appeals',             value: posture.pendingAppeals,             tone: posture.pendingAppeals > 0 ? 'warn' : 'ok',      sub: 'PPRA Rule 50 tier-2' },
    { href: '/transparency/incidents',      label: 'Open incidents',              value: posture.openIncidents,              tone: posture.criticalIncidents > 0 ? 'danger' : posture.openIncidents > 0 ? 'warn' : 'ok', sub: `${posture.criticalIncidents} HIGH/CRITICAL` },
    { href: '/transparency/retention-holds',label: 'Active retention holds',      value: posture.activeHolds,                tone: posture.activeHolds > 0 ? 'info' : 'ok',         sub: 'PPRA Rule 46' },
    { href: '/compliance/integrity-pacts',  label: 'Pacts awaiting signature',    value: posture.pactsAwaitingCounterSign,   tone: posture.pactsAwaitingCounterSign > 0 ? 'warn' : 'ok', sub: 'PPRA Rule 7' },
    { href: '/commercial-offers/overdue-validity', label: 'Expired bid validity', value: posture.expiredBidValidity,         tone: posture.expiredBidValidity > 0 ? 'warn' : 'ok',  sub: 'PPRA Rule 26' },
    { href: '/frameworks/risk-purchases',   label: 'Open risk cases',             value: posture.openRiskPurchases,          tone: posture.openRiskPurchases > 0 ? 'warn' : 'ok',   sub: 'DPP&I-35 Ch XXII' },
    { href: '/execution/inspections',       label: 'Open discrepancies',          value: posture.discrepanciesOpen,          tone: posture.discrepanciesOpen > 0 ? 'warn' : 'ok',   sub: 'Blocks Taking-Over' },
    { href: '/execution/agent-commissions', label: 'Commissions awaiting OK',     value: posture.agentCommissionsAwaitingApproval, tone: posture.agentCommissionsAwaitingApproval > 0 ? 'info' : 'ok', sub: 'DPP&I-35 Ch XX' },
    { href: '/execution/guarantees',        label: 'Guarantees expiring (30d)',   value: posture.guaranteesExpiringSoon,     tone: posture.guaranteesExpiringSoon > 0 ? 'warn' : 'ok', sub: 'Bank guarantees' },
    { href: '/execution/insurances',        label: 'Insurance expiring (30d)',    value: posture.insurancesExpiringSoon,     tone: posture.insurancesExpiringSoon > 0 ? 'warn' : 'ok', sub: 'DPP&I-35 Ch XVII' },
    { href: '/special/fms',                 label: 'FMS awaiting acceptance',     value: posture.pendingFMSAcceptance,       tone: posture.pendingFMSAcceptance > 0 ? 'info' : 'ok', sub: 'DPP&I-35 Ch XXIV' },
  ];

  // Count the attention-needing rows for the panel header
  const attention = tiles.filter((t) => t.tone === 'warn' || t.tone === 'danger').length;

  return (
    <div className="card" style={{ padding: 16, marginTop: 20 }}>
      <div className="row" style={{ alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Compliance posture</h2>
        <div style={{ marginLeft: 10 }}>
          <StatusPill tone={attention === 0 ? 'ok' : attention <= 3 ? 'warn' : 'danger'}>
            {attention === 0 ? 'All clear' : `${attention} needing attention`}
          </StatusPill>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        {tiles.map((t) => (
          <Link key={t.href + t.label} href={t.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card" style={{ padding: 12, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{t.label}</div>
                <StatusPill tone={t.tone}>{t.value}</StatusPill>
              </div>
              <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{t.sub}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
