import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'LC amendments • Procurement' };
export const dynamic = 'force-dynamic';

export default async function LCAmendmentsPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await prisma.lCAmendment.findMany({
    orderBy: { requestedOn: 'desc' },
    include: { letterOfCredit: { include: { contract: { include: { firm: { select: { name: true } } } } } } },
    take: 300,
  });
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>LC amendments</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/execution/lc-amendments/new">+ Record amendment</Link>
      </div>
      <p className="muted">LC extensions, value changes or shipment-date revisions.</p>

      {rows.length === 0 ? (
        <Empty>No LC amendments recorded yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>LC #</th>
                <th>Contract #</th>
                <th>Firm</th>
                <th>Requested</th>
                <th>Finalized</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.letterOfCredit.lcNumber}</td>
                  <td className="mono"><Link href="/execution/contracts">{r.letterOfCredit.contract.contractNumber}</Link></td>
                  <td>{r.letterOfCredit.contract.firm.name}</td>
                  <td><DateLabel iso={r.requestedOn.toISOString()} /></td>
                  <td><DateLabel iso={r.finalizedOn?.toISOString() ?? null} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
