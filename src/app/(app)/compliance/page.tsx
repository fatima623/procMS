import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import {
  countActiveBlacklists,
  countPendingGrievances,
} from '@/interfaces/ui/views/ComplianceViews';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';

export const metadata = { title: 'Compliance • Procurement' };
export const dynamic = 'force-dynamic';

const ICON = {
  ban:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M5 5l14 14"/></svg>,
  pact:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/><path d="M9 15h6"/></svg>,
  gavel:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h12"/><path d="M14 7l3-3 5 5-3 3z"/><path d="M11 10l6 6"/><path d="M5 17l5-5"/></svg>,
};

export default async function CompliancePage() {
  await requireRoles([Role.ADMIN, Role.DGDP, Role.SECY_DP, Role.DP_N, Role.ADP_STAFF, Role.COORD_STAFF]);
  const [activeBlacklists, pendingGrievances, pacts] = await Promise.all([
    countActiveBlacklists(),
    countPendingGrievances(),
    prisma.integrityPact.count(),
  ]);

  const tiles = [
    {
      href: '/compliance/blacklists',
      label: 'Blacklists',
      count: activeBlacklists,
      icon: ICON.ban,
      sub: 'PPRA Rule 19 — active bans only',
    },
    {
      href: '/compliance/integrity-pacts',
      label: 'Integrity pacts',
      count: pacts,
      icon: ICON.pact,
      sub: 'PPRA Rule 7 — required > PKR 10M',
    },
    {
      href: '/compliance/grievances',
      label: 'Grievances',
      count: pendingGrievances,
      icon: ICON.gavel,
      sub: 'PPRA Rules 48 / 50 — pending only',
    },
  ];

  return (
    <>
      <h1>Compliance controls</h1>
      <p className="muted">
        Three cross-cutting controls that guard workflow transitions: a <strong>blacklisted</strong>{' '}
        firm cannot win an award, an indent &gt; PKR 10 M needs an <strong>Integrity Pact</strong>{' '}
        before issuing the PR, and no award proceeds while a <strong>grievance</strong> is pending.
      </p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 14, marginBottom: 20 }}>
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <KpiCard accent="indigo" icon={t.icon} label={t.label} value={t.count} sub={t.sub} />
          </Link>
        ))}
      </section>

      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>How these guards fire</h3>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li><strong>Blacklist</strong>: issuing a PR to a blacklisted firm, or any contract award, is refused by the API with a 400.</li>
          <li><strong>Integrity Pact</strong>: PR issue for an indent whose estimated value exceeds PKR 10 M is refused unless a signed pact exists for that firm.</li>
          <li><strong>Grievance</strong>: as long as a <em>pre-award</em> grievance is <code>PENDING</code> or <code>APPEALED</code> on the indent, PR issue (and later contract award) is refused.</li>
        </ul>
      </div>
    </>
  );
}
