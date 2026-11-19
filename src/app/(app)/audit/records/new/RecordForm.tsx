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

export function RecordForm(props: {
  readonly fiscalYears: readonly Option[];
  readonly indents: readonly Option[];
  readonly contracts: readonly Option[];
}) {
  const router = useRouter();
  const [auditSection, setAuditSection] = useState('');
  const [fiscalYearId, setFiscalYearId] = useState(props.fiscalYears[0]?.id ?? '');
  const [raisedOn, setRaisedOn] = useState(localToday);
  const [subjectIndentId, setSubjectIndentId] = useState('');
  const [subjectContractId, setSubjectContractId] = useState('');
  const [documentKey, setDocumentKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/audit-records', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          auditSection,
          fiscalYearId,
          raisedOn,
          subjectIndentId: subjectIndentId || undefined,
          subjectContractId: subjectContractId || undefined,
          documentKey: documentKey || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { data?: { id?: string }; error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push(data.data?.id ? `/audit/records/${data.data.id}` : '/audit/records');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 760 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="field">
        <label htmlFor="auditSection">Audit section</label>
        <input id="auditSection" className="input" value={auditSection} onChange={(e) => setAuditSection(e.target.value)} minLength={2} maxLength={120} placeholder="e.g. DG Audit Defence Services" required />
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="fiscalYearId">Fiscal year</label>
          <select id="fiscalYearId" className="select" value={fiscalYearId} onChange={(e) => setFiscalYearId(e.target.value)} required>
            <option value="">— Select —</option>
            {props.fiscalYears.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="raisedOn">Raised on</label>
          <input id="raisedOn" className="input" type="date" value={raisedOn} onChange={(e) => setRaisedOn(e.target.value)} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="subjectIndentId">Subject indent (optional)</label>
        <select id="subjectIndentId" className="select" value={subjectIndentId} onChange={(e) => setSubjectIndentId(e.target.value)}>
          <option value="">— None —</option>
          {props.indents.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="subjectContractId">Subject contract (optional)</label>
        <select id="subjectContractId" className="select" value={subjectContractId} onChange={(e) => setSubjectContractId(e.target.value)}>
          <option value="">— None —</option>
          {props.contracts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="documentKey">Scanned document reference (optional)</label>
        <input id="documentKey" className="input" value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} maxLength={500} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/audit/records" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Create audit record'}</button>
      </div>
    </form>
  );
}
