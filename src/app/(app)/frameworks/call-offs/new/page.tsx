import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { CallOffForm } from './CallOffForm';

export const metadata = { title: 'Place call-off • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewCallOffPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  // Active frameworks with their firms, served to the form.
  const frameworks = await prisma.frameworkAgreement.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { validFrom: 'desc' },
    include: { firms: { select: { firmId: true } } },
    take: 100,
  });
  const firmIds = Array.from(new Set(frameworks.flatMap((f) => f.firms.map((x) => x.firmId))));
  const firmRows = firmIds.length > 0
    ? await prisma.firm.findMany({ where: { id: { in: firmIds } }, select: { id: true, name: true } })
    : [];
  const firmMap: Record<string, string> = Object.fromEntries(firmRows.map((f) => [f.id, f.name]));
  const options = frameworks.map((f) => ({
    id: f.id,
    reference: f.reference,
    name: f.name,
    currency: f.currency,
    firms: f.firms.map((x) => ({ id: x.firmId, name: firmMap[x.firmId] ?? x.firmId })),
  }));
  return (
    <>
      <h1>Place call-off order</h1>
      <p className="muted">The call-off must reference an ACTIVE framework and one of its participating firms.</p>
      <CallOffForm frameworks={options} />
    </>
  );
}
