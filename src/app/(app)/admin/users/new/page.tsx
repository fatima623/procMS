import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { UserForm } from '../UserForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'New user • Admin' };

export default async function NewUserPage() {
  await requireRoles([Role.ADMIN]);
  const [sections, firms] = await Promise.all([
    prisma.section.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true, kind: true } }),
    prisma.firm.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, code: true, name: true } }),
  ]);
  return (
    <>
      <h1>New user</h1>
      <UserForm mode="create" sections={sections} firms={firms} />
    </>
  );
}
