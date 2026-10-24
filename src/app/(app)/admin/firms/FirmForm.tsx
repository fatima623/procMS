'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Fields = {
  code: string; name: string; ntn: string; address: string; city: string; country: string; email: string; phone: string;
  isActive: boolean; isBlacklisted: boolean;
};

const BLANK: Fields = { code: '', name: '', ntn: '', address: '', city: '', country: '', email: '', phone: '', isActive: true, isBlacklisted: false };

export function FirmForm(props:
  | { mode: 'create' }
  | { mode: 'edit'; firmId: string; initial: Fields }
) {
  const router = useRouter();
  const isCreate = props.mode === 'create';
  const [f, setF] = useState<Fields>(isCreate ? BLANK : props.initial);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof Fields>(k: K, v: Fields[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const body = {
        code: f.code,
        name: f.name,
        ntn: f.ntn || undefined,
        address: f.address || undefined,
        city: f.city || undefined,
        country: f.country || undefined,
        email: f.email || undefined,
        phone: f.phone || undefined,
        isActive: f.isActive,
        isBlacklisted: f.isBlacklisted,
      };
      const url = isCreate ? '/api/admin/firms' : `/api/admin/firms/${props.firmId}`;
      const method = isCreate ? 'POST' : 'PATCH';
      const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      router.push('/admin/firms');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {err && <div className="err">{err}</div>}
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
          <div className="field"><label>Code</label><input className="input mono" value={f.code} onChange={(e) => set('code', e.target.value)} required /></div>
          <div className="field"><label>Name</label><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} required /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field"><label>NTN</label><input className="input mono" value={f.ntn} onChange={(e) => set('ntn', e.target.value)} /></div>
          <div className="field"><label>Email</label><input className="input" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></div>
        </div>
        <div className="field"><label>Address</label><textarea className="textarea" value={f.address} onChange={(e) => set('address', e.target.value)} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div className="field"><label>City</label><input className="input" value={f.city} onChange={(e) => set('city', e.target.value)} /></div>
          <div className="field"><label>Country</label><input className="input" value={f.country} onChange={(e) => set('country', e.target.value)} /></div>
          <div className="field"><label>Phone</label><input className="input" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></div>
        </div>
        <div className="field">
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginRight: 20 }}>
            <input type="checkbox" checked={f.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Active
          </label>
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={f.isBlacklisted} onChange={(e) => set('isBlacklisted', e.target.checked)} /> Blacklisted
          </label>
        </div>
      </div>
      <div className="row row-end"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : isCreate ? 'Create firm' : 'Save changes'}</button></div>
    </form>
  );
}
