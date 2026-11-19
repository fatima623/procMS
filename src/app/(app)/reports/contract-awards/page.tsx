import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import {
  contractAwards,
  filterQuery,
  listReportFirms,
  listReportFiscalYears,
  parseReportFilters,
} from '@/interfaces/ui/views/ReportViews';
import { Empty } from '@/interfaces/ui/components/Empty';
import { BarChartCard } from '../_charts/BarChartCard';

export const metadata = { title: 'Contract Awards • Reports' };
export const dynamic = 'force-dynamic';

export default async function ContractAwardsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireSessionCtx();
  if (ctx.firmId) redirect('/dashboard');
  const sp = await searchParams;
  const f = parseReportFilters((k) => sp[k]);
  const [report, fiscalYears, firms] = await Promise.all([contractAwards(f), listReportFiscalYears(), listReportFirms()]);
  const q = filterQuery(f);

  return (
    <>
      <div className="row" style={{ marginBottom: 6 }}><Link href="/reports" className="muted">← Reports</Link></div>
      <div className="row" style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Contract Awards</h1>
        <div className="grow" />
        <a className="btn" href={`/api/reports/contract-awards/download?format=docx${q ? `&${q}` : ''}`}>Export .docx</a>
      </div>
      <p className="muted">Month = award date, or sign date when no award date is recorded. Fiscal year = the contract&apos;s indent fiscal year. Totals are per currency.</p>

      <form method="get" className="row" style={{ gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="fiscalYearId">Fiscal year</label>
          <select id="fiscalYearId" name="fiscalYearId" className="select" defaultValue={f.fiscalYearId ?? ''} style={{ width: 160 }}>
            <option value="">All years</option>
            {fiscalYears.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="firmId">Firm</label>
          <select id="firmId" name="firmId" className="select" defaultValue={f.firmId ?? ''} style={{ width: 260 }}>
            <option value="">All firms</option>
            {firms.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </div>
        <button className="btn">Apply</button>
        {q && <Link className="btn" href="/reports/contract-awards">Clear</Link>}
      </form>

      {report.byMonth.length === 0 ? (
        <Empty>No contracts for this filter.</Empty>
      ) : (
        <>
          <section className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h2 style={{ marginTop: 0 }}>Contracts per month</h2>
            <BarChartCard
              ariaLabel="Bar chart of contracts awarded per month"
              data={report.monthCounts.map((m) => ({ month: m.month, Contracts: m.count }))}
              categoryKey="month"
              series={[{ key: 'Contracts', name: 'Contracts' }]}
            />
          </section>

          <section className="card" style={{ padding: 0, marginBottom: 16 }}>
            <table className="table">
              <thead><tr><th>Month</th><th>Currency</th><th className="right">Contracts</th><th className="right">Total value</th></tr></thead>
              <tbody>
                {report.byMonth.map((r) => (
                  <tr key={`${r.monthKey}|${r.currency}`}>
                    <td>{r.month}</td><td className="mono">{r.currency}</td>
                    <td className="right mono">{r.count}</td><td className="right mono">{r.total}</td>
                  </tr>
                ))}
                {report.totals.map((t) => (
                  <tr key={`total-${t.currency}`}>
                    <td><strong>Total</strong></td><td className="mono"><strong>{t.currency}</strong></td>
                    <td className="right mono"><strong>{t.count}</strong></td><td className="right mono"><strong>{t.total}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card" style={{ padding: 0 }}>
            <h2 style={{ margin: 0, padding: '16px 20px 0' }}>By firm</h2>
            <table className="table">
              <thead><tr><th>Firm</th><th>Currency</th><th className="right">Contracts</th><th className="right">Total value</th></tr></thead>
              <tbody>
                {report.byFirm.map((r) => (
                  <tr key={`${r.firmName}|${r.currency}`}>
                    <td>{r.firmName}</td><td className="mono">{r.currency}</td>
                    <td className="right mono">{r.count}</td><td className="right mono">{r.total}</td>
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
