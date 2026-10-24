/**
 * Indent lifecycle. Mirrored by `IndentStatus` in prisma/schema.prisma.
 * The state machine lives in Indent.ts — this file is just the vocabulary.
 */
export const IndentStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  CR_RECEIVED: 'CR_RECEIVED',
  BUDGET_CHECK: 'BUDGET_CHECK',
  BUDGET_REJECTED: 'BUDGET_REJECTED',
  COORD_VETTING: 'COORD_VETTING',
  ADP_VETTING: 'ADP_VETTING',
  ADP_OBSERVED: 'ADP_OBSERVED',
  SUPTD_VETTING: 'SUPTD_VETTING',
  INDENT_APPROVAL: 'INDENT_APPROVAL',
  INDENT_REJECTED: 'INDENT_REJECTED',
  CPO_APPROVAL: 'CPO_APPROVAL',
  IT_PREPARATION: 'IT_PREPARATION',
  IT_APPROVAL: 'IT_APPROVAL',
  IT_DISPATCHED: 'IT_DISPATCHED',
  TECH_OFFERS_OPEN: 'TECH_OFFERS_OPEN',
  TSR_IN_PROGRESS: 'TSR_IN_PROGRESS',
  COMMERCIAL_OPEN: 'COMMERCIAL_OPEN',
  CST_PREPARATION: 'CST_PREPARATION',
  CST_APPROVAL: 'CST_APPROVAL',
  PR_ISSUED: 'PR_ISSUED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;

export type IndentStatus = (typeof IndentStatus)[keyof typeof IndentStatus];

export const IndentType = {
  NORMAL: 'NORMAL',
  PROPRIETY: 'PROPRIETY',
} as const;
export type IndentType = (typeof IndentType)[keyof typeof IndentType];

export const IndentPriority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;
export type IndentPriority = (typeof IndentPriority)[keyof typeof IndentPriority];

/** Terminal states — no further transitions allowed. */
export const TERMINAL_STATUSES: ReadonlySet<IndentStatus> = new Set([
  IndentStatus.CLOSED,
  IndentStatus.CANCELLED,
  IndentStatus.INDENT_REJECTED,
  IndentStatus.BUDGET_REJECTED,
]);

export const isTerminal = (s: IndentStatus): boolean => TERMINAL_STATUSES.has(s);
