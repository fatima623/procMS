import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { TemplateForm } from './TemplateForm';

export const metadata = { title: 'Register template • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewTemplatePage() {
  await requireRoles([Role.ADMIN, Role.COORD_STAFF]);
  return (
    <>
      <h1>Register bidding document template</h1>
      <p className="muted">Add a PPRA standard bidding document to the library. Each (kind, revision) pair is unique.</p>
      <TemplateForm />
    </>
  );
}
