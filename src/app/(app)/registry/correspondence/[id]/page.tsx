import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { isRegistryUser } from '@/infrastructure/registry/RegistryService';
import { listAssignableUsers, loadCorrespondence } from '@/interfaces/ui/views/RegistryViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { AssignForm } from './AssignForm';
import { MinuteForm } from './MinuteForm';
import { StampForm } from '../../postal-stamps/StampForm';

export const metadata = { title: 'Correspondence • Procurement' };
export const dynamic = 'force-dynamic';

export default async function CorrespondenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireSessionCtx();
  const row = await loadCorrespondence(id);
  if (!row) notFound();
  const registry = isRegistryUser(ctx);
  if (!registry && row.assignedToUserId !== ctx.userId) redirect('/dashboard');
  const users = registry ? await listAssignableUsers() : [];

  return (
    <>
      <div className="row" style={{ marginBottom: 6 }}>
        <Link href="/registry/correspondence" className="muted">← Central Registry</Link>
      </div>
      <div className="row" style={{ marginBottom: 16, gap: 10 }}>
        <h1 style={{ margin: 0 }} className="mono">{row.controlNumber}</h1>
        <StatusPill tone={row.direction === 'INWARD' ? 'info' : 'ok'}>{row.direction}</StatusPill>
      </div>

      <section className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Details</h2>
        <table className="table">
          <tbody>
            <tr><th style={{ width: 220 }}>Subject</th><td>{row.subject}</td></tr>
            <tr><th>From</th><td>{row.fromParty}</td></tr>
            <tr><th>To</th><td>{row.toParty}</td></tr>
            <tr><th>{row.direction === 'INWARD' ? 'Received on' : 'Sent on'}</th><td><DateLabel iso={row.receivedOrSentOn} /></td></tr>
            <tr><th>Assigned to</th><td>{row.assignedToName ?? <span className="muted">Not assigned</span>}</td></tr>
            <tr><th>Remarks</th><td style={{ whiteSpace: 'pre-wrap' }}>{row.remarks ?? <span className="muted">—</span>}</td></tr>
            <tr><th>Document</th><td className="mono">{row.documentKey ?? <span className="muted">—</span>}</td></tr>
            <tr><th>Filed by</th><td>{row.createdByName ?? '—'} · <DateLabel iso={row.createdAt} /></td></tr>
          </tbody>
        </table>
        {registry && <AssignForm id={row.id} current={row.assignedToUserId} users={users} />}
      </section>

      <section className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Minutes ({row.minutes.length})</h2>
        <p className="muted" style={{ marginTop: 0 }}>IMF = Internal Minute File · EMF = External Minute File</p>
        {row.minutes.length === 0 ? (
          <Empty>No minutes yet.</Empty>
        ) : (
          <table className="table">
            <thead><tr><th style={{ width: 80 }}>Kind</th><th>Minute</th><th style={{ width: 200 }}>By</th><th style={{ width: 140 }}>On</th></tr></thead>
            <tbody>
              {row.minutes.map((m) => (
                <tr key={m.id}>
                  <td><StatusPill tone={m.kind === 'IMF' ? 'info' : 'warn'}>{m.kind}</StatusPill></td>
                  <td style={{ whiteSpace: 'pre-wrap' }}>{m.text}</td>
                  <td>{m.authorName ?? '—'}</td>
                  <td><DateLabel iso={m.createdAt} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <MinuteForm correspondenceId={row.id} />
      </section>

      <section className="card" style={{ padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>Postal stamps ({row.postalStamps.length})</h2>
        {row.postalStamps.length === 0 ? (
          <Empty>No postal stamps recorded for this letter.</Empty>
        ) : (
          <table className="table">
            <thead><tr><th>Used on</th><th>Denomination (PKR)</th><th>Qty</th><th>Total (PKR)</th><th>Entered by</th></tr></thead>
            <tbody>
              {row.postalStamps.map((s) => (
                <tr key={s.id}>
                  <td><DateLabel iso={s.usedOn} /></td>
                  <td className="mono">{s.denomination}</td>
                  <td className="mono">{s.quantity}</td>
                  <td className="mono">{s.total}</td>
                  <td>{s.enteredByName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {registry && row.direction === 'OUTWARD' && <StampForm correspondenceId={row.id} />}
        {registry && row.direction === 'INWARD' && <p className="muted">Postal stamps apply to outward mail only.</p>}
      </section>
    </>
  );
}
