import { requireRoles } from '@/interfaces/ui/auth';
import { LEGAL_ROLES } from '@/infrastructure/legal/CourtCaseService';
import { listContractOptions, listIndentOptions } from '@/interfaces/ui/views/CourtCaseViews';
import { CaseForm } from './CaseForm';

export const metadata = { title: 'New court case • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewCourtCasePage() {
  await requireRoles(LEGAL_ROLES);
  const [indents, contracts] = await Promise.all([listIndentOptions(), listContractOptions()]);
  return (
    <>
      <h1>New court case</h1>
      <CaseForm indents={indents} contracts={contracts} />
    </>
  );
}
