export const TSRStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  QUERIES_RAISED: 'QUERIES_RAISED',
  COMPLETED: 'COMPLETED',
} as const;
export type TSRStatus = (typeof TSRStatus)[keyof typeof TSRStatus];

export const TSRVerdict = {
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  NEEDS_QUERY: 'NEEDS_QUERY',
} as const;
export type TSRVerdict = (typeof TSRVerdict)[keyof typeof TSRVerdict];

export const TSRQueryStatus = {
  OPEN: 'OPEN',
  ANSWERED: 'ANSWERED',
  CLOSED: 'CLOSED',
} as const;
export type TSRQueryStatus = (typeof TSRQueryStatus)[keyof typeof TSRQueryStatus];
