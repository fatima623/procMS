import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { loadIndentDetail } from '@/interfaces/ui/views/IndentViews';
import { StatusPill, toneForIndentStatus, toneForApprovalStatus } from '@/interfaces/ui/components/StatusPill';
import { MoneyLabel, MoneyCompact } from '@/interfaces/ui/components/Money';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { KpiCard, type Accent } from '@/interfaces/ui/components/KpiCard';
import { IndentActions } from './IndentActions';
import { Attachments } from './Attachments';
import { Comments } from './Comments';
import { commentService } from '@/application/comment/CommentService';

export const dynamic = 'force-dynamic';

const PRIORITY_ACCENT: Record<string, Accent> = { URGENT: 'coral', HIGH: 'amber', NORMAL: 'sky', LOW: 'violet' };
const H_ICON = {
  tag:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>,
  wallet: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h3"/><path d="M3 10h18"/></svg>,
  bolt:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h8l-1 8 10-12h-8z"/></svg>,
  users:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>,
  clock:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
};

export default async function IndentDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireSessionCtx();
  const indent = await loadIndentDetail(params.id);
  if (!indent) notFound();
  const comments = await commentService.listForIndent(indent.id);

  const statusAccent: Accent = (['CLOSED'].includes(indent.status)) ? 'emerald'
    : (['INDENT_REJECTED', 'BUDGET_REJECTED', 'CANCELLED'].includes(indent.status)) ? 'coral'
    : 'indigo';
  const priorityAccent = PRIORITY_ACCENT[indent.priority] ?? 'sky';

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>
            <span className="mono">{indent.indentNumber}</span>
          </h1>
          <div className="muted" style={{ marginTop: 4 }}>{indent.subject}</div>
        </div>
        <div className="grow" />
        <Link href={`/indents/${indent.id}/print`} className="btn" target="_blank">Print 🖨</Link>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KpiCard accent={statusAccent}  icon={H_ICON.tag}    label="Status"    value={indent.status.replace(/_/g, ' ')} sub={`FY ${indent.fiscalYearLabel}`} />
        <KpiCard accent="emerald"       icon={H_ICON.wallet} label="Estimated value" value={<MoneyCompact amountMinor={indent.estimatedValueMinor} currency={indent.currency} precision={2} />} sub={`${indent.items.length} line item${indent.items.length === 1 ? '' : 's'}`} />
        <KpiCard accent={priorityAccent} icon={H_ICON.bolt}  label="Priority"  value={indent.priority}                sub={`Type ${indent.type}`} />
        <KpiCard accent="sky"            icon={H_ICON.users} label="Section"   value={indent.sectionName}             sub={indent.assignedAdpName ? `ADP · ${indent.assignedAdpName}` : 'No ADP yet'} />
        <KpiCard accent="violet"         icon={H_ICON.clock} label="Submitted" value={indent.submittedAt ? <DateLabel iso={indent.submittedAt} /> : 'Draft'} sub={<>Created <DateLabel iso={indent.createdAt} /></>} />
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        <div>
          <section className="card">
            <h3>Header</h3>
            <dl style={{ display: 'grid', gridTemplateColumns: '160px 1fr', rowGap: 8, columnGap: 10, margin: 0 }}>
              <dt className="dim">Indenter</dt><dd>{indent.indenterName}</dd>
              <dt className="dim">Section</dt><dd>{indent.sectionName}</dd>
              <dt className="dim">Assigned ADP</dt><dd>{indent.assignedAdpName ?? <span className="muted">—</span>}</dd>
              <dt className="dim">Control number</dt><dd className="mono">{indent.controlNumber ?? <span className="muted">—</span>}</dd>
              <dt className="dim">Type / Priority</dt><dd>{indent.type} / {indent.priority}</dd>
              <dt className="dim">Estimated value</dt><dd><MoneyLabel amountMinor={indent.estimatedValueMinor} currency={indent.currency} /></dd>
              <dt className="dim">Fiscal year / Head</dt><dd>{indent.fiscalYearLabel} / <span className="mono">{indent.budgetHeadCode}</span></dd>
              <dt className="dim">Submitted</dt><dd><DateLabel iso={indent.submittedAt} /></dd>
              <dt className="dim">Created</dt><dd><DateLabel iso={indent.createdAt} /></dd>
            </dl>
            {indent.justification && (
              <>
                <h3>Justification</h3>
                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{indent.justification}</p>
              </>
            )}
          </section>

          <section className="card">
            <h3>Items ({indent.items.length})</h3>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Description</th>
                  <th className="right">Qty</th>
                  <th>UoM</th>
                  <th className="right">Unit price</th>
                </tr>
              </thead>
              <tbody>
                {indent.items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.lineNo}</td>
                    <td>{it.description}{it.itemCode ? <span className="muted mono"> ({it.itemCode})</span> : null}</td>
                    <td className="right mono">{it.quantity}</td>
                    <td>{it.uom}</td>
                    <td className="right"><MoneyLabel amountMinor={it.unitPriceMinor} currency={it.currency} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {indent.chains.length > 0 && (
            <section className="card">
              <h3>Approval chains</h3>
              {indent.chains.map((c) => (
                <div key={c.id} style={{ marginBottom: 18 }}>
                  <div className="row" style={{ marginBottom: 6 }}>
                    <strong>{c.subject.replace('_', ' ')}</strong>
                    <StatusPill tone={toneForApprovalStatus(c.status)}>{c.status}</StatusPill>
                  </div>
                  <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                    {c.steps.map((s) => (
                      <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', opacity: s.status === 'PENDING' && c.currentIndex === s.stepIndex ? 1 : 0.9 }}>
                        <span className="dim" style={{ width: 20, textAlign: 'right' }}>{s.stepIndex + 1}.</span>
                        <span style={{ width: 80, fontWeight: 600 }}>{s.role}</span>
                        <StatusPill tone={toneForApprovalStatus(s.status)}>{s.status}</StatusPill>
                        <span className="muted mono" style={{ marginLeft: 6, fontSize: 12 }}>
                          {s.decidedByName ? `${s.decidedByName} • ` : ''}<DateLabel iso={s.decidedAt} />
                        </span>
                        {s.comments && <span className="muted" style={{ marginLeft: 'auto', fontStyle: 'italic', maxWidth: '45%', textAlign: 'right' }}>“{s.comments}”</span>}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </section>
          )}

          <section className="card">
            <h3>Comments ({comments.length})</h3>
            <Comments indentId={indent.id} comments={comments} currentUserId={ctx.userId} />
          </section>

          {indent.observations.length > 0 && (
            <section className="card">
              <h3>Observations</h3>
              {indent.observations.map((o) => (
                <div key={o.id} style={{ borderBottom: '1px solid var(--border)', padding: '8px 0' }}>
                  <div className="row">
                    <span className="dim">{o.raisedByName}</span>
                    <StatusPill tone={o.status === 'OPEN' ? 'warn' : 'ok'}>{o.status}</StatusPill>
                    <span className="grow" />
                    <span className="muted"><DateLabel iso={o.createdAt} /></span>
                  </div>
                  <div style={{ marginTop: 4 }}>{o.note}</div>
                </div>
              ))}
            </section>
          )}
        </div>

        <aside>
          <section className="card">
            <h3>Pipeline</h3>
            <div className="stack-sm">
              <div className="row"><span className="grow dim">IT Proforma</span>{indent.itPerforma ? <StatusPill tone="info">{indent.itPerforma.status}</StatusPill> : <span className="muted">—</span>}</div>
              {indent.itPerforma && (
                <div className="row"><span className="grow dim">Invited firms</span><span className="mono">{indent.itPerforma.invitedFirmCount}</span></div>
              )}
              <div className="row"><span className="grow dim">Technical offers</span><span className="mono">{indent.technicalOfferCount}</span></div>
              <div className="row"><span className="grow dim">TSR</span>{indent.tsr ? <StatusPill tone="info">{indent.tsr.status}</StatusPill> : <span className="muted">—</span>}</div>
              <div className="row"><span className="grow dim">Commercial offers</span><span className="mono">{indent.commercialOfferCount}</span></div>
              <div className="row"><span className="grow dim">CST</span>{indent.cst ? <StatusPill tone="info">{indent.cst.status}{indent.cst.singleQuote ? ' (single)' : ''}</StatusPill> : <span className="muted">—</span>}</div>
              <div className="row"><span className="grow dim">PR</span>{indent.pr ? <StatusPill tone="ok">{indent.pr.status}</StatusPill> : <span className="muted">—</span>}</div>
            </div>
            {indent.tsr && (
              <Link href={`/tsrs/${indent.tsr.id}`} className="btn" style={{ marginTop: 10 }}>Open TSR →</Link>
            )}
          </section>

          <section className="card">
            <h3>Attachments ({indent.attachments.length})</h3>
            <Attachments indentId={indent.id} attachments={indent.attachments} />
          </section>

          <section className="card">
            <h3>Actions</h3>
            <IndentActions
              indentId={indent.id}
              status={indent.status}
              type={indent.type}
              roles={ctx.roles as Role[]}
              isOwner={indent.indenterId === ctx.userId}
              itPerformaId={indent.itPerforma?.id ?? null}
              cstId={indent.cst?.id ?? null}
              prId={indent.pr?.id ?? null}
              prStatus={indent.pr?.status ?? null}
            />
          </section>
        </aside>
      </div>
    </>
  );
}
