import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { loadAuditLog } from '@/interfaces/ui/views/AuditViews';
import { Empty } from '@/interfaces/ui/components/Empty';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Audit log • Admin' };

export default async function AuditLogPage({ searchParams }: {
  searchParams: { page?: string; action?: string; subjectType?: string; subjectId?: string; actor?: string };
}) {
  await requireRoles([Role.ADMIN]);
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const result = await loadAuditLog({
    page,
    ...(searchParams.action ? { action: searchParams.action } : {}),
    ...(searchParams.subjectType ? { subjectType: searchParams.subjectType } : {}),
    ...(searchParams.subjectId ? { subjectId: searchParams.subjectId } : {}),
    ...(searchParams.actor ? { actorEmail: searchParams.actor } : {}),
  });
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  const filterQuery = Object.fromEntries(
    Object.entries(searchParams).filter(([k, v]) => v !== undefined && v !== '' && k !== 'page'),
  );

  return (
    <>
      <h1>Audit log</h1>
      <p className="muted">Immutable record of every state-changing action. Admin oversight only.</p>

      <form method="get" className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: 10, alignItems: 'end' }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Action contains</label>
            <input className="input mono" name="action" defaultValue={searchParams.action ?? ''} placeholder="e.g. approval" />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Subject type</label>
            <select className="select" name="subjectType" defaultValue={searchParams.subjectType ?? ''}>
              <option value="">— any —</option>
              {result.distinctSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Subject id (ULID)</label>
            <input className="input mono" name="subjectId" defaultValue={searchParams.subjectId ?? ''} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Actor email contains</label>
            <input className="input" name="actor" defaultValue={searchParams.actor ?? ''} placeholder="e.g. @dp.navy" />
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-primary" type="submit">Apply</button>
            {(searchParams.action || searchParams.subjectType || searchParams.subjectId || searchParams.actor) && (
              <Link className="btn" href="/admin/audit">Clear</Link>
            )}
          </div>
        </div>
      </form>

      {result.items.length === 0 ? (
        <Empty>No log entries match the filter.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Subject</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((r) => (
                <tr key={r.id}>
                  <td><DateLabel iso={r.occurredAt} /></td>
                  <td>
                    {r.actorName ? r.actorName : <span className="muted">system</span>}
                    {r.actorUserId && <div className="muted mono" style={{ fontSize: 11 }}>{r.actorUserId.slice(-8)}</div>}
                  </td>
                  <td className="mono">{r.action}</td>
                  <td>
                    <StatusPill tone="info">{r.subjectType}</StatusPill>
                    <div className="muted mono" style={{ fontSize: 11, marginTop: 2 }}>{r.subjectId.slice(-10)}</div>
                  </td>
                  <td style={{ maxWidth: 360 }}>
                    {r.metadata && Object.keys(r.metadata as object).length > 0 ? (
                      <code style={{ fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                        {JSON.stringify(r.metadata).slice(0, 220)}
                      </code>
                    ) : <span className="muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="row row-end" style={{ marginTop: 12, gap: 8 }}>
          <span className="muted">Page {result.page} / {totalPages} ({result.total.toLocaleString()} total)</span>
          {page > 1 && <Link className="btn" href={{ pathname: '/admin/audit', query: { ...filterQuery, page: page - 1 } }}>Previous</Link>}
          {page < totalPages && <Link className="btn" href={{ pathname: '/admin/audit', query: { ...filterQuery, page: page + 1 } }}>Next</Link>}
        </div>
      )}
    </>
  );
}
