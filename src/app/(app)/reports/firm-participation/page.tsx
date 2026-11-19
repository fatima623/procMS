import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import {
  filterQuery,
  firmParticipation,
  listReportFiscalYears,
  parseReportFilters,
} from '@/interfaces/ui/views/ReportViews';
import { Empty } from '@/interfaces/ui/components/Empty';
import { BarChartCard } from '../_charts/BarChartCard';

export const metadata = { title: 'Firm Participation • Reports' };
export const dynamic = 'force-dynamic';

const CHART_TOP = 15;

export default async function FirmParticipationPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireSessionCtx();
  if (ctx.firmId) redirect('/dashboard');
  const sp = await searchParams;
  const f = parseReportFilters((k) => sp[k]);
  const [report, fiscalYears] = await Promise.all([firmParticipation(f), listReportFiscalYears()]);
  const q = filterQuery(f);

  return (
    <>
      <div className="row" style={{ marginBottom: 6 }}><Link href="/reports" className="muted">← Reports</Link></div>
      <div className="row" style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Firm Participation</h1>
        <div className="grow" />
        <a className="btn" href={`/api/reports/firm-participation/download?format=docx${q ? `&${q}` : ''}`}>Export .docx</a>
      </div>
      <p className="muted">Fiscal year = the indent fiscal year of the IT Proforma (invites, offers) or of the contract.</p>

      <form method="get" className="row" style={{ gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="fiscalYearId">Fiscal year</label>
          <select id="fiscalYearId" name="fiscalYearId" className="select" defaultValue={f.fiscalYearId ?? ''} style={{ width: 160 }}>
            <option value="">All years</option>
            {fiscalYears.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
          </select>
        </div>
        <button className="btn">Apply</button>
        {q && <Link className="btn" href="/reports/firm-participation">Clear</Link>}
      </form>

      {report.rows.length === 0 ? (
        <Empty>No firm activity for this filter.</Empty>
      ) : (
        <>
          <section className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h2 style={{ marginTop: 0 }}>Top {Math.min(CHART_TOP, report.rows.length)} firms by ITs invited</h2>
            <BarChartCard
              ariaLabel="Grouped bar chart per firm of ITs invited, technical offers and contracts awarded"
              data={report.rows.slice(0, CHART_TOP).map((r) => ({ firm: r.firmName, Invited: r.invited, Offers: r.offers, Contracts: r.contracts }))}
              categoryKey="firm"
              series={[{ key: 'Invited', name: 'ITs invited' }, { key: 'Offers', name: 'Technical offers' }, { key: 'Contracts', name: 'Contracts awarded' }]}
              layout="vertical"
            />
          </section>

          <section className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead><tr><th>Firm</th><th className="right">ITs invited</th><th className="right">Technical offers</th><th className="right">Contracts awarded</th></tr></thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.firmName}>
                    <td>{r.firmName}</td><td className="right mono">{r.invited}</td>
                    <td className="right mono">{r.offers}</td><td className="right mono">{r.contracts}</td>
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
