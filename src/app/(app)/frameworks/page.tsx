import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';

export const metadata = { title: 'Frameworks & risk purchase • Procurement' };
export const dynamic = 'force-dynamic';

const ICON = {
  frame: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16"/><path d="M3 10h18"/></svg>,
  cart:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="2"/><circle cx="18" cy="20" r="2"/><path d="M3 3h3l2 12h11l2-9H6"/></svg>,
  warn:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l10 18H2z"/><path d="M12 10v4"/><path d="M12 18h.01"/></svg>,
};

export default async function FrameworksHub() {
  await requireRoles([Role.ADMIN, Role.DP_N, Role.DGDP, Role.ADP_STAFF, Role.COORD_STAFF]);
  const [frameworks, callOffs, riskPurchases] = await Promise.all([
    prisma.frameworkAgreement.count({ where: { status: 'ACTIVE' } }),
    prisma.callOffOrder.count({ where: { status: 'PLACED' } }),
    prisma.riskPurchaseCase.count({ where: { status: { not: 'CLOSED' } } }),
  ]);
  return (
    <>
      <h1>Frameworks &amp; risk purchase</h1>
      <p className="muted">DPP&amp;I-35 Ch XXII &amp; XXIII (PPRA Rule 16A): framework agreements let repeat purchases be placed as call-offs without a fresh IT; risk-purchase cases track defaulter re-tenders.</p>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 14 }}>
        <Link href="/frameworks/agreements" style={{ textDecoration: 'none', color: 'inherit' }}>
          <KpiCard accent="indigo" icon={ICON.frame} label="Active frameworks" value={frameworks} sub="Ch XXIII — framework agreements" />
        </Link>
        <Link href="/frameworks/call-offs" style={{ textDecoration: 'none', color: 'inherit' }}>
          <KpiCard accent="emerald" icon={ICON.cart} label="Open call-offs" value={callOffs} sub="Call-offs still PLACED" />
        </Link>
        <Link href="/frameworks/risk-purchases" style={{ textDecoration: 'none', color: 'inherit' }}>
          <KpiCard accent="coral" icon={ICON.warn} label="Open risk cases" value={riskPurchases} sub="Ch XXII — supplier default re-tender" />
        </Link>
      </section>
    </>
  );
}
