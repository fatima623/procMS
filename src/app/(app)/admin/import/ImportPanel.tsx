'use client';
import { useState, type ChangeEvent } from 'react';

type Target = 'firms' | 'users';

const SAMPLES: Record<Target, string> = {
  firms: `code,name,ntn,address,city,country,email,phone
F-100,Example Vendor,1111111-1,"123 Main St",Karachi,PK,sales@example.com,+92-21-1234567
F-101,Another Supplier,,,Lahore,PK,,`,
  users: `email,displayName,password,rank,roles,sectionCodes,firmCode
new.officer@dp.navy,New Officer,Pr0cur3-DEV!,Lt,INDENTER,FLEET-HQ,
new.firm@example.com,Firm Rep,Pr0cur3-DEV!,,FIRM_REP,,F-100`,
};

interface ImportError { readonly line: number; readonly reason: string; readonly row: Record<string, string>; }
interface ImportResult { readonly total: number; readonly created: number; readonly updated: number; readonly errors: readonly ImportError[]; }

export function ImportPanel() {
  const [target, setTarget] = useState<Target>('firms');
  const [csv, setCsv] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(setCsv);
  }

  async function submit() {
    if (!csv.trim()) { setErr('Paste or upload a CSV first.'); return; }
    setBusy(true); setErr(null); setResult(null);
    try {
      const res = await fetch(`/api/admin/import/${target}`, {
        method: 'POST',
        headers: { 'content-type': 'text/csv' },
        body: csv,
      });
      const data = await res.json();
      if (!res.ok && res.status !== 207) {
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      setResult(data.data as ImportResult);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  return (
    <>
      {err && <div className="err">{err}</div>}

      <section className="card">
        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>What to import</label>
            <select className="select" value={target} onChange={(e) => setTarget(e.target.value as Target)}>
              <option value="firms">Firms</option>
              <option value="users">Users</option>
            </select>
          </div>
          <div className="field" style={{ margin: 0, flex: 1 }}>
            <label>Upload CSV file (optional)</label>
            <input type="file" accept=".csv,text/csv" onChange={onFile} className="input" />
          </div>
          <button className="btn" onClick={() => setCsv(SAMPLES[target])}>Load sample</button>
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label>CSV content</label>
          <textarea
            className="textarea mono"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={10}
            spellCheck={false}
            style={{ fontSize: 12 }}
            placeholder="Paste CSV here, or upload a file above."
          />
        </div>

        <div className="row row-end" style={{ gap: 8 }}>
          <button className="btn btn-primary" onClick={submit} disabled={busy || !csv.trim()}>
            {busy ? 'Importing…' : `Import ${target}`}
          </button>
        </div>

        <div className="muted" style={{ fontSize: 12, marginTop: 12 }}>
          {target === 'firms' ? (
            <>
              <strong>Firms columns:</strong> <code>code</code>, <code>name</code> (required); <code>ntn</code>, <code>address</code>, <code>city</code>, <code>country</code>, <code>email</code>, <code>phone</code> (optional). Existing firms (matched by <code>code</code>) are updated in place.
            </>
          ) : (
            <>
              <strong>Users columns:</strong> <code>email</code>, <code>displayName</code> (required); <code>password</code> (required for new users; blank keeps the existing one on updates); <code>rank</code>; <code>roles</code> pipe-separated (e.g. <code>ADMIN|AD</code>); <code>sectionCodes</code> pipe-separated; <code>firmCode</code> (required for <code>FIRM_REP</code>).
            </>
          )}
        </div>
      </section>

      {result && (
        <section className="card">
          <h3>Import result</h3>
          <div className="row" style={{ gap: 20 }}>
            <span><strong>Total:</strong> {result.total}</span>
            <span><strong style={{ color: 'var(--ok)' }}>Created:</strong> {result.created}</span>
            <span><strong style={{ color: 'var(--accent-hover)' }}>Updated:</strong> {result.updated}</span>
            <span><strong style={{ color: result.errors.length > 0 ? 'var(--danger)' : 'inherit' }}>Errors:</strong> {result.errors.length}</span>
          </div>
          {result.errors.length > 0 && (
            <table className="table" style={{ marginTop: 12 }}>
              <thead><tr><th>Line</th><th>Reason</th><th>Row</th></tr></thead>
              <tbody>
                {result.errors.map((e) => (
                  <tr key={e.line}>
                    <td className="mono">{e.line}</td>
                    <td>{e.reason}</td>
                    <td className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{JSON.stringify(e.row).slice(0, 200)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </>
  );
}
