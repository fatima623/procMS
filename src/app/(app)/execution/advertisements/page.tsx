import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listAdvertisements } from '@/interfaces/ui/views/WorkflowListViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Advertisements • Procurement' };
export const dynamic = 'force-dynamic';

export default async function AdvertisementsPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listAdvertisements();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Advertisements</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/execution/advertisements/new">+ Record advertisement</Link>
      </div>
      <p className="muted">PPRA Rule 12 — procurements &gt; PKR 500,000 must appear on the PPRA website; &gt; PKR 3,000,000 also in two widely circulated newspapers.</p>

      {rows.length === 0 ? (
        <Empty>No advertisements recorded yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Indent</th>
                <th>Medium</th>
                <th>Published</th>
                <th>Bidding docs</th>
                <th>Submission deadline</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/indents/${r.indentId}`}>{r.indentSubject}</Link></td>
                  <td><StatusPill tone="info">{r.medium}</StatusPill></td>
                  <td><DateLabel iso={r.publishedOn} /></td>
                  <td><DateLabel iso={r.biddingDocsIssuedOn} /></td>
                  <td><DateLabel iso={r.bidSubmissionDeadline} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
