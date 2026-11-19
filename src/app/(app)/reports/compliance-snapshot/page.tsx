import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { complianceSnapshot } from '@/interfaces/ui/views/ReportViews';

export const metadata = { title: 'Compliance Snapshot • Reports' };
export const dynamic = 'force-dynamic';

export default async function ComplianceSnapshotPage() {
  const ctx = await requireSessionCtx();
  if (ctx.firmId) redirect('/dashboard');
  const report = await complianceSnapshot();

  return (
    <>
      <div className="row" style={{ marginBottom: 6 }}><Link href="/reports" className="muted">← Reports</Link></div>
      <div className="row" style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Compliance Snapshot</h1>
        <div className="grow" />
        <a className="btn" href="/api/reports/compliance-snapshot/download?format=docx">Export .docx</a>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
        {report.cards.map((c) => (
          <div key={c.label} className="card" style={{ padding: 18 }}>
            <div className="muted" style={{ fontSize: 13 }}>{c.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, margin: '4px 0' }}>{c.count}</div>
            <div className="muted" style={{ fontSize: 12 }}>{c.note}</div>
          </div>
        ))}
      </section>

      <section className="card" style={{ padding: 0 }}>
        <h2 style={{ margin: 0, padding: '16px 20px 0' }}>By status</h2>
        <table className="table">
          <thead><tr><th>Area</th><th>Status</th><th className="right">Count</th></tr></thead>
          <tbody>
            {report.breakdown.map((r) => (
              <tr key={`${r.area}|${r.status}`}>
                <td>{r.area}</td><td>{r.status.replace(/_/g, ' ')}</td><td className="right mono">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
