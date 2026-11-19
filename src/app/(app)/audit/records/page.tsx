import Link from 'next/link';
import { requireRoles } from '@/interfaces/ui/auth';
import { AUDIT_ROLES } from '@/infrastructure/audit/AuditService';
import { listAuditRecords, listFiscalYearOptions } from '@/interfaces/ui/views/AuditRecordViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill, type PillTone } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Audit records • Procurement' };
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, PillTone> = { OPEN: 'info', CLOSED: 'default', SETTLED: 'ok' };

export default async function AuditRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; fiscalYearId?: string; q?: string }>;
}) {
  await requireRoles(AUDIT_ROLES);
  const sp = await searchParams;
  const [rows, fiscalYears] = await Promise.all([
    listAuditRecords({ status: sp.status, fiscalYearId: sp.fiscalYearId, q: sp.q }),
    listFiscalYearOptions(),
  ]);
  const filtered = !!(sp.status || sp.fiscalYearId || sp.q);

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Audit records</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/audit/records/new">+ New audit record</Link>
      </div>
      <p className="muted">Audit Section records with their objection lists, items and draft paras.</p>

      <form method="get" className="row" style={{ gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="statusFilter">Status</label>
          <select id="statusFilter" name="status" className="select" defaultValue={sp.status ?? ''} style={{ width: 160 }}>
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
            <option value="SETTLED">Settled</option>
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="fyFilter">Fiscal year</label>
          <select id="fyFilter" name="fiscalYearId" className="select" defaultValue={sp.fiscalYearId ?? ''} style={{ width: 160 }}>
            <option value="">All years</option>
            {fiscalYears.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="qFilter">Audit section contains</label>
          <input id="qFilter" className="input" name="q" defaultValue={sp.q ?? ''} style={{ width: 240 }} />
        </div>
        <button className="btn">Filter</button>
        {filtered && <Link className="btn" href="/audit/records">Clear</Link>}
      </form>

      {rows.length === 0 ? (
        <Empty>No audit records{filtered ? ' for this filter' : ''}.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Audit section</th>
                <th>Fiscal year</th>
                <th>Raised on</th>
                <th>Status</th>
                <th>Objections</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/audit/records/${r.id}`}>{r.auditSection}</Link></td>
                  <td>{r.fiscalYearLabel ?? '—'}</td>
                  <td><DateLabel iso={r.raisedOn} /></td>
                  <td><StatusPill tone={STATUS_TONE[r.status] ?? 'default'}>{r.status}</StatusPill></td>
                  <td className="mono">{r.objectionCount}</td>
                  <td className="mono">{r.itemCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
