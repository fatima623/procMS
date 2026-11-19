import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRoles } from '@/interfaces/ui/auth';
import { AUDIT_ROLES } from '@/infrastructure/audit/AuditService';
import { loadAuditRecord } from '@/interfaces/ui/views/AuditRecordViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill, type PillTone } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { RecordActions } from './RecordActions';
import { ObjectionForm } from './ObjectionForm';
import { ObjectionActions } from './ObjectionActions';
import { ItemForm } from './ItemForm';
import { ItemActions } from './ItemActions';
import { ParaForm } from './ParaForm';

export const metadata = { title: 'Audit record • Procurement' };
export const dynamic = 'force-dynamic';

const TABS = [
  { key: 'info', label: 'Audit Info' },
  { key: 'objections', label: 'Objection List' },
  { key: 'items', label: 'Items' },
  { key: 'paras', label: 'Draft Paras' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const TONE: Record<string, PillTone> = {
  OPEN: 'info', CLOSED: 'default', SETTLED: 'ok',
  REPLIED: 'warn', AWAITED: 'info', REPLY: 'warn', CLEARED: 'ok',
};

export default async function AuditRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  await requireRoles(AUDIT_ROLES);
  const rec = await loadAuditRecord(id);
  if (!rec) notFound();
  const tab: TabKey = (TABS.find((t) => t.key === sp.tab)?.key) ?? 'info';
  const editable = rec.status === 'OPEN';

  return (
    <>
      <div className="row" style={{ marginBottom: 6 }}>
        <Link href="/audit/records" className="muted">← Audit records</Link>
      </div>
      <div className="row" style={{ marginBottom: 12, gap: 10 }}>
        <h1 style={{ margin: 0 }}>{rec.auditSection}</h1>
        <StatusPill tone={TONE[rec.status] ?? 'default'}>{rec.status}</StatusPill>
      </div>
      {!editable && (
        <p className="muted">This audit record is {rec.status} — no further changes can be made.</p>
      )}

      <nav className="row" style={{ gap: 6, marginBottom: 14 }} aria-label="Audit record tabs">
        {TABS.map((t) => {
          const count = t.key === 'objections' ? rec.objections.length
            : t.key === 'items' ? rec.items.length
            : t.key === 'paras' ? rec.items.reduce((n, i) => n + i.draftParas.length, 0)
            : null;
          return (
            <Link
              key={t.key}
              href={`/audit/records/${rec.id}?tab=${t.key}`}
              className={t.key === tab ? 'btn btn-primary' : 'btn'}
              aria-current={t.key === tab ? 'page' : undefined}
            >
              {t.label}{count !== null ? ` (${count})` : ''}
            </Link>
          );
        })}
      </nav>

      {tab === 'info' && (
        <section className="card" style={{ padding: 20 }}>
          <table className="table">
            <tbody>
              <tr><th style={{ width: 220 }}>Audit section</th><td>{rec.auditSection}</td></tr>
              <tr><th>Fiscal year</th><td>{rec.fiscalYearLabel ?? '—'}</td></tr>
              <tr><th>Status</th><td>{rec.status}</td></tr>
              <tr><th>Raised on</th><td><DateLabel iso={rec.raisedOn} /></td></tr>
              <tr>
                <th>Subject indent</th>
                <td>{rec.subjectIndent ? <Link href={`/indents/${rec.subjectIndent.id}`}>{rec.subjectIndent.label}</Link> : <span className="muted">—</span>}</td>
              </tr>
              <tr><th>Subject contract</th><td className="mono">{rec.subjectContractLabel ?? <span className="muted">—</span>}</td></tr>
              <tr><th>Document</th><td className="mono">{rec.documentKey ?? <span className="muted">—</span>}</td></tr>
              <tr><th>Objections</th><td>{rec.objections.length} ({rec.objections.filter((o) => o.status === 'SETTLED').length} settled)</td></tr>
              <tr><th>Items</th><td>{rec.items.length} ({rec.items.filter((i) => i.status === 'CLEARED').length} cleared)</td></tr>
              <tr><th>Created by</th><td>{rec.createdByName ?? '—'} · <DateLabel iso={rec.createdAt} /></td></tr>
            </tbody>
          </table>
          {editable && <RecordActions recordId={rec.id} />}
        </section>
      )}

      {tab === 'objections' && (
        <section className="card" style={{ padding: 20 }}>
          {rec.objections.length === 0 ? (
            <Empty>No objections yet.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Para</th><th>Ground</th><th>Amount involved</th><th>Status</th><th>Reply</th><th>Linked items</th>
                  {editable && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rec.objections.map((o) => (
                  <tr key={o.id}>
                    <td className="mono">{o.para}</td>
                    <td style={{ whiteSpace: 'pre-wrap', maxWidth: 320 }}>{o.ground}</td>
                    <td className="mono nowrap">{o.amountDisplay ?? <span className="muted">—</span>}</td>
                    <td><StatusPill tone={TONE[o.status] ?? 'default'}>{o.status}</StatusPill></td>
                    <td style={{ whiteSpace: 'pre-wrap', maxWidth: 280 }}>
                      {o.replyText ? (
                        <>
                          {o.replyText}
                          <div className="muted" style={{ fontSize: 12 }}>{o.repliedByName ?? '—'} · <DateLabel iso={o.repliedOn} /></div>
                        </>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td className="mono">{o.linkedItemCount}</td>
                    {editable && <td><ObjectionActions recordId={rec.id} objectionId={o.id} para={o.para} status={o.status} /></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {editable && <ObjectionForm recordId={rec.id} />}
        </section>
      )}

      {tab === 'items' && (
        <section className="card" style={{ padding: 20 }}>
          {rec.items.length === 0 ? (
            <Empty>No items yet.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th><th>Status</th><th>Reply</th><th>Linked objections (para)</th><th>Draft paras</th>
                  {editable && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rec.items.map((i) => (
                  <tr key={i.id}>
                    <td style={{ whiteSpace: 'pre-wrap', maxWidth: 320 }}>{i.itemText}</td>
                    <td><StatusPill tone={TONE[i.status] ?? 'default'}>{i.status}</StatusPill></td>
                    <td style={{ whiteSpace: 'pre-wrap', maxWidth: 260 }}>{i.replyText ?? <span className="muted">—</span>}</td>
                    <td className="mono">{i.linkedObjectionParas.length ? i.linkedObjectionParas.join(', ') : <span className="muted">—</span>}</td>
                    <td className="mono">{i.draftParas.length}</td>
                    {editable && (
                      <td>
                        <ItemActions
                          recordId={rec.id}
                          itemId={i.id}
                          status={i.status}
                          linkableObjections={rec.objections
                            .filter((o) => !i.linkedObjectionIds.includes(o.id))
                            .map((o) => ({ id: o.id, label: `Para ${o.para}` }))}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {editable && <ItemForm recordId={rec.id} />}
        </section>
      )}

      {tab === 'paras' && (
        <section className="card" style={{ padding: 20 }}>
          {rec.items.length === 0 ? (
            <Empty>Add an audit item first — draft paras are recorded against an item.</Empty>
          ) : (
            <>
              {rec.items.map((i, idx) => (
                <div key={i.id} style={{ marginBottom: 16 }}>
                  <h3 style={{ margin: '0 0 6px' }}>Item {idx + 1}: <span style={{ fontWeight: 400 }}>{i.itemText.slice(0, 120)}</span></h3>
                  {i.draftParas.length === 0 ? (
                    <p className="muted" style={{ margin: 0 }}>No draft paras.</p>
                  ) : (
                    <table className="table">
                      <thead><tr><th>Draft para</th><th style={{ width: 160 }}>Submitted on</th><th style={{ width: 180 }}>Entered by</th></tr></thead>
                      <tbody>
                        {i.draftParas.map((p) => (
                          <tr key={p.id}>
                            <td style={{ whiteSpace: 'pre-wrap' }}>{p.paraText}</td>
                            <td><DateLabel iso={p.submittedOn} /></td>
                            <td>{p.createdByName ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
              {editable && (
                <ParaForm
                  recordId={rec.id}
                  items={rec.items.map((i, idx) => ({ id: i.id, label: `Item ${idx + 1}: ${i.itemText.slice(0, 80)}` }))}
                />
              )}
            </>
          )}
        </section>
      )}
    </>
  );
}
