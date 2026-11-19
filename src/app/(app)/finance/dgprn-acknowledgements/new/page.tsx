import { requireRoles } from '@/interfaces/ui/auth';
import { PPRA_INVOICE_ROLES } from '@/infrastructure/finance/PPRAInvoiceService';
import { listAckableInvoiceOptions, loadPPRAInvoiceDetail } from '@/interfaces/ui/views/DGPRNAckViews';
import { listITProformaOptions } from '@/interfaces/ui/views/PPRAInvoiceViews';
import { AckForm } from './AckForm';

export const metadata = { title: 'Record DGPR(N) acknowledgement • Procurement' };
export const dynamic = 'force-dynamic';

export default async function NewDGPRNAckPage({ searchParams }: { searchParams: Promise<{ invoiceId?: string }> }) {
  await requireRoles(PPRA_INVOICE_ROLES);
  const sp = await searchParams;
  const [invoiceOptions, itOptions] = await Promise.all([listAckableInvoiceOptions(), listITProformaOptions()]);

  // ?invoiceId= preselects the invoice — only if it is one DGPR(N) can acknowledge.
  let preselectedInvoiceId = '';
  let notice: string | null = null;
  if (sp.invoiceId) {
    if (invoiceOptions.some((o) => o.id === sp.invoiceId)) {
      preselectedInvoiceId = sp.invoiceId;
    } else {
      const inv = await loadPPRAInvoiceDetail(sp.invoiceId);
      notice = inv
        ? `Invoice ${inv.invoiceNumber} is ${inv.status} — only invoices sent to DGPR(N) or paid can be acknowledged.`
        : 'The requested invoice was not found.';
    }
  }

  return (
    <>
      <h1>Record DGPR(N) acknowledgement</h1>
      <p className="muted">Link it to a PPRA invoice, an IT Proforma, or both.</p>
      {notice && <div className="err" style={{ marginBottom: 12, maxWidth: 760 }}>{notice}</div>}
      <AckForm invoiceOptions={invoiceOptions} itOptions={itOptions} preselectedInvoiceId={preselectedInvoiceId} />
    </>
  );
}
