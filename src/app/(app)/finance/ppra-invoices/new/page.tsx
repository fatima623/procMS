import { requireRoles } from '@/interfaces/ui/auth';
import { PPRA_INVOICE_ROLES } from '@/infrastructure/finance/PPRAInvoiceService';
import { listITProformaOptions } from '@/interfaces/ui/views/PPRAInvoiceViews';
import { InvoiceForm } from './InvoiceForm';

export const metadata = { title: 'New PPRA invoice • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewPPRAInvoicePage() {
  await requireRoles(PPRA_INVOICE_ROLES);
  const itOptions = await listITProformaOptions();
  return (
    <>
      <h1>New PPRA invoice</h1>
      <p className="muted">Record an invoice received from PPRA and the IT Proformas (tenders) it covers.</p>
      <InvoiceForm itOptions={itOptions} />
    </>
  );
}
