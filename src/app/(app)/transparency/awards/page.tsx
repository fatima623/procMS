import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listContracts } from '@/interfaces/ui/views/WorkflowListViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Public awards • Procurement' };
export const dynamic = 'force-dynamic';

export default async function PublicAwardsIndex() {
  await requireRoles([Role.ADMIN, Role.DGDP, Role.SECY_DP, Role.DP_N, Role.COORD_STAFF]);
  const rows = await listContracts();
  return (
    <>
      <h1>Awarded contracts — public access index</h1>
      <p className="muted">Each row below is reachable without authentication at <code className="mono">/api/public/awards/&lt;indentId&gt;</code>. Share the full URL with any party that needs the award evidence (PPRA Rule 47).</p>

      {rows.length === 0 ? (
        <Empty>No contracts awarded yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Firm</th>
                <th>Indent subject</th>
                <th>Awarded</th>
                <th className="right">Value</th>
                <th>Public URL</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.contractNumber}</td>
                  <td>{r.firmName}</td>
                  <td><Link href={`/indents/${r.indentId}`}>{r.indentSubject}</Link></td>
                  <td><DateLabel iso={r.awardedOn} /></td>
                  <td className="right"><MoneyLabel amountMinor={r.valueMinor} currency={r.currency} /></td>
                  <td className="mono"><a href={`/api/public/awards/${r.indentId}`} target="_blank" rel="noreferrer">/api/public/awards/{r.indentId}</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
