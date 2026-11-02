import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listEndUserCertificates } from '@/interfaces/ui/views/ExecutionEvidenceViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'End User Certificates • Procurement' };
export const dynamic = 'force-dynamic';

export default async function EUCsPage() {
  await requireRoles([Role.ADMIN, Role.DP_N, Role.DGDP, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listEndUserCertificates();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>End User Certificates</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/execution/end-user-certificates/new">+ Issue EUC</Link>
      </div>
      <p className="muted">DPP&amp;I-35 Chapter XIX — issued for the import of controlled goods. The EUC certifies the end-user organisation and that goods will not be re-exported.</p>

      {rows.length === 0 ? (
        <Empty>No end-user certificates issued yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Firm</th>
                <th>Issued</th>
                <th>End-user organisation</th>
                <th>Controlled goods</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono"><Link href="/execution/contracts">{r.contractNumber}</Link></td>
                  <td>{r.firmName}</td>
                  <td><DateLabel iso={r.issuedOn} /></td>
                  <td>{r.endUserOrganisation}</td>
                  <td style={{ maxWidth: 420 }}>{r.controlledGoodsDesc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
