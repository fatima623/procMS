import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { loadTSRDetail } from '@/interfaces/ui/views/InspectorateViews';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { KpiCard, type Accent } from '@/interfaces/ui/components/KpiCard';
import { TSRPanel } from './TSRPanel';

export const dynamic = 'force-dynamic';

const H_ICON = {
  wrench:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 7a4 4 0 11-5 5l-6 6 2 2 6-6a4 4 0 015-5l-2 2 1 1 1-1 1 1-1 1 1 1 1-1z"/></svg>,
  mail:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>,
  chat:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  clock:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
};

export default async function TSRDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireSessionCtx();
  const tsr = await loadTSRDetail(params.id);
  if (!tsr) notFound();

  const canEdit = (ctx.roles.includes(Role.INSPECTORATE) || ctx.roles.includes(Role.ADMIN)) && tsr.status !== 'COMPLETED';
  const statusAccent: Accent = tsr.status === 'COMPLETED' ? 'emerald'
    : tsr.status === 'QUERIES_RAISED' ? 'amber'
    : 'indigo';
  const openQueries = tsr.queries.filter((q) => !q.response).length;
  const whenISO = tsr.completedAt ?? tsr.submittedAt ?? null;

  return (
    <>
      <h1>Technical Scrutiny Report</h1>
      <p className="muted">
        <span className="mono">{tsr.itReference}</span>
        <span style={{ marginLeft: 10 }}>• <Link href={`/indents/${tsr.indentId}`}>{tsr.indentSubject}</Link></span>
      </p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KpiCard accent={statusAccent} icon={H_ICON.wrench} label="Status"    value={tsr.status.replace(/_/g, ' ')} sub={tsr.itReference} />
        <KpiCard accent="sky"          icon={H_ICON.mail}   label="Offers"    value={tsr.offers.length}             sub="Technical offers in review" />
        <KpiCard accent={openQueries > 0 ? 'coral' : 'emerald'} icon={H_ICON.chat} label="Queries" value={tsr.queries.length} sub={openQueries > 0 ? `${openQueries} awaiting reply` : 'All answered'} />
        <KpiCard accent="violet"       icon={H_ICON.clock}  label={tsr.completedAt ? 'Completed' : tsr.submittedAt ? 'Submitted' : 'Opened'} value={whenISO ? <DateLabel iso={whenISO} /> : '—'} sub={canEdit ? 'Editable' : 'Read-only'} />
      </section>

      <TSRPanel tsrId={tsr.id} canEdit={canEdit} offers={tsr.offers} queries={tsr.queries} summary={tsr.summary} />
    </>
  );
}
