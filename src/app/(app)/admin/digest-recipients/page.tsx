import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { digestRecipientService } from '@/application/admin/AdminDigestRecipientService';
import { Empty } from '@/interfaces/ui/components/Empty';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';
import { RecipientsPanel } from './RecipientsPanel';
import { ClientToggleButton, DeleteRecipient } from './RowActions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Digest recipients • Admin' };

const ICON = {
  mail:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>,
  check: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg>,
  pause: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
};

export default async function DigestRecipientsPage() {
  const ctx = await requireRoles([Role.ADMIN]);
  const rows = await digestRecipientService.list(ctx);
  const active = rows.filter((r) => r.isActive).length;
  const paused = rows.length - active;
  return (
    <>
      <h1>Weekly digest recipients</h1>
      <p className="muted">
        Extra addresses the weekly summary is sent to, on top of the role-based defaults (every active <code>ADMIN</code>, <code>SECY_DP</code>, <code>DGDP</code>, <code>DP_N</code>) and the comma-separated <code>DIGEST_RECIPIENTS</code> env var. Duplicates are de-duped.
      </p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 14, marginBottom: 18 }}>
        <KpiCard accent="violet"  icon={ICON.mail}  label="Extra recipients" value={rows.length} sub="On top of role defaults" />
        <KpiCard accent="emerald" icon={ICON.check} label="Active"           value={active}      sub="Receiving the digest" />
        <KpiCard accent="amber"   icon={ICON.pause} label="Paused"           value={paused}      sub="Temporarily skipped" />
      </section>

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
