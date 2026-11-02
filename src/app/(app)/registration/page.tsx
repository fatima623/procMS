import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listFirmRegistrations } from '@/interfaces/ui/views/FirmRegistrationViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { RegistrationActions } from './RegistrationActions';

export const metadata = { title: 'Firm registration • Procurement' };
export const dynamic = 'force-dynamic';

export default async function RegistrationsPage() {
  await requireRoles([Role.ADMIN, Role.COORD_STAFF, Role.ADP_STAFF]);
  const rows = await listFirmRegistrations();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Firm registration / pre-qualification</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/registration/new">+ Submit registration</Link>
      </div>
      <p className="muted">PPRA Rules 15–16 and DPP&amp;I-35 Chapter XXVI — a firm must hold an <strong>APPROVED</strong> registration whose validity window covers today before it may be invited to an IT.</p>

      {rows.length === 0 ? (
        <Empty>No firm registrations recorded yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Firm</th>
                <th>Category</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Issued</th>
                <th>Valid until</th>
                <th>Review notes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const tone =
                  r.status === 'APPROVED'
                    ? r.derivedExpired
                      ? 'warn'
                      : 'ok'
                    : r.status === 'REJECTED' || r.status === 'REVOKED'
                    ? 'danger'
                    : 'info';
                const label = r.status === 'APPROVED' && r.derivedExpired ? 'APPROVED (expired)' : r.status;
                return (
                  <tr key={r.id}>
                    <td>{r.firmName}</td>
                    <td><StatusPill tone="info">{r.category.replace(/_/g, ' ')}</StatusPill></td>
                    <td><StatusPill tone={tone}>{label}</StatusPill></td>
                    <td><DateLabel iso={r.submittedOn} /></td>
                    <td><DateLabel iso={r.issuedOn} /></td>
                    <td><DateLabel iso={r.validUntil} /></td>
                    <td style={{ maxWidth: 320 }}>{r.reviewNotes ?? <span className="muted">—</span>}</td>
                    <td className="right"><RegistrationActions id={r.id} status={r.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
