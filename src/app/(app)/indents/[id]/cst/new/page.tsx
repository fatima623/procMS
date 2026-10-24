import { notFound, redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { decimalToMinor } from '@/infrastructure/common/decimal';
import { NewCSTForm } from './NewCSTForm';

export const dynamic = 'force-dynamic';

export default async function NewCSTPage({ params }: { params: { id: string } }) {
  await requireRoles([Role.ADP_STAFF, Role.COORD_STAFF, Role.ADMIN], `/indents/${params.id}`);
  const indent = await prisma.indent.findUnique({
    where: { id: params.id },
    select: {
      id: true, indentNumber: true, status: true,
      itPerforma: {
        select: {
          id: true,
          cst: { select: { id: true } },
          commercialOffers: { include: { firm: true }, orderBy: { totalPrice: 'asc' } },
        },
      },
    },
  });
  if (!indent) notFound();
  if (indent.status !== 'COMMERCIAL_OPEN' || !indent.itPerforma) redirect(`/indents/${indent.id}`);
  if (indent.itPerforma.cst) redirect(`/indents/${indent.id}`);
  if (indent.itPerforma.commercialOffers.length === 0) redirect(`/indents/${indent.id}`);

  const offers = indent.itPerforma.commercialOffers.map((o, idx) => ({
    id: o.id,
    firmName: o.firm.name,
    firmCode: o.firm.code,
    totalPriceMinor: decimalToMinor(o.totalPrice as unknown as string).toString(),
    currency: o.currency,
    deliveryWeeks: o.deliveryWeeks ?? null,
    suggestedRank: idx + 1, // ordered by price asc
    suggestedRecommend: idx === 0, // the lowest-priced by default
  }));

  return (
    <>
      <h1>Prepare CST</h1>
      <p className="muted">Indent <span className="mono">{indent.indentNumber}</span> — rank the opened commercial offers and recommend one for award.</p>
      <NewCSTForm indentId={indent.id} itPerformaId={indent.itPerforma.id} offers={offers} />
    </>
  );
}
