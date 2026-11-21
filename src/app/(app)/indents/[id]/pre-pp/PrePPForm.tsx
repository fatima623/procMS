'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const KINDS = ['SINGLE_OFFER', 'PROPRIETARY', 'OTHER'] as const;

async function post(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? '{}' : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!res.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
}

export function PrePPForm(props: {
  indentId: string;
  hasProposal: boolean;
  proposalStatus: string | null;
  indentStatus: string;
  canAct: boolean;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<(typeof KINDS)[number]>('SINGLE_OFFER');
  const [justification, setJustification] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const base = `/api/indents/${props.indentId}/pre-pp`;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!props.canAct) return <p className="muted">You do not have a role that can act on this proposal.</p>;
  const inCstApproval = props.indentStatus === 'CST_APPROVAL';

  return (
    <div>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}

      {!props.hasProposal && inCstApproval && (
        <form
          className="card"
          style={{ padding: 16, maxWidth: 720 }}
          onSubmit={(e) => { e.preventDefault(); void run(() => post(base, { kind, justification })); }}
        >
          <h3 style={{ marginTop: 0 }}>Create Pre-Purchase Proposal</h3>
          <div className="field">
            <label htmlFor="kind">Kind</label>
            <select id="kind" className="select" value={kind} onChange={(e) => setKind(e.target.value as (typeof KINDS)[number])}>
              {KINDS.map((k) => <option key={k} value={k}>{k.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="justification">Justification (at least 10 characters)</label>
            <textarea id="justification" className="input" rows={4} value={justification} onChange={(e) => setJustification(e.target.value)} required minLength={10} maxLength={5000} />
          </div>
          <div className="row row-end">
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Create proposal'}</button>
          </div>
        </form>
      )}

      {props.hasProposal && props.proposalStatus === 'DRAFT' && inCstApproval && (
        <button className="btn btn-primary" disabled={busy} onClick={() => void run(() => post(`${base}/start-approval`))}>
          {busy ? '…' : 'Start approval chain'}
        </button>
      )}
    </div>
  );
}