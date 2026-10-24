import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { listFirmOpenQueries } from '@/interfaces/ui/views/FirmViews';
import { Empty } from '@/interfaces/ui/components/Empty';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';
import { AnswerQueryForm } from './AnswerQueryForm';

export const metadata = { title: 'Queries • Procurement' };
export const dynamic = 'force-dynamic';

const ICON = {
  chat:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  clock: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  spark: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h8l-1 8 10-12h-8z"/></svg>,
};

export default async function FirmQueriesPage() {
  const ctx = await requireSessionCtx();
  if (!ctx.firmId && !ctx.roles.includes(Role.ADMIN)) redirect('/dashboard');
  const rows = ctx.firmId ? await listFirmOpenQueries(ctx.firmId) : [];
  const now = Date.now();
  const DAY = 24 * 3600 * 1000;
  const overdue = rows.filter((q) => now - new Date(q.askedAt).getTime() > 3 * DAY).length;
  const oldestDays = rows.length === 0 ? 0 : Math.max(...rows.map((q) => Math.floor((now - new Date(q.askedAt).getTime()) / DAY)));

  return (
    <>
      <h1>Open queries</h1>
      <p className="muted">Technical queries raised by the Inspectorate during scrutiny.</p>

      {rows.length > 0 && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 14, marginBottom: 18 }}>
          <KpiCard accent="pink"   icon={ICON.chat}  label="Open queries" value={rows.length} sub="Awaiting your reply" />
          <KpiCard accent="amber"  icon={ICON.clock} label="Oldest" value={`${oldestDays}d`} sub="Since asked" />
          <KpiCard accent="coral"  icon={ICON.spark} label="Over 3 days" value={overdue} sub={overdue > 0 ? 'Reply quickly to stay in SLA' : 'All inside the SLA window'} />
        </section>
      )}

      {rows.length === 0 ? (
        <Empty>No open queries.</Empty>
      ) : (
        rows.map((q) => (
          <div className="card" key={q.queryId}>
            <div className="row">
              <strong>{q.indentSubject}</strong>
              <span className="grow" />
              <span className="muted"><DateLabel iso={q.askedAt} /></span>
            </div>
            <p style={{ marginTop: 8 }}>{q.question}</p>
            <AnswerQueryForm tsrId={q.tsrId} queryId={q.queryId} />
          </div>
        ))
      )}
    </>
  );
}
