'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserPick { readonly id: string; readonly displayName: string; readonly email: string; }

interface MemberDraft { userId: string; memberRole: string; joinedOn: string; }

export function CommitteeForm({ users }: { readonly users: readonly UserPick[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [kind, setKind] = useState<'GRC' | 'TEC' | 'FEC' | 'INSPECTION' | 'OTHER'>('GRC');
  const [name, setName] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const [termStart, setTermStart] = useState(today);
  const [termEnd, setTermEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [members, setMembers] = useState<MemberDraft[]>([
    { userId: users[0]?.id ?? '', memberRole: 'Chair', joinedOn: today },
  ]);

  function updateMember(i: number, patch: Partial<MemberDraft>) {
    setMembers((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }
  function addMember() {
    setMembers((prev) => [...prev, { userId: users[0]?.id ?? '', memberRole: 'Member', joinedOn: today }]);
  }
  function removeMember(i: number) {
    setMembers((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/committees', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind,
          name,
          termStart,
          termEnd: termEnd || undefined,
          notes: notes || undefined,
          members,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/governance/committees');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (users.length === 0) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p>No users available.</p>
        <Link className="btn" href="/admin/users">← Back to users</Link>
      </div>
    );
  }

  const parityWarning = kind === 'GRC' && members.length % 2 === 0 ? `A GRC needs an odd number of members (currently ${members.length}).` : null;

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 820 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      {parityWarning && <div className="err" style={{ marginBottom: 12 }}>{parityWarning}</div>}
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="kind">Kind</label>
          <select id="kind" className="select" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="GRC">Grievance Redressal Committee (GRC)</option>
            <option value="TEC">Tender Evaluation Committee (TEC)</option>
            <option value="FEC">Finance Evaluation Committee (FEC)</option>
            <option value="INSPECTION">Inspection Committee</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="name">Name</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} minLength={3} maxLength={200} required />
        </div>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="termStart">Term start</label>
          <input id="termStart" className="input" type="date" value={termStart} onChange={(e) => setTermStart(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="termEnd">Term end (optional)</label>
          <input id="termEnd" className="input" type="date" value={termEnd} onChange={(e) => setTermEnd(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="notes">Notes (optional)</label>
        <textarea id="notes" className="input" rows={2} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <h3 style={{ margin: '14px 0 6px' }}>Members</h3>
      <table className="table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Joined on</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {members.map((m, i) => (
            <tr key={i}>
              <td>
                <select className="select" value={m.userId} onChange={(e) => updateMember(i, { userId: e.target.value })}>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.displayName} — {u.email}</option>)}
                </select>
              </td>
              <td><input className="input" value={m.memberRole} onChange={(e) => updateMember(i, { memberRole: e.target.value })} maxLength={80} required /></td>
              <td><input className="input" type="date" value={m.joinedOn} onChange={(e) => updateMember(i, { joinedOn: e.target.value })} required /></td>
              <td className="right">
                {members.length > 1 && <button type="button" className="btn" onClick={() => removeMember(i)}>Remove</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row row-end" style={{ gap: 8, marginTop: 8 }}>
        <button type="button" className="btn" onClick={addMember}>+ Add member</button>
      </div>

      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/governance/committees" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Form committee'}</button>
      </div>
    </form>
  );
}
