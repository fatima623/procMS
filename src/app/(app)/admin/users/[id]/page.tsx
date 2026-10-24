import { notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminUserService } from '@/application/admin/AdminUserService';
import { prisma } from '@/infrastructure/db/prisma';
import { UserForm } from '../UserForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import { ImpersonateButton } from './ImpersonateButton';
import { NotFoundError } from '@/domain/errors/DomainError';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit user • Admin' };

const service = new AdminUserService();

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const ctx = await requireRoles([Role.ADMIN]);
  const [user, sections, firms] = await Promise.all([
    service.get(ctx, params.id).catch((e) => {
      if (e instanceof NotFoundError) return null;
      throw e;
    }),
    prisma.section.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true, kind: true } }),
    prisma.firm.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, code: true, name: true } }),
  ]);
  if (!user) notFound();

  return (
    <>
      <h1>{user.displayName}</h1>
      <p className="muted mono">{user.email}</p>
      <ImpersonateButton userId={user.id} email={user.email} isSelf={user.id === ctx.userId} />
      <UserForm
        mode="edit"
        userId={user.id}
        initial={{
          displayName: user.displayName,
          rank: user.rank ?? '',
          isActive: user.isActive,
          roles: user.roles as Role[],
          sectionIds: [...user.sectionIds],
          firmId: user.firmId ?? '',
        }}
        sections={sections}
        firms={firms}
      />

      <section className="card" style={{ marginTop: 24 }}>
        <h3>Reset password</h3>
        <p className="muted">Sets a new password immediately. Hand it to the user through a secure channel; it is never echoed back.</p>
        <ResetPasswordForm userId={user.id} />
      </section>
    </>
  );
}
