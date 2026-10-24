import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Role } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { StatusPill, toneForApprovalStatus } from '@/interfaces/ui/components/StatusPill';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { KpiCard, type Accent } from '@/interfaces/ui/components/KpiCard';
import { DecideForm } from './DecideForm';

const H_ICON = {
  flow:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M7 12h4M13 12h4M12 7v4M12 13v4"/></svg>,
  user:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>,
  stack:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  clock:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
};

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

  const statusAccent: Accent = chain.status === 'APPROVED' ? 'emerald'
    : chain.status === 'REJECTED' ? 'coral'
    : chain.status === 'WITHDRAWN' ? 'violet'
    : 'indigo';
  const decidedCount = chain.steps.filter((s) => s.status !== 'PENDING').length;
  const openedAt = chain.steps[0]?.decidedAt ?? chain.createdAt.toISOString();
  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(openedAt).getTime()) / (24 * 3600 * 1000)));

  return (
    <>
      <h1>Approval chain</h1>
      {subjectInfo && (
        <p className="muted">
          <Link className="mono" href={`/indents/${subjectInfo.indentId}`}>{subjectInfo.indentNumber}</Link>
          <span style={{ marginLeft: 8 }}>{subjectInfo.title}</span>
        </p>
      )}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KpiCard accent={statusAccent} icon={H_ICON.flow}  label="Chain status" value={chain.status} sub={chain.subject.replace('_', ' ')} />
        <KpiCard accent="amber"        icon={H_ICON.user}  label="Current actor" value={current ? current.role : '—'} sub={current ? `Step ${current.stepIndex + 1} of ${chain.steps.length}` : 'Chain finished'} />
        <KpiCard accent="emerald"      icon={H_ICON.stack} label="Progress" value={`${decidedCount}/${chain.steps.length}`} sub={`${chain.steps.length - decidedCount} step${chain.steps.length - decidedCount === 1 ? '' : 's'} to go`} />
        <KpiCard accent="violet"       icon={H_ICON.clock} label="Age" value={`${ageDays}d`} sub={<>Opened <DateLabel iso={openedAt} /></>} />
      </section>

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
