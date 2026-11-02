import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listBiddingTemplates } from '@/interfaces/ui/views/PlanningViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { RetireTemplateButton } from './RetireTemplateButton';

export const metadata = { title: 'Bidding templates • Procurement' };
export const dynamic = 'force-dynamic';

export default async function BiddingTemplatesPage() {
  await requireRoles([Role.ADMIN, Role.COORD_STAFF]);
  const rows = await listBiddingTemplates();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Bidding document templates</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/planning/bidding-templates/new">+ Register template</Link>
      </div>
      <p className="muted">PPRA Rule 23(4) — procuring agencies <strong>shall use</strong> the standard bidding documents issued by PPRA. Keep the library versioned here.</p>

      {rows.length === 0 ? (
        <Empty>No templates registered yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Kind</th>
                <th>Name</th>
                <th>Revision</th>
                <th>Published</th>
                <th>Status</th>
                <th>Summary</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><StatusPill tone="info">{r.kind}</StatusPill></td>
                  <td>{r.name}</td>
                  <td className="mono">{r.revision}</td>
                  <td><DateLabel iso={r.publishedOn} /></td>
                  <td><StatusPill tone={r.isActive ? 'ok' : 'warn'}>{r.isActive ? 'ACTIVE' : 'RETIRED'}</StatusPill></td>
                  <td style={{ maxWidth: 360 }}>{r.summary ?? <span className="muted">—</span>}</td>
                  <td className="right">{r.isActive && <RetireTemplateButton id={r.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
