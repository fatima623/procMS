import { prisma } from '@/infrastructure/db/prisma';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { SecurityPanel } from './SecurityPanel';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Security • Procurement' };

export default async function SecurityPage() {
  const ctx = await requireSessionCtx();
  // Cast while the Prisma client regen is pending for the TOTP columns.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user: any = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { email: true, displayName: true, totpEnabledAt: true } as any,
  });
  const enabledAt = user?.totpEnabledAt?.toISOString() ?? null;
  return (
    <>
      <h1>Security</h1>
      <p className="muted">Two-factor authentication for <span className="mono">{user?.email}</span>.</p>
      <SecurityPanel initiallyEnabledAt={enabledAt} />
    </>
  );
}
