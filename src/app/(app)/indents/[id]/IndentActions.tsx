'use client';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Role } from '@prisma/client';

/**
 * COORD picks a Concerned ADP from the list the server passed in and posts
 * the choice. Kept inline so IndentActions stays one file.
 */
function AssignToAdpControl(props: {
  readonly indentId: string;
  readonly adpSections: ReadonlyArray<{ id: string; code: string; name: string }>;
  readonly onDone: () => void;
  readonly onError: (msg: string) => void;
}) {
  const [adpSectionId, setAdpSectionId] = useState<string>(props.adpSections[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  if (props.adpSections.length === 0) {
    return <div className="muted">No active ADP sections found — ask admin to create one.</div>;
  }
  async function submit() {
    if (!adpSectionId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/indents/${props.indentId}/assign-adp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ adpSectionId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      props.onDone();
    } catch (e) {
      props.onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack-sm">
      <label className="dim" htmlFor="adp-section-select">Concerned ADP section</label>
      <select
        id="adp-section-select"
        className="input"
        value={adpSectionId}
        onChange={(e) => setAdpSectionId(e.target.value)}
        disabled={busy}
      >
        {props.adpSections.map((s) => (
          <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
        ))}
      </select>
      <button
        className="btn btn-primary"
        onClick={submit}
        disabled={busy || !adpSectionId}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {busy ? '…' : 'Assign to ADP'}
      </button>
    </div>
  );
}

type ActionFn = () => Promise<Response>;

export function IndentActions(props: {
  readonly indentId: string;
  readonly status: string;
  readonly type: string;
  readonly roles: Role[];
  readonly isOwner: boolean;
  readonly itPerformaId: string | null;
  readonly cstId: string | null;
  readonly prId: string | null;
  readonly prStatus: string | null;
  readonly adpSections: ReadonlyArray<{ id: string; code: string; name: string }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const has = (r: Role) => props.roles.includes(r);
  const isAdmin = has(Role.ADMIN);

  async function run(label: string, action: ActionFn) {
    setBusy(label);
    setErr(null);
    try {
      const res = await action();
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  function post(path: string, body?: unknown): ActionFn {
    return () =>
      fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
  }

  const actions: { label: string; show: boolean; onClick: () => void; variant?: 'primary' | 'danger'; node?: ReactNode }[] = [];

  // Indenter actions
  if ((props.isOwner || isAdmin) && props.status === 'DRAFT') {
    actions.push({
      label: 'Submit for CR',
      show: true,
      variant: 'primary',
      onClick: () => run('submit', post(`/api/indents/${props.indentId}/submit`)),
    });
  }

  // CR Section forwards the submitted indent to Budget. Covers both SUBMITTED
  // (initial landing) and CR_RECEIVED (if an intake step was logged separately).
  if ((props.status === 'SUBMITTED' || props.status === 'CR_RECEIVED') && (has(Role.CR_STAFF) || isAdmin)) {
    actions.push({
      label: 'Forward to Budget',
      show: true,
      variant: 'primary',
      onClick: () => run('forward-budget', post(`/api/indents/${props.indentId}/forward-to-budget`)),
    });
  }

  // Budget Section verifies / rejects.
  if (props.status === 'BUDGET_CHECK' && (has(Role.BUDGET_STAFF) || isAdmin)) {
    actions.push({
      label: 'Verify budget',
      show: true,
      variant: 'primary',
      onClick: () => run('verify-budget', post(`/api/indents/${props.indentId}/verify-budget`)),
    });
    actions.push({
      label: 'Reject (no funds)',
      show: true,
      variant: 'danger',
      onClick: () => {
        const reason = window.prompt('Reason for budget rejection — this closes the indent.');
        if (!reason || !reason.trim()) return;
        run('reject-budget', post(`/api/indents/${props.indentId}/reject-budget`, { reason }));
      },
    });
  }

  // COORD assigns to a Concerned ADP section. Rendered as a small dropdown
  // beside the button because we already know the list server-side.
  if (props.status === 'COORD_VETTING' && (has(Role.COORD_STAFF) || isAdmin)) {
    actions.push({
      label: 'Assign to ADP',
      show: true,
      onClick: () => {},
      node: (
        <AssignToAdpControl
          key="assign-adp"
          indentId={props.indentId}
          adpSections={props.adpSections}
          onDone={() => router.refresh()}
          onError={setErr}
        />
      ),
    });
  }

  // Concerned ADP stamps the control number. Also works from ADP_OBSERVED
  // (post-rework), which the domain allows.
  if ((props.status === 'ADP_VETTING' || props.status === 'ADP_OBSERVED') && (has(Role.ADP_STAFF) || isAdmin)) {
    actions.push({
      label: 'Assign control number',
      show: true,
      variant: 'primary',
      onClick: () => {
        const cn = window.prompt('Control number (e.g. ADP1-2026-00042). 4–40 chars, A–Z/0–9/-.');
        if (!cn || !cn.trim()) return;
        run('control-number', post(`/api/indents/${props.indentId}/assign-control-number`, { controlNumber: cn.trim() }));
      },
    });
  }

  // SUPTD approves vetting and opens the AD→DD→DP(N)→DGDP→SECY(DP) chain.
  if (props.status === 'SUPTD_VETTING' && (has(Role.SUPTD) || isAdmin)) {
    actions.push({
      label: 'Approve vetting → open chain',
      show: true,
      variant: 'primary',
      onClick: () => run('enter-chain', post(`/api/indents/${props.indentId}/enter-indent-approval`)),
    });
  }

  // ADP raises an observation while the file is in ADP_VETTING
  if (props.status === 'ADP_VETTING' && (has(Role.ADP_STAFF) || isAdmin)) {
    actions.push({
      label: 'Raise observation',
      show: true,
      onClick: () => {
        const note = window.prompt('Observation note — this will send the file back to the indenter.');
        if (!note || !note.trim()) return;
        run('raise-obs', post(`/api/indents/${props.indentId}/observations`, { note }));
      },
    });
  }

  // Indenter resolves open observations to return the file to ADP
  if (props.status === 'ADP_OBSERVED' && (props.isOwner || isAdmin)) {
    actions.push({
      label: 'Resolve observations & return',
      show: true,
      variant: 'primary',
      onClick: () => {
        const resolution = window.prompt('Describe how you addressed the observations.');
        if (!resolution || !resolution.trim()) return;
        run('resolve-obs', post(`/api/indents/${props.indentId}/observations/resolve`, { resolution }));
      },
    });
  }

  // Admin shortcut for approval-step actions is handled on /approvals/[chainId].

  // IT phase: when indent is in IT_PREPARATION and no IT yet, link to the create page.
  if (props.status === 'IT_PREPARATION' && !props.itPerformaId && (has(Role.ADP_STAFF) || isAdmin)) {
    actions.push({
      label: 'Create IT Proforma',
      show: true,
      variant: 'primary',
      onClick: () => {},
      node: <Link key="create-it" className="btn btn-primary" href={`/indents/${props.indentId}/it/new`}>Create IT Proforma →</Link>,
    });
  }

  // IT in DRAFT → start approval
  if (props.itPerformaId && props.status === 'IT_PREPARATION' && (has(Role.ADP_STAFF) || isAdmin)) {
    actions.push({
      label: 'Start IT approval',
      show: true,
      onClick: () => run('start-it', post(`/api/it-proformas/${props.itPerformaId}/start-approval`)),
    });
  }

  // IT APPROVED → dispatch (uses a prompt for the closing date)
  if (props.itPerformaId && props.status === 'IT_DISPATCHED' && (has(Role.ADP_STAFF) || has(Role.COORD_STAFF) || isAdmin)) {
    actions.push({
      label: 'Dispatch IT',
      show: true,
      variant: 'primary',
      onClick: () => {
        const input = window.prompt(
          'Offer closing date (YYYY-MM-DD or ISO). Example: 2026-12-31',
          new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10),
        );
        if (!input) return;
        const closingAt = /T/.test(input) ? input : `${input}T17:00:00Z`;
        run('dispatch-it', post(`/api/it-proformas/${props.itPerformaId}/dispatch`, { closingAt }));
      },
    });
  }

  // TSR start
  if (props.status === 'TECH_OFFERS_OPEN' && props.itPerformaId && (has(Role.INSPECTORATE) || isAdmin)) {
    actions.push({
      label: 'Start TSR',
      show: true,
      variant: 'primary',
      onClick: () => run('start-tsr', post('/api/tsrs', { itPerformaId: props.itPerformaId })),
    });
  }

  // Commercial / CST / PR links
  if (props.status === 'COMMERCIAL_OPEN' && (has(Role.ADP_STAFF) || has(Role.COORD_STAFF) || isAdmin)) {
    actions.push({
      label: 'Open commercial offers',
      show: true,
      onClick: () => {},
      node: <Link key="comm" className="btn" href={`/indents/${props.indentId}/commercial/new`}>Open commercial offer →</Link>,
    });
    actions.push({
      label: 'Prepare CST',
      show: true,
      onClick: () => {},
      node: <Link key="cst" className="btn btn-primary" href={`/indents/${props.indentId}/cst/new`}>Prepare CST →</Link>,
    });
  }
  if (props.status === 'CST_PREPARATION' && props.cstId && (has(Role.ADP_STAFF) || has(Role.COORD_STAFF) || isAdmin)) {
    actions.push({
      label: 'Start CST approval',
      show: true,
      variant: 'primary',
      onClick: () => run('start-cst', post(`/api/csts/${props.cstId}/start-approval`)),
    });
  }
  if (props.status === 'CST_APPROVAL' && props.cstId && (has(Role.ADP_STAFF) || has(Role.COORD_STAFF) || isAdmin)) {
    actions.push({
      label: 'Issue PR',
      show: true,
      variant: 'primary',
      onClick: () => {
        const prNumber = window.prompt('PR number (format: PR/YYYY/XXXXX)', `PR/${new Date().getUTCFullYear()}/`);
        if (!prNumber) return;
        run('issue-pr', post('/api/prs', { cstId: props.cstId!, prNumber }));
      },
    });
  }
  if (props.prId && props.prStatus === 'DRAFT' && (has(Role.ADP_STAFF) || has(Role.COORD_STAFF) || isAdmin)) {
    actions.push({ label: 'Send PR (fax)', show: true, variant: 'primary', onClick: () => run('send-pr', post(`/api/prs/${props.prId}/send`)) });
  }
  if (props.prId && (props.prStatus === 'ACKNOWLEDGED' || props.prStatus === 'SENT') && (has(Role.ADP_STAFF) || has(Role.COORD_STAFF) || isAdmin)) {
    actions.push({ label: 'Close PR + indent', show: true, variant: 'primary', onClick: () => run('close-pr', post(`/api/prs/${props.prId}/close`)) });
  }

  // Terminal / unavailable
  if (actions.length === 0) {
    return <div className="muted">No action available for your role in this state.</div>;
  }

  return (
    <div className="stack-sm">
      {err && <div className="err">{err}</div>}
      {actions.map((a) =>
        a.node ? (
          a.node
        ) : (
          <button
            key={a.label}
            className={`btn ${a.variant === 'primary' ? 'btn-primary' : a.variant === 'danger' ? 'btn-danger' : ''}`}
            onClick={a.onClick}
            disabled={busy !== null}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {busy === a.label ? '…' : a.label}
          </button>
        ),
      )}
    </div>
  );
}
