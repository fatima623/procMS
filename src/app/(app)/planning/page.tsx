import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';

export const metadata = { title: 'Planning • Procurement' };
export const dynamic = 'force-dynamic';

const ICON = {
  plan:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2h6v4H9z"/><path d="M4 6h16v16H4z"/><path d="M8 12h8M8 16h5"/></svg>,
  tpl:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/></svg>,
  warn:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l10 18H2z"/><path d="M12 10v4"/><path d="M12 18h.01"/></svg>,
};

export default async function PlanningPage() {
  await requireRoles([Role.ADMIN, Role.DGDP, Role.SECY_DP, Role.DP_N, Role.COORD_STAFF]);
  const [plans, templates] = await Promise.all([
    prisma.annualProcurementPlan.count(),
    prisma.biddingDocumentTemplate.count({ where: { isActive: true } }),
  ]);
  return (
    <>
      <h1>Planning</h1>
      <p className="muted">Pre-award planning per PPRA Rules 8, 9 and 23(4): the Annual Procurement Plan, the splitting-detection view, and the Standard Bidding Document template library.</p>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 14 }}>
        <Link href="/planning/annual-plans" style={{ textDecoration: 'none', color: 'inherit' }}>
          <KpiCard accent="indigo" icon={ICON.plan} label="Annual plans" value={plans} sub="PPRA Rule 8" />
        </Link>
        <Link href="/planning/bidding-templates" style={{ textDecoration: 'none', color: 'inherit' }}>
          <KpiCard accent="emerald" icon={ICON.tpl} label="Active bidding templates" value={templates} sub="PPRA Rule 23(4)" />
        </Link>
        <Link href="/planning/splitting-check" style={{ textDecoration: 'none', color: 'inherit' }}>
          <KpiCard accent="amber" icon={ICON.warn} label="Splitting check" value="Open" sub="PPRA Rule 9 — detector" />
        </Link>
      </section>
    </>
  );
}
