import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';

export const metadata = { title: 'Execution • Procurement' };
export const dynamic = 'force-dynamic';

const ICON = {
  mega:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11v2l12 5V6l-12 5z"/><path d="M15 8v8"/><path d="M19 10v4"/></svg>,
  doc:     <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/></svg>,
  shield:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>,
  wallet:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h3"/><path d="M3 10h18"/></svg>,
  bank:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l9-6 9 6"/><path d="M4 10v10h16V10"/><path d="M9 20V12M15 20V12"/></svg>,
  lc:      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/><path d="M8 15h8"/></svg>,
};

export default async function ExecutionHubPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const [adCount, contractCount, guaranteeCount, invoiceCount, paymentCount, lcCount, lcAmendCount, dpExtCount, ldCount, inspectionCount] = await Promise.all([
    prisma.advertisement.count(),
    prisma.contract.count(),
    prisma.guarantee.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.letterOfCredit.count(),
    prisma.lCAmendment.count(),
    prisma.deliveryPeriodExtension.count(),
    prisma.liquidatedDamages.count(),
    prisma.inspection.count(),
  ]);

  const tiles: { href: string; label: string; count: number; icon: JSX.Element; sub: string }[] = [
    { href: '/execution/advertisements',      label: 'Advertisements',   count: adCount,         icon: ICON.mega,   sub: 'PPRA Rule 12 publications' },
    { href: '/execution/contracts',           label: 'Contracts',        count: contractCount,   icon: ICON.doc,    sub: 'DPP&I-35 Chapter XII' },
    { href: '/execution/guarantees',          label: 'Bank guarantees',  count: guaranteeCount,  icon: ICON.shield, sub: 'Chapter XV: PBG, APG, bid security' },
    { href: '/execution/dp-extensions',       label: 'DP extensions',    count: dpExtCount,      icon: ICON.doc,    sub: 'Chapter XIII — delivery period' },
    { href: '/execution/liquidated-damages',  label: 'Liquidated damages', count: ldCount,       icon: ICON.wallet, sub: 'Chapter XIII — 2% / month, 10% cap' },
    { href: '/execution/inspections',         label: 'Inspections',      count: inspectionCount, icon: ICON.doc,    sub: 'Chapter XVI — gates Taking-Over' },
    { href: '/execution/invoices',            label: 'Invoices',         count: invoiceCount,    icon: ICON.doc,    sub: 'Running bills & invoices' },
    { href: '/execution/payments',            label: 'Payments',         count: paymentCount,    icon: ICON.wallet, sub: 'Payment releases' },
    { href: '/execution/lcs',                 label: 'Letters of Credit',count: lcCount,         icon: ICON.lc,     sub: 'Chapter XIV: imports' },
    { href: '/execution/lc-amendments',       label: 'LC amendments',    count: lcAmendCount,    icon: ICON.lc,     sub: 'LC extensions / changes' },
  ];

  return (
    <>
      <h1>Execution</h1>
      <p className="muted">
        Post-award records: what actually happened after the Purchase Requisition.
        These rows are the evidence the ZeroLink compliance engine evaluates against
        PPRA Rules and DPP&amp;I-35 Chapters XII–XXI.
      </p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 14, marginBottom: 20 }}>
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <KpiCard accent="indigo" icon={t.icon} label={t.label} value={t.count} sub={t.sub} />
          </Link>
        ))}
      </section>

      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>How this maps to the two-stage workflow</h3>
        <p className="muted" style={{ marginBottom: 8 }}>
          The procurement cycle has two halves:
        </p>
        <ol style={{ paddingLeft: 20 }}>
          <li><strong>Pre-award (planning):</strong> Indent → Approvals → IT Proforma → Technical Offers → TSR → Commercial Offers → CST → Purchase Requisition. Everything above.</li>
          <li><strong>Post-award (execution):</strong> Advertisement → Contract → Guarantees → LC (if import) → Invoices → Payments. Everything here.</li>
        </ol>
        <p className="muted" style={{ marginBottom: 0 }}>
          Each execution record references a Contract (except Advertisement, which references the Indent, and LC Amendment, which references an LC).
        </p>
      </div>
    </>
  );
}
