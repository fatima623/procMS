import { notFound, redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { NewITForm } from './NewITForm';

export const dynamic = 'force-dynamic';

export default async function NewITPage({ params }: { params: { id: string } }) {
  await requireRoles([Role.ADP_STAFF, Role.ADMIN], `/indents/${params.id}`);
  const indent = await prisma.indent.findUnique({ where: { id: params.id }, select: { id: true, indentNumber: true, status: true, subject: true, itPerforma: { select: { id: true } } } });
  if (!indent) notFound();
  if (indent.itPerforma) redirect(`/indents/${indent.id}`);
  if (indent.status !== 'IT_PREPARATION') redirect(`/indents/${indent.id}`);

  const firms = await prisma.firm.findMany({ where: { isActive: true, isBlacklisted: false }, orderBy: { name: 'asc' }, select: { id: true, name: true, code: true } });

  return (
    <>
      <h1>Create IT Issue Proforma</h1>
      <p className="muted">Indent <span className="mono">{indent.indentNumber}</span> • {indent.subject}</p>
      <NewITForm indentId={indent.id} firms={firms} />
    </>
  );
}
