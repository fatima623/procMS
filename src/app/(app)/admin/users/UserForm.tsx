'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '@prisma/client';
import { MultiSelect, type MultiSelectOption } from '@/interfaces/ui/components/MultiSelect';

interface Section { id: string; code: string; name: string; kind: string; }
interface Firm { id: string; code: string; name: string; }

const ROLE_OPTIONS: MultiSelectOption[] = [
  { value: Role.ADMIN,        label: 'ADMIN',        hint: 'full administration' },
  { value: Role.INDENTER,     label: 'INDENTER',     hint: 'raises indents' },
  { value: Role.CR_STAFF,     label: 'CR_STAFF',     hint: 'CR Section' },
  { value: Role.BUDGET_STAFF, label: 'BUDGET_STAFF', hint: 'Budget Section' },
  { value: Role.COORD_STAFF,  label: 'COORD_STAFF',  hint: 'Coordination' },
  { value: Role.ADP_STAFF,    label: 'ADP_STAFF',    hint: 'Concerned ADP' },
  { value: Role.SUPTD,        label: 'SUPTD',        hint: 'Superintendent' },
  { value: Role.AD,           label: 'AD',           hint: 'Chain step 1' },
  { value: Role.DD,           label: 'DD',           hint: 'Chain step 2' },
  { value: Role.DP_N,         label: 'DP(N)',        hint: 'Chain step 3' },
  { value: Role.DGDP,         label: 'DGDP',         hint: 'Chain step 4' },
  { value: Role.SECY_DP,      label: 'SECY_DP',      hint: 'Chain step 5' },
  { value: Role.CPO,          label: 'CPO',          hint: 'Propriety approval' },
  { value: Role.INSPECTORATE, label: 'INSPECTORATE', hint: 'Technical scrutiny' },
  { value: Role.FIRM_REP,     label: 'FIRM_REP',     hint: 'external vendor rep' },
];

export function UserForm(props:
  | {
      readonly mode: 'create';
      readonly sections: readonly Section[];
      readonly firms: readonly Firm[];
    }
  | {
      readonly mode: 'edit';
      readonly userId: string;
      readonly initial: {
        displayName: string; rank: string; isActive: boolean;
        roles: Role[]; sectionIds: string[]; firmId: string;
      };
      readonly sections: readonly Section[];
      readonly firms: readonly Firm[];
    }) {
  const router = useRouter();
  const isCreate = props.mode === 'create';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(isCreate ? '' : props.initial.displayName);
  const [rank, setRank] = useState(isCreate ? '' : props.initial.rank);
  const [isActive, setIsActive] = useState(isCreate ? true : props.initial.isActive);
  const [roles, setRoles] = useState<string[]>(isCreate ? [] : [...props.initial.roles]);
  const [sectionIds, setSectionIds] = useState<string[]>(isCreate ? [] : [...props.initial.sectionIds]);
  const [firmId, setFirmId] = useState(isCreate ? '' : props.initial.firmId);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isFirmRep = roles.includes(Role.FIRM_REP);

  const sectionOptions: MultiSelectOption[] = props.sections.map((s) => ({
    value: s.id,
    label: `${s.code} — ${s.name}`,
    hint: s.kind,
  }));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        displayName,
        rank: rank || null,
        isActive,
        roles,
        sectionIds,
        firmId: isFirmRep ? (firmId || null) : null,
      };
      if (isCreate) {
        body.email = email;
        body.password = password;
      }
      const url = isCreate ? '/api/admin/users' : `/api/admin/users/${props.userId}`;
      const method = isCreate ? 'POST' : 'PATCH';
      const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      router.push('/admin/users');
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
        <h3>Identity</h3>
        {isCreate ? (
          <>
            <div className="field"><label>Email</label><input className="input mono" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="field"><label>Password (initial)</label><input className="input" type="password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          </>
        ) : (
          <div className="field"><label>Status</label>
            <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <span>Active</span>
            </label>
          </div>
        )}
        <div className="field"><label>Display name</label><input className="input" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
        <div className="field"><label>Rank (optional)</label><input className="input" value={rank} onChange={(e) => setRank(e.target.value)} /></div>
      </div>

      <div className="card">
        <h3>Roles</h3>
        <div className="field">
          <label>Assigned roles ({roles.length})</label>
          <MultiSelect
            options={ROLE_OPTIONS}
            selected={roles}
            onChange={setRoles}
            placeholder="Click to add roles…"
          />
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Type to filter. Backspace in an empty box removes the last role.
          </div>
        </div>
      </div>

      {isFirmRep && (
        <div className="card">
          <h3>Firm association</h3>
          <div className="field">
            <label>Firm (required for FIRM_REP)</label>
            <select className="select" value={firmId} onChange={(e) => setFirmId(e.target.value)} required>
              <option value="">— choose a firm —</option>
              {props.firms.map((f) => <option key={f.id} value={f.id}>{f.code} — {f.name}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Section memberships</h3>
        <div className="field">
          <label>Member of ({sectionIds.length})</label>
          <MultiSelect
            options={sectionOptions}
            selected={sectionIds}
            onChange={setSectionIds}
            placeholder="Click to add sections…"
          />
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Membership determines which indents a user sees in their section view.
          </div>
        </div>
      </div>

      <div className="row row-end"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : isCreate ? 'Create user' : 'Save changes'}</button></div>
    </form>
  );
}
