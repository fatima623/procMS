import { notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminUserService } from '@/application/admin/AdminUserService';
import { prisma } from '@/infrastructure/db/prisma';
import { KpiCard, type Accent } from '@/interfaces/ui/components/KpiCard';
import { UserForm } from '../UserForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import { ImpersonateButton } from './ImpersonateButton';
import { NotFoundError } from '@/domain/errors/DomainError';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit user • Admin' };

const service = new AdminUserService();

const H_ICON = {
  user:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>,
  check:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg>,
  shield: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>,
  firm:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V8l8-5 8 5v13"/><path d="M9 21V12h6v9"/></svg>,
};

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

  const activeAccent: Accent = user.isActive ? 'emerald' : 'coral';
  const firmName = user.firmId ? firms.find((f) => f.id === user.firmId)?.name ?? '—' : '—';

  return (
    <>
      <h1>{user.displayName}</h1>
      <p className="muted mono">{user.email}</p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KpiCard accent="indigo"       icon={H_ICON.user}   label="Display name" value={user.displayName} sub={user.rank ?? 'No rank set'} />
        <KpiCard accent={activeAccent} icon={H_ICON.check}  label="Account state" value={user.isActive ? 'Active' : 'Inactive'} sub={user.isActive ? 'Can sign in' : 'Cannot sign in'} />
        <KpiCard accent="violet"       icon={H_ICON.shield} label="Roles" value={user.roles.length} sub={user.roles.join(', ') || 'No roles'} />
        <KpiCard accent="sky"          icon={H_ICON.firm}   label="Firm / sections" value={user.firmId ? firmName : `${user.sectionIds.length} section${user.sectionIds.length === 1 ? '' : 's'}`} sub={user.firmId ? 'Firm user' : 'Internal user'} />
      </section>

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
