import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listInsurances } from '@/interfaces/ui/views/ExecutionEvidenceViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Insurance • Procurement' };
export const dynamic = 'force-dynamic';

export default async function InsurancesPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listInsurances();
  const now = Date.now();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Insurance</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/execution/insurances/new">+ Record insurance</Link>
      </div>
      <p className="muted">DPP&amp;I-35 Chapter XVII — marine and war-risk cover on imported stores. Policies that expire before the shipment arrives are a compliance risk.</p>

      {rows.length === 0 ? (
        <Empty>No insurance policies recorded yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Firm</th>
                <th>Kind</th>
                <th>Policy #</th>
                <th>Insurer</th>
                <th>Cover from</th>
                <th>Cover to</th>
                <th>Status</th>
                <th className="right">Premium</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const expired = new Date(r.coverToDate).getTime() < now;
                return (
                  <tr key={r.id}>
                    <td className="mono"><Link href="/execution/contracts">{r.contractNumber}</Link></td>
                    <td>{r.firmName}</td>
                    <td><StatusPill tone="info">{r.kind.replace(/_/g, ' ')}</StatusPill></td>
                    <td className="mono">{r.policyNumber}</td>
                    <td>{r.insurer}</td>
                    <td><DateLabel iso={r.coverFromDate} /></td>
                    <td><DateLabel iso={r.coverToDate} /></td>
                    <td><StatusPill tone={expired ? 'danger' : 'ok'}>{expired ? 'EXPIRED' : 'ACTIVE'}</StatusPill></td>
                    <td className="right"><MoneyLabel amountMinor={r.premiumMinor} currency={r.currency} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
