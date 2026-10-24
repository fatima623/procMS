import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { loadAuditLog } from '@/interfaces/ui/views/AuditViews';
import { prisma } from '@/infrastructure/db/prisma';
import { Empty } from '@/interfaces/ui/components/Empty';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Audit log • Admin' };

const ICON = {
  log:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>,
  clock:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  users:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3 3-5 7-5s7 2 7 5"/><path d="M17 11a3 3 0 100-6"/><path d="M22 20c0-2.5-2-4-5-4.5"/></svg>,
  shield: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>,
};

export default async function AuditLogPage({ searchParams }: {
  searchParams: { page?: string; action?: string; subjectType?: string; subjectId?: string; actor?: string };
}) {
  await requireRoles([Role.ADMIN]);
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const sinceDay = new Date(Date.now() - 24 * 3600 * 1000);
  const [result, totalAll, since24h, distinctActors] = await Promise.all([
    loadAuditLog({
      page,
      ...(searchParams.action ? { action: searchParams.action } : {}),
      ...(searchParams.subjectType ? { subjectType: searchParams.subjectType } : {}),
      ...(searchParams.subjectId ? { subjectId: searchParams.subjectId } : {}),
      ...(searchParams.actor ? { actorEmail: searchParams.actor } : {}),
    }),
    prisma.auditLog.count(),
    prisma.auditLog.count({ where: { occurredAt: { gte: sinceDay } } }),
    prisma.auditLog.findMany({ where: { occurredAt: { gte: sinceDay } }, select: { actorUserId: true }, distinct: ['actorUserId'] }),
  ]);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  const filterQuery = Object.fromEntries(
    Object.entries(searchParams).filter(([k, v]) => v !== undefined && v !== '' && k !== 'page'),
  );

  return (
    <>
      <h1>Audit log</h1>
      <p className="muted">Immutable record of every state-changing action. Admin oversight only.</p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KpiCard accent="indigo"  icon={ICON.log}    label="Total entries"      value={totalAll.toLocaleString()} sub="Lifetime, immutable" />
        <KpiCard accent="sky"     icon={ICON.clock}  label="Last 24 h"          value={since24h}                  sub="Events in the window" />
        <KpiCard accent="emerald" icon={ICON.users}  label="Actors (24 h)"      value={distinctActors.length}     sub="Distinct users active" />
        <KpiCard accent="amber"   icon={ICON.shield} label="Matching filter"    value={result.total.toLocaleString()} sub="Current filter result set" />
      </section>

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
