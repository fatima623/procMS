import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { preAwardCompliance } from '@/infrastructure/preaward/PreAwardComplianceService';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Overdue bid validity • Procurement' };
export const dynamic = 'force-dynamic';

export default async function OverdueValidityPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await preAwardCompliance.overdueBidValidityOffers();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Overdue bid validity</h1>
        <div className="grow" />
        <Link className="btn" href="/commercial-offers">← Back to commercial offers</Link>
      </div>
      <p className="muted">PPRA Rule 26 — commercial offers whose bid validity has lapsed. Each must be extended with firm consent or excluded from the CST.</p>
      {rows.length === 0 ? (
        <Empty>No offer is currently past its bid validity.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Offer id</th>
                <th>Firm</th>
                <th>IT</th>
                <th>Valid until</th>
                <th className="right">Price</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.id}</td>
                  <td className="mono">{r.firmId}</td>
                  <td className="mono">{r.itPerformaId}</td>
                  <td><DateLabel iso={r.validUntil} /></td>
                  <td className="right"><MoneyLabel amountMinor={r.totalPriceMinor} currency={r.currency} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
