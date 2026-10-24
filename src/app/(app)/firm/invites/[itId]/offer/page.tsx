import { notFound, redirect } from 'next/navigation';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { SubmitOfferForm } from './SubmitOfferForm';

export const dynamic = 'force-dynamic';

export default async function SubmitOfferPage({ params }: { params: { itId: string } }) {
  const ctx = await requireSessionCtx();
  if (!ctx.firmId) redirect('/dashboard');
  const it = await prisma.iTPerforma.findUnique({
    where: { id: params.itId },
    include: { firms: true, indent: { select: { subject: true } }, technicalOffers: { where: { firmId: ctx.firmId }, select: { id: true } } },
  });
  if (!it) notFound();
  if (it.status !== 'DISPATCHED') redirect('/firm/invites');
  if (!it.firms.some((f) => f.firmId === ctx.firmId)) redirect('/firm/invites');
  if (it.technicalOffers.length > 0) redirect('/firm/invites');

  return (
    <>
      <h1>Submit technical offer</h1>
      <p className="muted">
        <span className="mono">{it.reference}</span>
        <span style={{ marginLeft: 10 }}>• {it.indent.subject}</span>
      </p>
      <SubmitOfferForm itPerformaId={it.id} />
    </>
  );
}
