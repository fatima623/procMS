import { notFound } from 'next/navigation';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { loadIndentDetail } from '@/interfaces/ui/views/IndentViews';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill, toneForIndentStatus, toneForApprovalStatus } from '@/interfaces/ui/components/StatusPill';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Print indent' };

/**
 * Printable one-page summary of the whole indent file. Includes items, every
 * approval chain, observations and (when present) the IT reference, CST and
 * PR. Signature strip at the bottom shows the chain roles whose approval
 * matters for the current stage.
 */
export default async function PrintIndentPage({ params }: { params: { id: string } }) {
  await requireSessionCtx();
  const indent = await loadIndentDetail(params.id);
  if (!indent) notFound();

  return (
    <article className="print-artefact">
      <PrintToolbar />

      <header className="print-head">
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>Indent File</h1>
          <div className="muted" style={{ fontSize: 12 }}>Directorate of Procurement — Navy (DP-N)</div>
        </div>
        <div className="right">
          <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{indent.indentNumber}</div>
          {indent.controlNumber && <div className="mono muted" style={{ fontSize: 12 }}>Control: {indent.controlNumber}</div>}
          <div style={{ marginTop: 4 }}><StatusPill tone={toneForIndentStatus(indent.status)}>{indent.status}</StatusPill></div>
        </div>
      </header>

      <section className="print-section">
        <h2>Header</h2>
        <table className="meta-table">
          <tbody>
            <tr><th>Subject</th><td>{indent.subject}</td></tr>
            <tr><th>Indenter</th><td>{indent.indenterName}</td></tr>
            <tr><th>Owning section</th><td>{indent.sectionName}</td></tr>
            <tr><th>Assigned ADP</th><td>{indent.assignedAdpName ?? '—'}</td></tr>
            <tr><th>Type / Priority</th><td>{indent.type} / {indent.priority}</td></tr>
            <tr><th>Estimated value</th><td><MoneyLabel amountMinor={indent.estimatedValueMinor} currency={indent.currency} /></td></tr>
            <tr><th>Fiscal year / Head</th><td>{indent.fiscalYearLabel} / <span className="mono">{indent.budgetHeadCode}</span></td></tr>
            <tr><th>Submitted</th><td><DateLabel iso={indent.submittedAt} /></td></tr>
          </tbody>
        </table>
        {indent.justification && (
          <>
            <h3 style={{ marginTop: 10 }}>Justification</h3>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{indent.justification}</p>
          </>
        )}
      </section>

      <section className="print-section">
        <h2>Items ({indent.items.length})</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th>Description</th>
              <th className="right">Qty</th>
              <th>UoM</th>
              <th className="right">Unit price</th>
              <th className="right">Line total</th>
            </tr>
          </thead>
          <tbody>
            {indent.items.map((it) => {
              const qty = Number(it.quantity);
              const unit = BigInt(it.unitPriceMinor);
              const lineTotal = (unit * BigInt(Math.round(qty * 10_000))) / 10_000n;
              return (
                <tr key={it.id}>
                  <td>{it.lineNo}</td>
                  <td>{it.description}{it.itemCode ? <span className="muted mono"> ({it.itemCode})</span> : null}</td>
                  <td className="right mono">{it.quantity}</td>
                  <td>{it.uom}</td>
                  <td className="right"><MoneyLabel amountMinor={it.unitPriceMinor} currency={it.currency} /></td>
                  <td className="right"><MoneyLabel amountMinor={lineTotal.toString()} currency={it.currency} /></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="right dim">Grand total</td>
              <td className="right"><MoneyLabel amountMinor={indent.estimatedValueMinor} currency={indent.currency} /></td>
            </tr>
          </tfoot>
        </table>
      </section>

      {indent.chains.length > 0 && (
        <section className="print-section">
          <h2>Approval history</h2>
          {indent.chains.map((c) => (
            <div key={c.id} style={{ marginBottom: 10 }}>
              <div className="row" style={{ marginBottom: 4 }}>
                <strong>{c.subject.replace('_', ' ')}</strong>
                <StatusPill tone={toneForApprovalStatus(c.status)}>{c.status}</StatusPill>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 30 }}>#</th>
                    <th>Role</th>
                    <th>Decision</th>
                    <th>Decided by</th>
                    <th>Decided at</th>
                    <th>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {c.steps.map((s) => (
                    <tr key={s.id}>
                      <td>{s.stepIndex + 1}</td>
                      <td>{s.role}</td>
                      <td>{s.status}</td>
                      <td>{s.decidedByName ?? '—'}</td>
                      <td><DateLabel iso={s.decidedAt} /></td>
                      <td style={{ fontStyle: 'italic' }}>{s.comments ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      )}

      {indent.observations.length > 0 && (
        <section className="print-section">
          <h2>Observations</h2>
          <table className="data-table">
            <thead>
              <tr><th>Raised</th><th>By</th><th>Status</th><th>Note</th></tr>
            </thead>
            <tbody>
              {indent.observations.map((o) => (
                <tr key={o.id}>
                  <td><DateLabel iso={o.createdAt} /></td>
                  <td>{o.raisedByName}</td>
                  <td>{o.status}</td>
                  <td>{o.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {indent.itPerforma && (
        <section className="print-section">
          <h2>IT Issue Proforma</h2>
          <table className="meta-table">
            <tbody>
              <tr><th>Reference</th><td className="mono">{indent.itPerforma.reference}</td></tr>
              <tr><th>Status</th><td>{indent.itPerforma.status}</td></tr>
              <tr><th>Invited firms</th><td>{indent.itPerforma.invitedFirmCount}</td></tr>
              <tr><th>Dispatched</th><td><DateLabel iso={indent.itPerforma.dispatchedAt} /></td></tr>
              <tr><th>Closing</th><td><DateLabel iso={indent.itPerforma.closingAt} /></td></tr>
            </tbody>
          </table>
        </section>
      )}

      {indent.cst && (
        <section className="print-section">
          <h2>Comparative Statement</h2>
          <table className="meta-table">
            <tbody>
              <tr><th>Status</th><td>{indent.cst.status}{indent.cst.singleQuote ? ' (single-quote)' : ''}</td></tr>
            </tbody>
          </table>
        </section>
      )}

      {indent.pr && (
        <section className="print-section">
          <h2>Purchase Requisition</h2>
          <table className="meta-table">
            <tbody>
              <tr><th>PR number</th><td className="mono">{indent.pr.prNumber}</td></tr>
              <tr><th>Status</th><td>{indent.pr.status}</td></tr>
            </tbody>
          </table>
        </section>
      )}

      <section className="print-section signatures">
        <h2>Signatures</h2>
        <div className="sig-grid">
          <SigBlock label="Indenter" name={indent.indenterName} />
          <SigBlock label="Concerned ADP" name={indent.assignedAdpName ?? '—'} />
          <SigBlock label="SUPTD" />
          <SigBlock label="DP(N)" />
          <SigBlock label="Secy DP" />
        </div>
      </section>

      <footer className="print-footer muted">
        <span>Generated {new Date().toUTCString()}</span>
        <span>Page 1 — Indent {indent.indentNumber}</span>
      </footer>

      <style>{`
        .print-artefact { background: #fff; color: #111; max-width: 820px; margin: 0 auto; padding: 24px; }
        .print-head { display: flex; align-items: start; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 12px; }
        .print-section { margin-top: 18px; page-break-inside: avoid; }
        .print-section h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px; color: #333; border-bottom: 1px solid #999; padding-bottom: 4px; }
        .print-section h3 { font-size: 12px; margin: 10px 0 4px; color: #333; }
        .meta-table { width: 100%; border-collapse: collapse; }
        .meta-table th { width: 160px; text-align: left; color: #555; font-weight: 500; padding: 3px 6px 3px 0; font-size: 12px; vertical-align: top; }
        .meta-table td { padding: 3px 0; font-size: 13px; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .data-table th, .data-table td { padding: 4px 6px; border-bottom: 1px solid #ddd; text-align: left; vertical-align: top; }
        .data-table th { background: #f3f3f3; font-weight: 600; }
        .data-table .right { text-align: right; }
        .sig-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-top: 30px; }
        .sig-block { border-top: 1px solid #333; padding-top: 6px; min-height: 60px; text-align: center; font-size: 11px; }
        .print-footer { display: flex; justify-content: space-between; margin-top: 24px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 11px; }

        @media print {
          .print-toolbar { display: none; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>
    </article>
  );
}

function SigBlock({ label, name }: { label: string; name?: string }) {
  return (
    <div className="sig-block">
      <div style={{ fontWeight: 600 }}>{label}</div>
      {name && <div className="muted">{name}</div>}
    </div>
  );
}

function PrintToolbar() {
  return (
    <div className="print-toolbar row" style={{ marginBottom: 16, gap: 8 }}>
      <PrintButton />
      <a href="../" className="btn btn-ghost">← Back to indent</a>
    </div>
  );
}

/** Client component to trigger window.print(). */
function PrintButton() {
  // Server component wrapper — the actual button lives in a client component.
  // We inline a tiny script instead of pulling in another file, since this is
  // a leaf-level toolbar only used by print pages.
  return (
    <>
      <button className="btn btn-primary" onClick={undefined} id="__print_btn">Print 🖨</button>
      <script dangerouslySetInnerHTML={{ __html: `document.getElementById('__print_btn').addEventListener('click', () => window.print());` }} />
    </>
  );
}
