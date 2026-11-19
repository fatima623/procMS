import Link from 'next/link';
import { requireRoles } from '@/interfaces/ui/auth';
import { LEGAL_ROLES } from '@/infrastructure/legal/CourtCaseService';
import { listCourtCases } from '@/interfaces/ui/views/CourtCaseViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill, type PillTone } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Court cases • Procurement' };
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, PillTone> = { PENDING: 'warn', CLOSED: 'default', DISPOSED_OFF: 'ok' };

export default async function CourtCasesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireRoles(LEGAL_ROLES);
  const sp = await searchParams;
  const rows = await listCourtCases({ status: sp.status, q: sp.q });
  const filtered = !!(sp.status || sp.q);

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Court cases</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/legal/court-cases/new">+ New court case</Link>
      </div>
      <p className="muted">Litigation tracked by the Legal Section, with the court proceeding history of each case.</p>

      <form method="get" className="row" style={{ gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="statusFilter">Status</label>
          <select id="statusFilter" name="status" className="select" defaultValue={sp.status ?? ''} style={{ width: 170 }}>
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CLOSED">Closed</option>
            <option value="DISPOSED_OFF">Disposed off</option>
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="qFilter">Search case no., court or party</label>
          <input id="qFilter" className="input" name="q" defaultValue={sp.q ?? ''} style={{ width: 280 }} />
        </div>
        <button className="btn">Filter</button>
        {filtered && <Link className="btn" href="/legal/court-cases">Clear</Link>}
      </form>

      {rows.length === 0 ? (
        <Empty>No court cases{filtered ? ' for this filter' : ''}.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Case no.</th>
                <th>Court</th>
                <th>Party</th>
                <th>Counter-party</th>
                <th>Filed on</th>
                <th>Status</th>
                <th>Next hearing</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono"><Link href={`/legal/court-cases/${r.id}`}>{r.caseNumber}</Link></td>
                  <td>{r.court}</td>
                  <td>{r.party}</td>
                  <td>{r.counterParty}</td>
                  <td><DateLabel iso={r.filedOn} /></td>
                  <td><StatusPill tone={STATUS_TONE[r.status] ?? 'default'}>{r.status}</StatusPill></td>
                  <td><DateLabel iso={r.nextHearingDate} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
