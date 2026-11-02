import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';

export const metadata = { title: 'Special cases • Procurement' };
export const dynamic = 'force-dynamic';

const ICON = {
  fms:      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18"/><circle cx="12" cy="12" r="9"/><path d="M12 3a15 15 0 010 18"/><path d="M12 3a15 15 0 000 18"/></svg>,
  box:      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>,
  gavel:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h12"/><path d="M14 7l3-3 5 5-3 3z"/><path d="M11 10l6 6"/></svg>,
};

export default async function SpecialHub() {
  await requireRoles([Role.ADMIN, Role.DP_N, Role.DGDP, Role.SECY_DP, Role.ADP_STAFF, Role.COORD_STAFF]);
  const [fms, disposals, appeals] = await Promise.all([
    prisma.fMSCase.count({ where: { status: { not: 'CLOSED' } } }),
    prisma.disposalCase.count({ where: { status: { not: 'COMPLETED' } } }),
    prisma.appeal.count({ where: { status: 'PENDING' } }),
  ]);
  return (
    <>
      <h1>Special cases</h1>
      <p className="muted">DPP&amp;I-35 Chapters XXIV, XXV, XXVIII — government-to-government procurements, disposal of surplus stores, and appeals beyond the GRC.</p>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 14 }}>
        <Link href="/special/fms" style={{ textDecoration: 'none', color: 'inherit' }}>
          <KpiCard accent="indigo" icon={ICON.fms} label="Open FMS cases" value={fms} sub="Ch XXIV — Foreign Military Sales" />
        </Link>
        <Link href="/special/disposals" style={{ textDecoration: 'none', color: 'inherit' }}>
          <KpiCard accent="emerald" icon={ICON.box} label="Open disposals" value={disposals} sub="Ch XXV — surplus stores" />
        </Link>
        <Link href="/special/appeals" style={{ textDecoration: 'none', color: 'inherit' }}>
          <KpiCard accent="coral" icon={ICON.gavel} label="Pending appeals" value={appeals} sub="Rule 50; Ch XXVIII" />
        </Link>
      </section>
    </>
  );
}
