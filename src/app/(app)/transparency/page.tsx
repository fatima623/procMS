import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';

export const metadata = { title: 'Transparency • Procurement' };
export const dynamic = 'force-dynamic';

const ICON = {
  warn:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l10 18H2z"/><path d="M12 10v4"/><path d="M12 18h.01"/></svg>,
  lock:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 118 0v4"/></svg>,
  eye:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>,
};

export default async function TransparencyPage() {
  await requireRoles([Role.ADMIN, Role.DGDP, Role.SECY_DP, Role.DP_N]);
  const [openIncidents, activeHolds, awardedContracts] = await Promise.all([
    prisma.misprocurementIncident.count({ where: { status: 'OPEN' } }),
    prisma.retentionHold.count({ where: { releasedOn: null } }),
    prisma.contract.count(),
  ]);
  return (
    <>
      <h1>Transparency</h1>
      <p className="muted">PPRA Rules 46, 47, 50 — the mis-procurement register, the retention-hold log, and the public-award interface.</p>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 14 }}>
        <Link href="/transparency/incidents" style={{ textDecoration: 'none', color: 'inherit' }}>
          <KpiCard accent="coral" icon={ICON.warn} label="Open incidents" value={openIncidents} sub="Mis-procurement — Rule 50" />
        </Link>
        <Link href="/transparency/retention-holds" style={{ textDecoration: 'none', color: 'inherit' }}>
          <KpiCard accent="amber" icon={ICON.lock} label="Active retention holds" value={activeHolds} sub="Rule 46 — 5-year retention + holds" />
        </Link>
        <Link href="/transparency/awards" style={{ textDecoration: 'none', color: 'inherit' }}>
          <KpiCard accent="emerald" icon={ICON.eye} label="Awarded contracts (public)" value={awardedContracts} sub="Rule 47 — public access" />
        </Link>
      </section>

      <div className="card" style={{ padding: 16, marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>Public award endpoint</h3>
        <p className="muted" style={{ marginBottom: 8 }}>Each awarded indent is served, unauthenticated, as JSON at:</p>
        <pre className="mono" style={{ padding: 10, background: 'var(--card-muted-bg, #f6f8fa)', borderRadius: 6 }}>
          GET /api/public/awards/&lt;indentId&gt;
        </pre>
        <p className="muted" style={{ marginBottom: 0 }}>Returned data: subject, estimated value, advertisement timeline, CST line summary (firm names + prices + rank + recommended-for-award flag), and the signed contract (contract #, firm, value, awarded/signed dates). No user identifiers beyond firm name.</p>
      </div>
    </>
  );
}
