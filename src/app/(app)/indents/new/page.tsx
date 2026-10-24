import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { loadReferenceData } from '@/interfaces/ui/views/IndentViews';
import { NewIndentForm } from './NewIndentForm';

export const metadata = { title: 'New indent • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewIndentPage() {
  await requireRoles([Role.INDENTER, Role.ADMIN]);
  const ref = await loadReferenceData();
  return (
    <>
      <h1>New indent</h1>
      <p className="muted">Draft the indent and submit it. The owning section is derived from your membership.</p>
      <NewIndentForm fiscalYears={ref.fiscalYears} budgetHeads={ref.budgetHeads} />
    </>
  );
}
