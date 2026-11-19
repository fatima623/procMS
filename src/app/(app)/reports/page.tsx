import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSessionCtx } from '@/interfaces/ui/auth';

export const metadata = { title: 'Reports • Procurement' };
export const dynamic = 'force-dynamic';

const REPORTS = [
  { href: '/reports/indent-pipeline', title: 'Indent Pipeline', text: 'Current status distribution of all indents, by fiscal year and section.' },
  { href: '/reports/contract-awards', title: 'Contract Awards', text: 'Contracts awarded per month and per firm, with total value.' },
  { href: '/reports/compliance-snapshot', title: 'Compliance Snapshot', text: 'Open grievances, appeals, active blacklists and misprocurement incidents.' },
  { href: '/reports/budget-utilisation', title: 'Budget Utilisation', text: 'Per budget head: allocated vs reserved vs spent.' },
  { href: '/reports/firm-participation', title: 'Firm Participation', text: 'Per firm: ITs invited vs technical offers vs contracts awarded.' },
];

export default async function ReportsIndexPage() {
  const ctx = await requireSessionCtx();
  if (ctx.firmId) redirect('/dashboard');
  return (
    <>
      <h1>Reports</h1>
      <p className="muted">Phase 1 — pre-built, read-only reports. Each can be exported to Word (.docx).</p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {REPORTS.map((r) => (
          <Link key={r.href} href={r.href} className="card" style={{ padding: 18, display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <h3 style={{ marginTop: 0 }}>{r.title}</h3>
            <p className="muted" style={{ margin: 0 }}>{r.text}</p>
          </Link>
        ))}
        {[6, 7, 8, 9, 10].map((n) => (
          <div key={n} className="card" aria-disabled="true" style={{ padding: 18, opacity: 0.55, borderStyle: 'dashed' }}>
            <h3 style={{ marginTop: 0 }}>Report {n}</h3>
            <p className="muted" style={{ margin: 0 }}>Phase 2 — awaiting Q12 answer</p>
          </div>
        ))}
      </section>
    </>
  );
}
