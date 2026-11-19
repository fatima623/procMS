import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRoles } from '@/interfaces/ui/auth';
import { LEGAL_ROLES } from '@/infrastructure/legal/CourtCaseService';
import { loadCourtCase } from '@/interfaces/ui/views/CourtCaseViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill, type PillTone } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { ProceedingForm } from './ProceedingForm';
import { StatusActions } from './StatusActions';

export const metadata = { title: 'Court case • Procurement' };
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, PillTone> = { PENDING: 'warn', CLOSED: 'default', DISPOSED_OFF: 'ok' };

export default async function CourtCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRoles(LEGAL_ROLES);
  const c = await loadCourtCase(id);
  if (!c) notFound();
  const pending = c.status === 'PENDING';

  return (
    <>
      <div className="row" style={{ marginBottom: 6 }}>
        <Link href="/legal/court-cases" className="muted">← Court cases</Link>
      </div>
      <div className="row" style={{ marginBottom: 16, gap: 10 }}>
        <h1 style={{ margin: 0 }} className="mono">{c.caseNumber}</h1>
        <StatusPill tone={STATUS_TONE[c.status] ?? 'default'}>{c.status}</StatusPill>
      </div>

      <section className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Case information</h2>
        <table className="table">
          <tbody>
            <tr><th style={{ width: 220 }}>Case number</th><td className="mono">{c.caseNumber}</td></tr>
            <tr><th>Court</th><td>{c.court}</td></tr>
            <tr><th>Party</th><td>{c.party}</td></tr>
            <tr><th>Counter-party</th><td>{c.counterParty}</td></tr>
            <tr><th>Status</th><td>{c.status}</td></tr>
            <tr><th>Filed on</th><td><DateLabel iso={c.filedOn} /></td></tr>
            <tr><th>Next hearing</th><td><DateLabel iso={c.nextHearingDate} /></td></tr>
            <tr>
              <th>Related indent</th>
              <td>{c.relatedIndent ? <Link href={`/indents/${c.relatedIndent.id}`}>{c.relatedIndent.label}</Link> : <span className="muted">—</span>}</td>
            </tr>
            <tr><th>Related contract</th><td className="mono">{c.relatedContractLabel ?? <span className="muted">—</span>}</td></tr>
            <tr><th>Document</th><td className="mono">{c.documentKey ?? <span className="muted">—</span>}</td></tr>
            <tr><th>Recorded by</th><td>{c.createdByName ?? '—'} · <DateLabel iso={c.createdAt} /></td></tr>
          </tbody>
        </table>
        {pending ? (
          <StatusActions caseId={c.id} caseNumber={c.caseNumber} />
        ) : (
          <p className="muted" style={{ marginBottom: 0 }}>This case is {c.status} — it is final and read-only.</p>
        )}
      </section>

      <section className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Court proceeding history ({c.proceedings.length})</h2>
        {c.proceedings.length === 0 ? (
          <Empty>No proceedings recorded yet.</Empty>
        ) : (
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {c.proceedings.map((p) => (
              <li key={p.id} style={{ borderLeft: '3px solid currentColor', paddingLeft: 12, marginBottom: 14 }}>
                <table className="table">
                  <tbody>
                    <tr><th style={{ width: 180 }}>Hearing date</th><td><DateLabel iso={p.hearingDate} /></td></tr>
                    <tr><th>Outcome</th><td>{p.outcome}</td></tr>
                    <tr><th>Next hearing date</th><td><DateLabel iso={p.nextHearingDate} /></td></tr>
                    {p.notes && <tr><th>Notes</th><td style={{ whiteSpace: 'pre-wrap' }}>{p.notes}</td></tr>}
                    {p.documentKey && <tr><th>Document</th><td className="mono">{p.documentKey}</td></tr>}
                    <tr><th>Entered by</th><td>{p.createdByName ?? '—'}</td></tr>
                  </tbody>
                </table>
              </li>
            ))}
          </ol>
        )}
      </section>

      {pending && (
        <section className="card" style={{ padding: 20 }}>
          <h2 style={{ marginTop: 0 }}>Add proceeding</h2>
          <ProceedingForm caseId={c.id} />
        </section>
      )}
    </>
  );
}
