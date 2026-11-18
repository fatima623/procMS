'use client';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';

type Field = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'email' | 'textarea' | 'select';
  required?: boolean;
  options?: string[];
};
type Row = Record<string, unknown> & { id: string };

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { data?: unknown; error?: { message?: string } };
  if (!res.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
  return json.data;
}

function buildBody(fields: Field[], values: Record<string, string>) {
  const body: Record<string, string> = {};
  for (const f of fields) {
    const v = values[f.key];
    if (v !== undefined && v !== '') body[f.key] = v;
  }
  return body;
}

function toInputValue(f: Field, v: unknown): string {
  if (v === null || v === undefined) return '';
  if (f.type === 'date') return String(v).slice(0, 10);
  return String(v);
}

function FieldInput({ f, value, onChange }: { f: Field; value: string; onChange: (v: string) => void }) {
  const t = f.type ?? 'text';
  return (
    <div className="field">
      <label>{f.label}</label>
      {t === 'textarea' ? (
        <textarea className="textarea" value={value} required={f.required} onChange={(e) => onChange(e.target.value)} />
      ) : t === 'select' ? (
        <select className="select" value={value} required={f.required} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {f.options?.map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
        </select>
      ) : (
        <input className="input" type={t} step={t === 'number' ? 'any' : undefined} value={value} required={f.required} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function FormGrid({ fields, values, setValues }: { fields: Field[]; values: Record<string, string>; setValues: (v: Record<string, string>) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {fields.map((f) => (
        <FieldInput key={f.key} f={f} value={values[f.key] ?? ''} onChange={(v) => setValues({ ...values, [f.key]: v })} />
      ))}
    </div>
  );
}

// --- A list + add/edit/delete tab ---------------------------------------------
function ListTab({ url, noun, fields, removeLabel }: { url: string; noun: string; fields: Field[]; removeLabel: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cols = fields.filter((f) => f.type !== 'textarea').slice(0, 5);

  const load = useCallback(async () => {
    try { setRows((await api(url, 'GET')) as Row[]); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }, [url]);
  useEffect(() => { void load(); }, [load]);

  function reset() { setValues({}); setEditingId(null); }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const body = buildBody(fields, values);
      if (editingId) await api(`${url}/${editingId}`, 'PATCH', body);
      else await api(url, 'POST', body);
      reset();
      await load();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : String(e2)); }
    finally { setBusy(false); }
  }

  async function onRemove(id: string) {
    if (!window.confirm(`${removeLabel} this ${noun}?`)) return;
    setErr(null);
    try { await api(`${url}/${id}`, 'DELETE'); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }

  function onEdit(r: Row) {
    const v: Record<string, string> = {};
    for (const f of fields) v[f.key] = toInputValue(f, r[f.key]);
    setValues(v);
    setEditingId(r.id);
  }

  return (
    <div>
      {err && <div className="err">{err}</div>}
      <div className="card" style={{ padding: 12, overflowX: 'auto' }}>
        {rows.length === 0 ? <p className="muted">No {noun} records yet.</p> : (
          <table className="table">
            <thead><tr>{cols.map((c) => <th key={c.key}>{c.label}</th>)}<th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {cols.map((c, i) => (
                    <td key={c.key}>
                      {toInputValue(c, r[c.key]) || '—'}
                      {i === 0 && r.isActive === false ? ' (inactive)' : ''}
                    </td>
                  ))}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" className="btn" onClick={() => onEdit(r)}>Edit</button>{' '}
                    <button type="button" className="btn" onClick={() => onRemove(r.id)}>{removeLabel}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <form onSubmit={onSubmit} className="card" style={{ padding: 16, marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>{editingId ? `Edit ${noun}` : `Add ${noun}`}</h3>
        <FormGrid fields={fields} values={values} setValues={setValues} />
        <div className="row row-end" style={{ gap: 8 }}>
          {editingId && <button type="button" className="btn" onClick={reset}>Cancel edit</button>}
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save changes' : `Add ${noun}`}</button>
        </div>
      </form>
    </div>
  );
}

// --- Financial: one record per firm ---------------------------------------------
const FINANCIAL_FIELDS: Field[] = [
  { key: 'paidUpCapital', label: 'Paid-up capital', type: 'number', required: true },
  { key: 'annualTurnover', label: 'Annual turnover', type: 'number', required: true },
  { key: 'currency', label: 'Currency (3 letters)' },
  { key: 'bankName', label: 'Bank name', required: true },
  { key: 'bankAccountNumber', label: 'Bank account number', required: true },
  { key: 'taxStatus', label: 'Tax status', required: true },
  { key: 'lastAuditedOn', label: 'Last audited on', type: 'date' },
  { key: 'remarks', label: 'Remarks', type: 'textarea' },
];

function FinancialTab({ url }: { url: string }) {
  const [values, setValues] = useState<Record<string, string>>({ currency: 'PKR' });
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const row = (await api(url, 'GET')) as Row | null;
        if (row) {
          const v: Record<string, string> = {};
          for (const f of FINANCIAL_FIELDS) v[f.key] = toInputValue(f, row[f.key]);
          setValues(v);
        }
      } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    })();
  }, [url]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    try {
      await api(url, 'PUT', buildBody(FINANCIAL_FIELDS, values));
      setMsg('Saved.');
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : String(e2)); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 16 }}>
      {err && <div className="err">{err}</div>}
      {msg && <p>{msg}</p>}
      <FormGrid fields={FINANCIAL_FIELDS} values={values} setValues={setValues} />
      <div className="row row-end"><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save financial details'}</button></div>
    </form>
  );
}

// --- Field lists for the other tabs ---------------------------------------------
const ITEM_FIELDS: Field[] = [
  { key: 'itemName', label: 'Item name', required: true },
  { key: 'itemCode', label: 'Item code' },
  { key: 'category', label: 'Category', required: true },
];
const SIGNATORY_FIELDS: Field[] = [
  { key: 'personName', label: 'Person name', required: true },
  { key: 'designation', label: 'Designation', required: true },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email', type: 'email' },
];
const PARTNER_FIELDS: Field[] = [
  { key: 'partnerName', label: 'Partner name', required: true },
  { key: 'shareholdingPercent', label: 'Shareholding %', type: 'number', required: true },
  { key: 'leftOn', label: 'Left on', type: 'date' },
];
const AGENT_FIELDS: Field[] = [
  { key: 'agentName', label: 'Agent name', required: true },
  { key: 'localAddress', label: 'Local address', required: true },
  { key: 'commissionPercent', label: 'Commission %', type: 'number', required: true },
  { key: 'agreementFrom', label: 'Agreement from', type: 'date', required: true },
  { key: 'agreementTo', label: 'Agreement to', type: 'date' },
];
const DISCIPLINE_FIELDS: Field[] = [
  { key: 'kind', label: 'Kind', type: 'select', required: true, options: ['WARNING', 'NOTICE', 'PERFORMANCE_FAIL', 'OTHER'] },
  { key: 'issuedOn', label: 'Issued on', type: 'date', required: true },
  { key: 'description', label: 'Description', type: 'textarea', required: true },
];

const TABS = ['Basic Info', 'Financial', 'Items', 'Signatories', 'Partners', 'Agent', 'Discipline', 'Pre-qualifications'] as const;
type Tab = (typeof TABS)[number];

export function FirmTabs({ firmId, basicInfo }: { firmId: string; basicInfo: ReactNode }) {
  const [tab, setTab] = useState<Tab>('Basic Info');
  const base = `/api/admin/firms/${firmId}`;

  return (
    <div>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t} type="button" className={t === tab ? 'btn btn-primary' : 'btn'} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === 'Basic Info' && basicInfo}
      {tab === 'Financial' && <FinancialTab url={`${base}/financial`} />}
      {tab === 'Items' && <ListTab url={`${base}/items`} noun="item" fields={ITEM_FIELDS} removeLabel="Delete" />}
      {tab === 'Signatories' && <ListTab url={`${base}/signatories`} noun="signatory" fields={SIGNATORY_FIELDS} removeLabel="Deactivate" />}
      {tab === 'Partners' && <ListTab url={`${base}/partners`} noun="partner" fields={PARTNER_FIELDS} removeLabel="Delete" />}
      {tab === 'Agent' && <ListTab url={`${base}/agent`} noun="agent" fields={AGENT_FIELDS} removeLabel="Delete" />}
      {tab === 'Discipline' && <ListTab url={`${base}/discipline`} noun="disciplinary action" fields={DISCIPLINE_FIELDS} removeLabel="Delete" />}
      {tab === 'Pre-qualifications' && (
        <div className="card" style={{ padding: 16 }}>
          <p>Pre-qualification registrations are managed on their own page.</p>
          <Link className="btn" href="/registration">Open registrations</Link>
        </div>
      )}
    </div>
  );
}