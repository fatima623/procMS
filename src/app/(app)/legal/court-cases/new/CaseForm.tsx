'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Option = { id: string; label: string };

/** Today as YYYY-MM-DD in the browser's local time zone (not UTC). */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function CaseForm(props: { readonly indents: readonly Option[]; readonly contracts: readonly Option[] }) {
  const router = useRouter();
  const [caseNumber, setCaseNumber] = useState('');
  const [court, setCourt] = useState('');
  const [party, setParty] = useState('DP(N)');
  const [counterParty, setCounterParty] = useState('');
  const [filedOn, setFiledOn] = useState(localToday);
  const [relatedIndentId, setRelatedIndentId] = useState('');
  const [relatedContractId, setRelatedContractId] = useState('');
  const [documentKey, setDocumentKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/court-cases', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          caseNumber,
          court,
          party,
          counterParty,
          filedOn,
          relatedIndentId: relatedIndentId || undefined,
          relatedContractId: relatedContractId || undefined,
          documentKey: documentKey || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { data?: { id?: string }; error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push(data.data?.id ? `/legal/court-cases/${data.data.id}` : '/legal/court-cases');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 760 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="caseNumber">Case number</label>
          <input id="caseNumber" className="input mono" value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} maxLength={80} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="filedOn">Filed on</label>
          <input id="filedOn" className="input" type="date" value={filedOn} onChange={(e) => setFiledOn(e.target.value)} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="court">Court</label>
        <input id="court" className="input" value={court} onChange={(e) => setCourt(e.target.value)} minLength={2} maxLength={200} placeholder="e.g. Islamabad High Court" required />
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="party">Party</label>
          <input id="party" className="input" value={party} onChange={(e) => setParty(e.target.value)} minLength={2} maxLength={200} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="counterParty">Counter-party</label>
          <input id="counterParty" className="input" value={counterParty} onChange={(e) => setCounterParty(e.target.value)} minLength={2} maxLength={200} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="relatedIndentId">Related indent (optional)</label>
        <select id="relatedIndentId" className="select" value={relatedIndentId} onChange={(e) => setRelatedIndentId(e.target.value)}>
          <option value="">— None —</option>
          {props.indents.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="relatedContractId">Related contract (optional)</label>
        <select id="relatedContractId" className="select" value={relatedContractId} onChange={(e) => setRelatedContractId(e.target.value)}>
          <option value="">— None —</option>
          {props.contracts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="documentKey">Scanned document reference (optional)</label>
        <input id="documentKey" className="input" value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} maxLength={500} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/legal/court-cases" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Create court case'}</button>
      </div>
    </form>
  );
}
