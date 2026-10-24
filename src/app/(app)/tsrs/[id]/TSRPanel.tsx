'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Offer {
  readonly id: string;
  readonly firmId: string;
  readonly firmName: string;
  readonly submittedAt: string;
  readonly status: string;
  readonly evaluation: { readonly verdict: string; readonly remarks: string | null } | null;
}
interface Query {
  readonly id: string;
  readonly firmId: string;
  readonly firmName: string;
  readonly question: string;
  readonly response: string | null;
  readonly status: string;
}

export function TSRPanel(props: {
  readonly tsrId: string;
  readonly canEdit: boolean;
  readonly offers: readonly Offer[];
  readonly queries: readonly Query[];
  readonly summary: string | null;
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(props.summary ?? '');
  const [newQuery, setNewQuery] = useState<{ firmId: string; question: string } | null>(null);

  async function post(url: string, body: unknown, label: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setErr(`${label}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  function evaluate(offerId: string, verdict: 'ACCEPTED' | 'REJECTED' | 'NEEDS_QUERY') {
    const remarks = verdict !== 'ACCEPTED' ? window.prompt(`Remarks for ${verdict}`, '') : undefined;
    if (verdict !== 'ACCEPTED' && !remarks) return;
    post(`/api/tsrs/${props.tsrId}/evaluate`, { technicalOfferId: offerId, verdict, remarks }, 'evaluate');
  }

  function raiseQuery() {
    if (!newQuery?.firmId || !newQuery?.question) return;
    post(`/api/tsrs/${props.tsrId}/queries`, newQuery, 'raise query').then(() => setNewQuery(null));
  }

  function complete() {
    if (!summary) {
      setErr('Summary is required.');
      return;
    }
    post(`/api/tsrs/${props.tsrId}/complete`, { summary }, 'complete');
  }

  return (
    <>
      {err && <div className="err">{err}</div>}

      <section className="card">
        <h3>Technical offers ({props.offers.length})</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Firm</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Evaluation</th>
              {props.canEdit && <th>Decide</th>}
            </tr>
          </thead>
          <tbody>
            {props.offers.map((o) => (
              <tr key={o.id}>
                <td>{o.firmName}</td>
                <td className="mono">{new Date(o.submittedAt).toISOString().slice(0, 10)}</td>
                <td>{o.status}</td>
                <td>
                  {o.evaluation
                    ? <span className="mono">{o.evaluation.verdict}{o.evaluation.remarks ? ` — ${o.evaluation.remarks}` : ''}</span>
                    : <span className="muted">—</span>}
                </td>
                {props.canEdit && (
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn" onClick={() => evaluate(o.id, 'ACCEPTED')} disabled={busy}>Accept</button>{' '}
                    <button className="btn btn-danger" onClick={() => evaluate(o.id, 'REJECTED')} disabled={busy}>Reject</button>{' '}
                    <button className="btn" onClick={() => evaluate(o.id, 'NEEDS_QUERY')} disabled={busy}>Query</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <div className="row">
          <h3 style={{ margin: 0 }}>Queries ({props.queries.length})</h3>
          <div className="grow" />
          {props.canEdit && (
            <button className="btn" onClick={() => setNewQuery({ firmId: props.offers[0]?.firmId ?? '', question: '' })}>+ New query</button>
          )}
        </div>
        {newQuery && (
          <div style={{ marginTop: 10, padding: 12, border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius)' }}>
            <div className="field">
              <label>Firm</label>
              <select className="select" value={newQuery.firmId} onChange={(e) => setNewQuery({ ...newQuery, firmId: e.target.value })}>
                {props.offers.map((o) => <option key={o.firmId} value={o.firmId}>{o.firmName}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Question</label>
              <textarea className="textarea" value={newQuery.question} onChange={(e) => setNewQuery({ ...newQuery, question: e.target.value })} />
            </div>
            <div className="row row-end" style={{ gap: 8 }}>
              <button className="btn" onClick={() => setNewQuery(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={raiseQuery} disabled={busy}>Send</button>
            </div>
          </div>
        )}
        {props.queries.length === 0 ? (
          <div className="muted" style={{ padding: 10 }}>No queries raised.</div>
        ) : (
          <table className="table" style={{ marginTop: 10 }}>
            <thead><tr><th>Firm</th><th>Question</th><th>Response</th><th>Status</th></tr></thead>
            <tbody>
              {props.queries.map((q) => (
                <tr key={q.id}>
                  <td>{q.firmName}</td>
                  <td>{q.question}</td>
                  <td>{q.response ?? <span className="muted">—</span>}</td>
                  <td>{q.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {props.canEdit && (
        <section className="card">
          <h3>Complete</h3>
          <div className="field">
            <label>Summary</label>
            <textarea className="textarea" value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} />
          </div>
          <div className="row row-end">
            <button className="btn btn-primary" onClick={complete} disabled={busy}>Submit + complete TSR</button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Marks every evaluated offer accepted or rejected per its verdict, and moves the indent to Commercial Open.
          </p>
        </section>
      )}
    </>
  );
}
