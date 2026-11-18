import { requireSessionCtx } from '@/interfaces/ui/auth';
import { TelephoneBillCreateForm } from './TelephoneBillCreateForm';

export const metadata = { title: 'Add Telephone Bill • Admin' };

export default async function NewTelephoneBillPage() {
  await requireSessionCtx();
  return (
    <>
      <h1 style={{ marginBottom: 20 }}>Add Telephone Bill</h1>
      <TelephoneBillCreateForm />
    </>
  );
}
