import { requireRoles } from '@/interfaces/ui/auth';
import { AUDIT_ROLES } from '@/infrastructure/audit/AuditService';
import { listContractOptions, listFiscalYearOptions, listIndentOptions } from '@/interfaces/ui/views/AuditRecordViews';
import { RecordForm } from './RecordForm';

export const metadata = { title: 'New audit record • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewAuditRecordPage() {
  await requireRoles(AUDIT_ROLES);
  const [fiscalYears, indents, contracts] = await Promise.all([
    listFiscalYearOptions(),
    listIndentOptions(),
    listContractOptions(),
  ]);
  return (
    <>
      <h1>New audit record</h1>
      <RecordForm fiscalYears={fiscalYears} indents={indents} contracts={contracts} />
    </>
  );
}
