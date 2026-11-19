import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import {
  filterQuery,
  indentPipeline,
  listReportFiscalYears,
  listReportSections,
  parseReportFilters,
} from '@/interfaces/ui/views/ReportViews';
import { BarChartCard } from '../_charts/BarChartCard';

export const metadata = { title: 'Indent Pipeline • Reports' };
export const dynamic = 'force-dynamic';

export default async function IndentPipelinePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireSessionCtx();
  if (ctx.firmId) redirect('/dashboard');
  const sp = await searchParams;
  const f = parseReportFilters((k) => sp[k]);
  const [report, fiscalYears, sections] = await Promise.all([indentPipeline(f), listReportFiscalYears(), listReportSections()]);
  const q = filterQuery(f);

  return (
    <>
      <div className="row" style={{ marginBottom: 6 }}><Link href="/reports" className="muted">← Reports</Link></div>
      <div className="row" style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Indent Pipeline</h1>
        <div className="grow" />
        <a className="btn" href={`/api/reports/indent-pipeline/download?format=docx${q ? `&${q}` : ''}`}>Export .docx</a>
      </div>

      <form method="get" className="row" style={{ gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="fiscalYearId">Fiscal year</label>
          <select id="fiscalYearId" name="fiscalYearId" className="select" defaultValue={f.fiscalYearId ?? ''} style={{ width: 160 }}>
            <option value="">All years</option>
            {fiscalYears.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="sectionId">Section</label>
          <select id="sectionId" name="sectionId" className="select" defaultValue={f.sectionId ?? ''} style={{ width: 260 }}>
            <option value="">All sections</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <button className="btn">Apply</button>
        {q && <Link className="btn" href="/reports/indent-pipeline">Clear</Link>}
      </form>

      <section className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Indents by status ({report.total})</h2>
        <BarChartCard
          ariaLabel="Bar chart of indent counts by status"
          data={report.rows.filter((r) => r.count > 0).map((r) => ({ status: r.status.replace(/_/g, ' '), Indents: r.count }))}
          categoryKey="status"
          series={[{ key: 'Indents', name: 'Indents' }]}
          layout="vertical"
        />
      </section>

      <section className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead><tr><th>Status</th><th className="right">Indents</th></tr></thead>
          <tbody>
            {report.rows.map((r) => (
              <tr key={r.status}><td>{r.status.replace(/_/g, ' ')}</td><td className="right mono">{r.count}</td></tr>
            ))}
            <tr><td><strong>Total</strong></td><td className="right mono"><strong>{report.total}</strong></td></tr>
          </tbody>
        </table>
      </section>
    </>
  );
}
