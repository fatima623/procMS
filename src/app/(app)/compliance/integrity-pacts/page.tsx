import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listIntegrityPacts } from '@/interfaces/ui/views/ComplianceViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { CounterSignButton } from './CounterSignButton';

export const metadata = { title: 'Integrity pacts • Procurement' };
export const dynamic = 'force-dynamic';

export default async function IntegrityPactsPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listIntegrityPacts();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Integrity pacts</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/compliance/integrity-pacts/new">+ Register pact</Link>
      </div>
      <p className="muted">PPRA Rule 7 — mandatory for every procurement over PKR 10 M. The pact is between the procuring agency and the bidder, signed before the award.</p>

      {rows.length === 0 ? (
        <Empty>No integrity pacts recorded yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Indent</th>
                <th>Firm</th>
                <th>Signed by buyer</th>
                <th>Signed by supplier</th>
                <th>Counter-signature</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/indents/${r.indentId}`}>{r.indentSubject}</Link></td>
                  <td>{r.firmName}</td>
                  <td><DateLabel iso={r.signedByBuyerOn} /></td>
                  <td>{r.signedBySupplierOn ? <DateLabel iso={r.signedBySupplierOn} /> : <span className="muted">—</span>}</td>
                  <td>
                    {r.signedBySupplierOn
                      ? <StatusPill tone="ok">Complete</StatusPill>
                      : <StatusPill tone="warn">Awaiting</StatusPill>}
                  </td>
                  <td className="right">
                    {!r.signedBySupplierOn && <CounterSignButton id={r.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
