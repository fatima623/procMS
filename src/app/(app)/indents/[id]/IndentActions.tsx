'use client';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Role } from '@prisma/client';

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
