import type { ReactNode } from 'react';

export type PillTone = 'ok' | 'warn' | 'danger' | 'info' | 'default';

const TONE_CLASS: Record<PillTone, string> = {
  ok:      'pill pill-ok',
  warn:    'pill pill-warn',
  danger:  'pill pill-danger',
  info:    'pill pill-info',
  default: 'pill',
};

export function StatusPill({ tone = 'default', children }: { tone?: PillTone; children: ReactNode }) {
  return <span className={TONE_CLASS[tone]}>{children}</span>;
}

/** Map an IndentStatus string to a pill tone — single place for the colour rules. */
export function toneForIndentStatus(status: string): PillTone {
  if (['CLOSED', 'PR_ISSUED'].includes(status)) return 'ok';
  if (['CANCELLED', 'BUDGET_REJECTED', 'INDENT_REJECTED'].includes(status)) return 'danger';
  if (['DRAFT', 'ADP_OBSERVED'].includes(status)) return 'warn';
  return 'info';
}

export function toneForApprovalStatus(status: string): PillTone {
  if (status === 'APPROVED') return 'ok';
  if (status === 'REJECTED') return 'danger';
  if (status === 'PENDING') return 'warn';
  return 'default';
}
