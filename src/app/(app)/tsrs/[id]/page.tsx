import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { loadTSRDetail } from '@/interfaces/ui/views/InspectorateViews';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { TSRPanel } from './TSRPanel';

export const dynamic = 'force-dynamic';

export default async function TSRDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireSessionCtx();
  const tsr = await loadTSRDetail(params.id);
  if (!tsr) notFound();

  const canEdit = (ctx.roles.includes(Role.INSPECTORATE) || ctx.roles.includes(Role.ADMIN)) && tsr.status !== 'COMPLETED';

  return (
    <>
      <h1>Technical Scrutiny Report</h1>
      <p className="muted">
        <span className="mono">{tsr.itReference}</span>
        <span style={{ marginLeft: 10 }}>• <Link href={`/indents/${tsr.indentId}`}>{tsr.indentSubject}</Link></span>
      </p>
      <div className="row" style={{ marginBottom: 16 }}>
        <StatusPill tone={tsr.status === 'COMPLETED' ? 'ok' : 'info'}>{tsr.status}</StatusPill>
        {tsr.submittedAt && <span className="muted">Submitted: <DateLabel iso={tsr.submittedAt} /></span>}
        {tsr.completedAt && <span className="muted">Completed: <DateLabel iso={tsr.completedAt} /></span>}
      </div>

      <TSRPanel tsrId={tsr.id} canEdit={canEdit} offers={tsr.offers} queries={tsr.queries} summary={tsr.summary} />
    </>
  );
}
