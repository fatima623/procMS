import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { SectionForm } from '../SectionForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'New section • Admin' };

export default async function NewSectionPage() {
  await requireRoles([Role.ADMIN]);
  const parents = await prisma.section.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } });
  return (
    <>
      <h1>New section</h1>
      <SectionForm mode="create" parents={parents} />
    </>
  );
}
