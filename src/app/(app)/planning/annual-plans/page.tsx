import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listAnnualPlans } from '@/interfaces/ui/views/PlanningViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { PublishPlanButton } from './PublishPlanButton';

export const metadata = { title: 'Annual plans • Procurement' };
export const dynamic = 'force-dynamic';

export default async function AnnualPlansPage() {
  await requireRoles([Role.ADMIN, Role.DGDP, Role.SECY_DP, Role.DP_N, Role.COORD_STAFF]);
  const rows = await listAnnualPlans();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Annual procurement plans</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/planning/annual-plans/new">+ New draft plan</Link>
      </div>
      <p className="muted">PPRA Rule 8 — each procuring agency publishes an annual plan listing intended procurements for the fiscal year. One PUBLISHED plan per FY; publishing a new one supersedes the previous.</p>

      {rows.length === 0 ? (
        <Empty>No annual plans created yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Fiscal year</th>
                <th>Status</th>
                <th className="right">Items</th>
                <th className="right">Total estimate</th>
                <th>Published</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.fiscalYearLabel}</td>
                  <td><StatusPill tone={r.status === 'PUBLISHED' ? 'ok' : r.status === 'SUPERSEDED' ? 'warn' : 'info'}>{r.status}</StatusPill></td>
                  <td className="right mono">{r.itemCount}</td>
                  <td className="right">
                    {r.totalEstimateMinor
                      ? <MoneyLabel amountMinor={r.totalEstimateMinor} currency={r.currency} />
                      : <span className="muted">—</span>}
                  </td>
                  <td><DateLabel iso={r.publishedOn} /></td>
                  <td className="right">
                    {r.status === 'DRAFT' && <PublishPlanButton id={r.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
