import { redirect } from 'next/navigation';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { listMailRecipients } from '@/interfaces/ui/views/MailViews';
import { ComposeForm } from './ComposeForm';

export const metadata = { title: 'Compose mail • Procurement' };
export const dynamic = 'force-dynamic';

export default async function ComposePage() {
  const ctx = await requireSessionCtx();
  if (ctx.firmId) redirect('/dashboard');
  const users = await listMailRecipients(ctx.userId);
  return (
    <>
      <h1>Compose message</h1>
      <ComposeForm users={users} />
    </>
  );
}
