import { notFound, redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { NewCommercialForm } from './NewCommercialForm';

export const dynamic = 'force-dynamic';

export default async function NewCommercialPage({ params }: { params: { id: string } }) {
  await requireRoles([Role.ADP_STAFF, Role.COORD_STAFF, Role.ADMIN], `/indents/${params.id}`);
  const indent = await prisma.indent.findUnique({
    where: { id: params.id },
    select: {
      id: true, indentNumber: true, status: true,
      itPerforma: {
        select: {
          id: true,
          technicalOffers: {
            where: { status: 'ACCEPTED' },
            include: { firm: true },
          },
          commercialOffers: { select: { firmId: true } },
        },
      },
    },
  });
  if (!indent) notFound();
  if (indent.status !== 'COMMERCIAL_OPEN' || !indent.itPerforma) redirect(`/indents/${indent.id}`);

  const alreadyOpened = new Set(indent.itPerforma.commercialOffers.map((o) => o.firmId));
  const eligibleFirms = indent.itPerforma.technicalOffers
    .filter((o) => !alreadyOpened.has(o.firmId))
    .map((o) => ({ id: o.firm.id, name: o.firm.name, code: o.firm.code }));

  return (
    <>
      <h1>Open commercial offer</h1>
      <p className="muted">Indent <span className="mono">{indent.indentNumber}</span> — only technically-accepted firms are eligible.</p>
      <NewCommercialForm
        indentId={indent.id}
        itPerformaId={indent.itPerforma.id}
        eligibleFirms={eligibleFirms}
      />
    </>
  );
}
