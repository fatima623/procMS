import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listRetentionHolds } from '@/interfaces/ui/views/TransparencyViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { ReleaseHoldButton } from './ReleaseHoldButton';

export const metadata = { title: 'Retention holds • Procurement' };
export const dynamic = 'force-dynamic';

export default async function RetentionHoldsPage() {
  await requireRoles([Role.ADMIN, Role.DGDP, Role.SECY_DP, Role.DP_N]);
  const rows = await listRetentionHolds();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Retention holds</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/transparency/retention-holds/new">+ Place hold</Link>
      </div>
      <p className="muted">PPRA Rule 46 — procurement proceedings are retained for a minimum of five years. A retention hold prevents disposal while litigation, audit, or an investigation is live.</p>

      {rows.length === 0 ? (
        <Empty>No retention holds on record.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Reason</th>
                <th>Placed</th>
                <th>Released</th>
                <th>Status</th>
                <th>Notes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.subjectType} / {r.subjectId}</td>
                  <td><StatusPill tone="warn">{r.reason.replace(/_/g, ' ')}</StatusPill></td>
                  <td><DateLabel iso={r.placedOn} /></td>
                  <td><DateLabel iso={r.releasedOn} /></td>
                  <td><StatusPill tone={r.releasedOn ? 'ok' : 'danger'}>{r.releasedOn ? 'RELEASED' : 'ACTIVE'}</StatusPill></td>
                  <td style={{ maxWidth: 280 }}>{r.notes ?? <span className="muted">—</span>}</td>
                  <td className="right">{!r.releasedOn && <ReleaseHoldButton id={r.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
