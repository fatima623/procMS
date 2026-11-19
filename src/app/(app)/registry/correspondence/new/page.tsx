import { requireRoles } from '@/interfaces/ui/auth';
import { REGISTRY_ROLES } from '@/infrastructure/registry/RegistryService';
import { listAssignableUsers } from '@/interfaces/ui/views/RegistryViews';
import { CorrespondenceForm } from './CorrespondenceForm';

export const metadata = { title: 'New correspondence • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewCorrespondencePage() {
  await requireRoles(REGISTRY_ROLES);
  const users = await listAssignableUsers();
  return (
    <>
      <h1>File new correspondence</h1>
      <p className="muted">Leave the control number blank to auto-number it (CR/IN/2026/00001, CR/OUT/2026/00001…).</p>
      <CorrespondenceForm users={users} />
    </>
  );
}
