import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listGuarantees } from '@/interfaces/ui/views/WorkflowListViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Bank guarantees • Procurement' };
export const dynamic = 'force-dynamic';

export default async function GuaranteesPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listGuarantees();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Bank guarantees</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/execution/guarantees/new">+ Record guarantee</Link>
      </div>
      <p className="muted">DPP&amp;I-35 Chapter XV — Bid Security (≤5% of estimate per PPRA Rule 25), Performance Bond (typically 5–10%), Advance Payment Guarantee.</p>

      {rows.length === 0 ? (
        <Empty>No guarantees recorded yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Firm</th>
                <th>Type</th>
                <th className="right">Amount</th>
                <th>Furnished</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono"><Link href="/execution/contracts">{r.contractNumber}</Link></td>
                  <td>{r.firmName}</td>
                  <td><StatusPill tone="info">{r.type}</StatusPill></td>
                  <td className="right"><MoneyLabel amountMinor={r.amountMinor} currency={r.currency} /></td>
                  <td><DateLabel iso={r.furnishedOn} /></td>
                  <td><DateLabel iso={r.expiresOn} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
