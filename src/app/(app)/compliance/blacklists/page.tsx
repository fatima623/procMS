import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listBlacklists } from '@/interfaces/ui/views/ComplianceViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { RevokeBlacklistButton } from './RevokeBlacklistButton';

export const metadata = { title: 'Blacklists • Procurement' };
export const dynamic = 'force-dynamic';

export default async function BlacklistsPage() {
  await requireRoles([Role.ADMIN, Role.DGDP, Role.SECY_DP, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listBlacklists();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Blacklists</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/compliance/blacklists/new">+ Declare blacklist</Link>
      </div>
      <p className="muted">PPRA Rule 19 — a bidder may be declared untrustworthy for corrupt / fraudulent / coercive / collusive practice, performance failure, or bid deviation. The bidder may file a review petition with the Authority within 30 days.</p>

      {rows.length === 0 ? (
        <Empty>No blacklists recorded yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Firm</th>
                <th>Ground</th>
                <th>Declared</th>
                <th>Effective from</th>
                <th>Effective until</th>
                <th>Status</th>
                <th>Revoked</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.firmName}</td>
                  <td><StatusPill tone="danger">{r.ground.replace(/_/g, ' ')}</StatusPill></td>
                  <td><DateLabel iso={r.declaredOn} /></td>
                  <td><DateLabel iso={r.effectiveFrom} /></td>
                  <td>{r.effectiveUntil ? <DateLabel iso={r.effectiveUntil} /> : <span className="muted">indefinite</span>}</td>
                  <td><StatusPill tone={r.status === 'ACTIVE' ? 'danger' : r.status === 'REVOKED' ? 'ok' : 'warn'}>{r.status}</StatusPill></td>
                  <td><DateLabel iso={r.revokedOn} /></td>
                  <td className="right">{r.status === 'ACTIVE' && <RevokeBlacklistButton id={r.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
