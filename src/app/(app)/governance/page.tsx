import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';

export const metadata = { title: 'Governance • Procurement' };
export const dynamic = 'force-dynamic';

const ICON = {
  committee: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><circle cx="17" cy="10" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/></svg>,
  doc:       <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/></svg>,
};

export default async function GovernancePage() {
  await requireRoles([Role.ADMIN, Role.DGDP, Role.SECY_DP, Role.DP_N, Role.ADP_STAFF, Role.COORD_STAFF]);
  const [committees, pendingAmendments] = await Promise.all([
    prisma.committee.count({ where: { isActive: true } }),
    prisma.contractAmendment.count({ where: { status: 'PROPOSED' } }),
  ]);
  const tiles = [
    { href: '/governance/committees', label: 'Committees', count: committees, icon: ICON.committee, sub: 'GRC, TEC, FEC — PPRA Rule 48' },
    { href: '/governance/contract-amendments', label: 'Contract amendments', count: pendingAmendments, icon: ICON.doc, sub: 'DPP&I-35 Chapter XXI (PROPOSED only)' },
  ];
  return (
    <>
      <h1>Governance</h1>
      <p className="muted">Standing bodies and formal amendments: the Grievance Redressal Committee that decides pre-award complaints, and the amendments that move a signed contract's terms after award.</p>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 14 }}>
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <KpiCard accent="indigo" icon={t.icon} label={t.label} value={t.count} sub={t.sub} />
          </Link>
        ))}
      </section>
    </>
  );
}
