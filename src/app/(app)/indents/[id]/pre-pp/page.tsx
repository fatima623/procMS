import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { PrePPForm } from './PrePPForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pre-Purchase Proposal' };

export default async function PrePPPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireSessionCtx();

  const indent = await prisma.indent.findUnique({
    where: { id },
    select: { id: true, indentNumber: true, subject: true, status: true, type: true },
  });
  if (!indent) notFound();

  const proposal = await prisma.prePurchaseProposal.findUnique({ where: { indentId: id } });
  const it = await prisma.iTPerforma.findUnique({ where: { indentId: id }, select: { id: true } });
  const cst = it
    ? await prisma.cST.findFirst({ where: { itPerformaId: it.id }, select: { singleQuote: true, status: true } })
    : null;

  const canAct = [Role.ADP_STAFF, Role.COORD_STAFF, Role.ADMIN].some((r) => ctx.roles.includes(r));
  const eligible = cst?.singleQuote === true || String(indent.type) === 'PROPRIETY';

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <Link className="btn" href={`/indents/${id}`}>← Back to indent</Link>
      </div>
      <h1 style={{ marginBottom: 4 }}>Pre-Purchase Proposal</h1>
      <p className="muted mono" style={{ marginTop: 0 }}>{indent.indentNumber} — {indent.subject}</p>

      <section className="card" style={{ padding: 16, marginBottom: 16 }}>
        <dl style={{ display: 'grid', gridTemplateColumns: '200px 1fr', rowGap: 8, columnGap: 10, margin: 0 }}>
          <dt className="dim">Indent status</dt><dd>{String(indent.status).replace(/_/g, ' ')}</dd>
          <dt className="dim">Indent type</dt><dd>{String(indent.type)}</dd>
          <dt className="dim">Single-quote CST</dt><dd>{cst ? (cst.singleQuote ? 'Yes' : 'No') : '—'}</dd>
          <dt className="dim">CST status</dt><dd>{cst ? String(cst.status) : '—'}</dd>
          <dt className="dim">Needs a Pre-PP</dt><dd>{eligible ? 'Yes' : 'No (normal indent)'}</dd>
        </dl>
      </section>

      {proposal && (
        <section className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Proposal</h3>
          <dl style={{ display: 'grid', gridTemplateColumns: '200px 1fr', rowGap: 8, columnGap: 10, margin: 0 }}>
            <dt className="dim">Kind</dt><dd>{String(proposal.kind).replace(/_/g, ' ')}</dd>
            <dt className="dim">Status</dt><dd>{String(proposal.status)}</dd>
            <dt className="dim">Recommended on</dt><dd><DateLabel iso={proposal.recommendedOn.toISOString()} /></dd>
            <dt className="dim">Justification</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{proposal.justification}</dd>
            {proposal.rejectionReason && (<><dt className="dim">Rejection reason</dt><dd>{proposal.rejectionReason}</dd></>)}
            {proposal.approvalChainId && (
              <><dt className="dim">Approval chain</dt><dd><Link href={`/approvals/${proposal.approvalChainId}`}>Open approval chain →</Link></dd></>
            )}
          </dl>
        </section>
      )}

      <PrePPForm
        indentId={id}
        hasProposal={!!proposal}
        proposalStatus={proposal ? String(proposal.status) : null}
        indentStatus={String(indent.status)}
        canAct={canAct}
      />
    </>
  );
}