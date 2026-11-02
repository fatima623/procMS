import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { planningReports } from '@/infrastructure/planning/PlanningService';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Splitting check • Procurement' };
export const dynamic = 'force-dynamic';

export default async function SplittingCheckPage({ searchParams }: { searchParams: { days?: string } }) {
  await requireRoles([Role.ADMIN, Role.DGDP, Role.SECY_DP, Role.DP_N, Role.COORD_STAFF]);
  const withinDays = Math.max(7, Math.min(365, Number(searchParams.days ?? '60') || 60));
  const suspicions = await planningReports.findSplittingSuspicions(withinDays);
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Splitting check</h1>
        <div className="grow" />
        <form method="get" className="row" style={{ gap: 8 }}>
          <label htmlFor="days" className="muted" style={{ alignSelf: 'center' }}>Window (days):</label>
          <input id="days" name="days" className="input" type="number" min={7} max={365} defaultValue={withinDays} style={{ width: 100 }} />
          <button className="btn" type="submit">Refresh</button>
        </form>
      </div>
      <p className="muted">
        PPRA Rule 9 — the Authority forbids splitting a procurement to evade a method threshold. This view groups recent indents by indenter + budget head + fiscal year
        and flags groups whose individual values stay below the RFQ ceiling (PKR 500,000) but whose sum crosses either the RFQ ceiling or the open-bidding threshold (PKR 3,000,000).
      </p>

      {suspicions.length === 0 ? (
        <Empty>No suspicious splitting patterns in the last {withinDays} days.</Empty>
      ) : (
        <div className="stack-md">
          {suspicions.map((s, idx) => (
            <div key={idx} className="card" style={{ padding: 16 }}>
              <div className="row" style={{ marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Group {idx + 1}</h3>
                <StatusPill tone="warn">⚠ possible split</StatusPill>
                <div className="grow" />
                <span className="muted">Combined: <MoneyLabel amountMinor={s.totalMinor} currency="PKR" /></span>
              </div>
              <dl className="muted" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', margin: 0 }}>
                <dt>Indenter</dt><dd className="mono">{s.indenterId}</dd>
                <dt>Budget head</dt><dd className="mono">{s.budgetHeadId}</dd>
                <dt>Fiscal year</dt><dd className="mono">{s.fiscalYearId}</dd>
              </dl>
              <table className="table" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>Indent #</th>
                    <th>Subject</th>
                    <th className="right">Estimated value</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {s.indents.map((i) => (
                    <tr key={i.id}>
                      <td className="mono"><Link href={`/indents/${i.id}`}>{i.indentNumber}</Link></td>
                      <td>{i.subject}</td>
                      <td className="right"><MoneyLabel amountMinor={i.estimatedValueMinor} currency="PKR" /></td>
                      <td><DateLabel iso={i.submittedAt} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
