import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listLDs } from '@/interfaces/ui/views/ExecutionObligationViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Liquidated Damages • Procurement' };
export const dynamic = 'force-dynamic';

export default async function LDsPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listLDs();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Liquidated Damages</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/execution/liquidated-damages/new">+ Assess LD</Link>
      </div>
      <p className="muted">DPP&amp;I-35 Chapter XIII — typically 2% per month of delay, capped at 10% of contract value. Record every assessment, with any waiver and its reason.</p>

      {rows.length === 0 ? (
        <Empty>No liquidated damages assessed yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Firm</th>
                <th>Assessed</th>
                <th>Delay from</th>
                <th>Delay to</th>
                <th>Basis</th>
                <th className="right">Amount</th>
                <th className="right">Waived</th>
                <th>Waiver reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono"><Link href="/execution/contracts">{r.contractNumber}</Link></td>
                  <td>{r.firmName}</td>
                  <td><DateLabel iso={r.assessedOn} /></td>
                  <td><DateLabel iso={r.periodFrom} /></td>
                  <td><DateLabel iso={r.periodTo} /></td>
                  <td><StatusPill tone="info">{r.basis}</StatusPill></td>
                  <td className="right"><MoneyLabel amountMinor={r.amountMinor} currency={r.currency} /></td>
                  <td className="right">{r.waivedAmountMinor ? <MoneyLabel amountMinor={r.waivedAmountMinor} currency={r.currency} /> : <span className="muted">—</span>}</td>
                  <td style={{ maxWidth: 240 }}>{r.waivedReason ?? <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
