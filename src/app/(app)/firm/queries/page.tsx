import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { listFirmOpenQueries } from '@/interfaces/ui/views/FirmViews';
import { Empty } from '@/interfaces/ui/components/Empty';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { AnswerQueryForm } from './AnswerQueryForm';

export const metadata = { title: 'Queries • Procurement' };
export const dynamic = 'force-dynamic';

export default async function FirmQueriesPage() {
  const ctx = await requireSessionCtx();
  if (!ctx.firmId && !ctx.roles.includes(Role.ADMIN)) redirect('/dashboard');
  const rows = ctx.firmId ? await listFirmOpenQueries(ctx.firmId) : [];
  return (
    <>
      <h1>Open queries</h1>
      <p className="muted">Technical queries raised by the Inspectorate during scrutiny.</p>
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
