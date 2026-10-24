export const ITStatus = {
  DRAFT: 'DRAFT',
  IN_APPROVAL: 'IN_APPROVAL',
  APPROVED: 'APPROVED',
  DISPATCHED: 'DISPATCHED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;
export type ITStatus = (typeof ITStatus)[keyof typeof ITStatus];

export const TERMINAL_IT_STATUSES: ReadonlySet<ITStatus> = new Set([
  ITStatus.CLOSED,
  ITStatus.CANCELLED,
]);
