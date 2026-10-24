import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Role } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { StatusPill, toneForApprovalStatus } from '@/interfaces/ui/components/StatusPill';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { DecideForm } from './DecideForm';

export const dynamic = 'force-dynamic';

export default async function ApprovalDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireSessionCtx();
  const chain = await prisma.approvalChain.findUnique({
    where: { id: params.id },
    include: { steps: { include: { decidedBy: true }, orderBy: { stepIndex: 'asc' } } },
  });
  if (!chain) notFound();

  const current = chain.steps.find((s) => s.stepIndex === chain.currentIndex);
  const canDecide =
    chain.status === 'PENDING' &&
    current !== undefined &&
    (ctx.roles.includes(current.role) || ctx.roles.includes(Role.ADMIN));

  // Resolve owning indent for breadcrumb
  const subjectInfo = await (async () => {
    if (chain.subject === 'INDENT') {
      const i = await prisma.indent.findUnique({ where: { id: chain.subjectId }, select: { id: true, indentNumber: true, subject: true } });
      return i ? { indentId: i.id, indentNumber: i.indentNumber, title: i.subject } : null;
    }
    if (chain.subject === 'IT_PROFORMA') {
      const r = await prisma.iTPerforma.findUnique({ where: { id: chain.subjectId }, select: { reference: true, indent: { select: { id: true, indentNumber: true, subject: true } } } });
      return r ? { indentId: r.indent.id, indentNumber: r.indent.indentNumber, title: `IT ${r.reference} • ${r.indent.subject}` } : null;
    }
    const r = await prisma.cST.findUnique({ where: { id: chain.subjectId }, select: { itPerforma: { select: { indent: { select: { id: true, indentNumber: true, subject: true } } } } } });
    return r ? { indentId: r.itPerforma.indent.id, indentNumber: r.itPerforma.indent.indentNumber, title: `CST • ${r.itPerforma.indent.subject}` } : null;
  })();

  return (
    <>
      <h1>Approval chain</h1>
      {subjectInfo && (
        <p className="muted">
          <Link className="mono" href={`/indents/${subjectInfo.indentId}`}>{subjectInfo.indentNumber}</Link>
          <span style={{ marginLeft: 8 }}>{subjectInfo.title}</span>
        </p>
      )}

      <div className="row" style={{ marginBottom: 12 }}>
        <StatusPill tone={toneForApprovalStatus(chain.status)}>{chain.status}</StatusPill>
        <span className="dim">Subject: {chain.subject.replace('_', ' ')}</span>
      </div>

      <div className="card">
        <h3>Steps</h3>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {chain.steps.map((s) => (
            <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span className="dim" style={{ width: 20, textAlign: 'right' }}>{s.stepIndex + 1}.</span>
              <span style={{ width: 100, fontWeight: 600 }}>{s.role}</span>
              <StatusPill tone={toneForApprovalStatus(s.status)}>{s.status}</StatusPill>
              <span className="grow muted mono" style={{ fontSize: 12 }}>
                {s.decidedBy?.displayName ? `${s.decidedBy.displayName} • ` : ''}
                <DateLabel iso={s.decidedAt} />
              </span>
              {s.comments && <span className="muted" style={{ fontStyle: 'italic', maxWidth: '45%', textAlign: 'right' }}>“{s.comments}”</span>}
            </li>
          ))}
        </ol>
      </div>

      {canDecide ? (
        <div className="card">
          <h3>Your decision ({current.role})</h3>
          <DecideForm chainId={chain.id} />
        </div>
      ) : (
        <div className="card muted">
          {chain.status !== 'PENDING'
            ? `Chain is ${chain.status}. No further action possible.`
            : `Current step requires role ${current?.role ?? '—'}; you don't hold it.`}
        </div>
      )}
    </>
  );
}
