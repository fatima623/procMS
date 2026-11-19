import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import {
  budgetUtilisation,
  filterQuery,
  listReportFiscalYears,
  parseReportFilters,
} from '@/interfaces/ui/views/ReportViews';
import { Empty } from '@/interfaces/ui/components/Empty';
import { BarChartCard } from '../_charts/BarChartCard';

export const metadata = { title: 'Budget Utilisation • Reports' };
export const dynamic = 'force-dynamic';

export default async function BudgetUtilisationPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireSessionCtx();
  if (ctx.firmId) redirect('/dashboard');
  const sp = await searchParams;
  const f = parseReportFilters((k) => sp[k]);
  const [report, fiscalYears] = await Promise.all([budgetUtilisation(f), listReportFiscalYears()]);
  const q = filterQuery(f);

  // Chart one currency only (mixing currencies on one axis would mislead); the table shows all.
  const chartCurrency = report.rows[0]?.currency;
  const chartRows = report.rows.filter((r) => r.currency === chartCurrency);
  const otherCurrencies = report.rows.some((r) => r.currency !== chartCurrency);

  return (
    <>
      <div className="row" style={{ marginBottom: 6 }}><Link href="/reports" className="muted">← Reports</Link></div>
      <div className="row" style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Budget Utilisation</h1>
        <div className="grow" />
        <a className="btn" href={`/api/reports/budget-utilisation/download?format=docx${q ? `&${q}` : ''}`}>Export .docx</a>
      </div>
      <p className="muted">Fiscal year: <strong>{report.fiscalYearLabel}</strong> (defaults to the active year). % spent = spent ÷ allocated.</p>

      <form method="get" className="row" style={{ gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="fiscalYearId">Fiscal year</label>
          <select id="fiscalYearId" name="fiscalYearId" className="select" defaultValue={f.fiscalYearId ?? ''} style={{ width: 200 }}>
            <option value="">Active year</option>
            {fiscalYears.map((y) => <option key={y.id} value={y.id}>{y.label}{y.isActive ? ' (active)' : ''}</option>)}
            <option value="all">All years</option>
          </select>
        </div>
        <button className="btn">Apply</button>
        {q && <Link className="btn" href="/reports/budget-utilisation">Clear</Link>}
      </form>

      {report.rows.length === 0 ? (
        <Empty>No budget allocations for this fiscal year.</Empty>
      ) : (
        <>
          <section className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h2 style={{ marginTop: 0 }}>Allocated vs reserved vs spent ({chartCurrency})</h2>
            {otherCurrencies && <p className="muted" style={{ marginTop: 0 }}>Chart shows {chartCurrency} heads only; other currencies are in the table.</p>}
            <BarChartCard
              ariaLabel={`Grouped bar chart of allocated, reserved and spent per budget head, in ${chartCurrency}`}
              data={chartRows.map((r) => ({ head: r.code, Allocated: r.chart.allocated, Reserved: r.chart.reserved, Spent: r.chart.spent }))}
              categoryKey="head"
              series={[{ key: 'Allocated', name: 'Allocated' }, { key: 'Reserved', name: 'Reserved' }, { key: 'Spent', name: 'Spent' }]}
              layout="vertical"
              money
            />
          </section>

          <section className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Budget head</th><th>Description</th><th>Currency</th>
                  <th className="right">Allocated</th><th className="right">Reserved</th><th className="right">Spent</th><th className="right">% spent</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={`${r.code}|${r.currency}`}>
                    <td className="mono">{r.code}</td><td>{r.description}</td><td className="mono">{r.currency}</td>
                    <td className="right mono">{r.allocated}</td><td className="right mono">{r.reserved}</td>
                    <td className="right mono">{r.spent}</td><td className="right mono">{r.percentSpent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </>
  );
}
