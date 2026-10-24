import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { digestRecipientService } from '@/application/admin/AdminDigestRecipientService';
import { Empty } from '@/interfaces/ui/components/Empty';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { RecipientsPanel } from './RecipientsPanel';
import { ClientToggleButton, DeleteRecipient } from './RowActions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Digest recipients • Admin' };

export default async function DigestRecipientsPage() {
  const ctx = await requireRoles([Role.ADMIN]);
  const rows = await digestRecipientService.list(ctx);
  return (
    <>
      <h1>Weekly digest recipients</h1>
      <p className="muted">
        Extra addresses the weekly summary is sent to, on top of the role-based defaults (every active <code>ADMIN</code>, <code>SECY_DP</code>, <code>DGDP</code>, <code>DP_N</code>) and the comma-separated <code>DIGEST_RECIPIENTS</code> env var. Duplicates are de-duped.
      </p>

      <RecipientsPanel />

      {rows.length === 0 ? (
        <Empty>No extra recipients configured yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr><th>Email</th><th>Label</th><th>Status</th><th>Added</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.email}</td>
                  <td>{r.label ?? <span className="muted">—</span>}</td>
                  <td>{r.isActive ? <StatusPill tone="ok">Active</StatusPill> : <StatusPill tone="warn">Paused</StatusPill>}</td>
                  <td><DateLabel iso={r.createdAt} /></td>
                  <td className="right" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <ClientToggleButton id={r.id} isActive={r.isActive} />
                    <DeleteRecipient id={r.id} email={r.email} />
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
