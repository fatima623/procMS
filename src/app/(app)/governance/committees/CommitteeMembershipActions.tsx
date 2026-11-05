'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserPick { readonly id: string; readonly displayName: string; readonly email: string; }

/**
 * Three in-place actions for an existing committee:
 *   - Add a new member (user picker + role + joined-on)
 *   - Remove any currently-active member (stamps leftOn; service enforces GRC parity)
 *   - Deactivate the whole committee
 *
 * Kept to one component because they share the same busy/error surface.
 */
export function CommitteeMembershipActions(props: {
  readonly committeeId: string;
  readonly isActive: boolean;
  readonly members: ReadonlyArray<{ id: string; userId: string; userName: string | null; memberRole: string; leftOn: string | null }>;
  readonly users: readonly UserPick[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const activeMemberIds = new Set(props.members.filter((m) => !m.leftOn).map((m) => m.userId));
  const candidateUsers = props.users.filter((u) => !activeMemberIds.has(u.id));

  const [userId, setUserId] = useState(candidateUsers[0]?.id ?? '');
  const [memberRole, setMemberRole] = useState('Member');
  const [joinedOn, setJoinedOn] = useState(today);

  async function post(path: string, body: Record<string, unknown>, label: string) {
    setBusy(label);
    setErr(null);
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  function add() {
    if (!userId) return;
    return post(`/api/committees/${props.committeeId}/members`, { userId, memberRole, joinedOn }, 'add');
  }
  function remove(memberId: string, userName: string | null) {
    const leftOn = window.prompt(`Leave date for ${userName ?? memberId} (YYYY-MM-DD):`, today);
    if (!leftOn) return;
    return post(`/api/committee-members/${memberId}/remove`, { leftOn }, `remove-${memberId}`);
  }
  function deactivate() {
    if (!window.confirm('Deactivate this committee? Member history is preserved.')) return;
    return post(`/api/committees/${props.committeeId}/deactivate`, {}, 'deactivate');
  }

  return (
    <div className="stack-sm" style={{ marginTop: 12 }}>
      {err && <div className="err">{err}</div>}

      {props.isActive && (
        <>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
            <div className="field" style={{ flex: '1 1 220px', margin: 0 }}>
              <label htmlFor={`add-user-${props.committeeId}`} className="dim">Add member</label>
              <select
                id={`add-user-${props.committeeId}`}
                className="select"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={busy !== null || candidateUsers.length === 0}
              >
                {candidateUsers.length === 0
                  ? <option value="">No eligible users</option>
                  : candidateUsers.map((u) => <option key={u.id} value={u.id}>{u.displayName} ({u.email})</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: '0 0 160px', margin: 0 }}>
              <label htmlFor={`add-role-${props.committeeId}`} className="dim">Role</label>
              <input id={`add-role-${props.committeeId}`} className="input" value={memberRole} onChange={(e) => setMemberRole(e.target.value)} maxLength={80} />
            </div>
            <div className="field" style={{ flex: '0 0 160px', margin: 0 }}>
              <label htmlFor={`add-date-${props.committeeId}`} className="dim">Joined on</label>
              <input id={`add-date-${props.committeeId}`} type="date" className="input" value={joinedOn} onChange={(e) => setJoinedOn(e.target.value)} />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={add}
              disabled={busy !== null || !userId || candidateUsers.length === 0}
            >
              {busy === 'add' ? '…' : '+ Add'}
            </button>
          </div>

          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {props.members.filter((m) => !m.leftOn).map((m) => (
              <button
                key={m.id}
                type="button"
                className="btn"
                onClick={() => remove(m.id, m.userName)}
                disabled={busy !== null}
                title="Remove this member (stamps leftOn)"
              >
                {busy === `remove-${m.id}` ? '…' : `× ${m.userName ?? m.userId}`}
              </button>
            ))}
          </div>

          <div>
            <button
              type="button"
              className="btn btn-danger"
              onClick={deactivate}
              disabled={busy !== null}
            >
              {busy === 'deactivate' ? '…' : 'Deactivate committee'}
            </button>
          </div>
        </>
      )}

      {!props.isActive && <div className="muted">Committee is inactive — no changes allowed.</div>}
    </div>
  );
}
