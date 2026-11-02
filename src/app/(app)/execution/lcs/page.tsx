import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listLCs } from '@/interfaces/ui/views/WorkflowListViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Letters of Credit • Procurement' };
export const dynamic = 'force-dynamic';

export default async function LCsPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listLCs();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Letters of Credit</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/execution/lcs/new">+ Record LC</Link>
      </div>
      <p className="muted">DPP&amp;I-35 Chapter XIV — LCs for imported stores. Confirmed, irrevocable, payable at sight.</p>

      {rows.length === 0 ? (
        <Empty>No LCs recorded yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>LC #</th>
                <th>Contract #</th>
                <th>Firm</th>
                <th>Opened</th>
                <th className="right">Amendments</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.lcNumber}</td>
                  <td className="mono"><Link href="/execution/contracts">{r.contractNumber}</Link></td>
                  <td>{r.firmName}</td>
                  <td><DateLabel iso={r.openedOn} /></td>
                  <td className="right mono">{r.amendmentCount}</td>
                  <td className="right"><Link className="btn" href={`/execution/lc-amendments/new?lcId=${r.id}`}>+ Amendment</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
