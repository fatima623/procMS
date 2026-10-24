export const CSTStatus = {
  DRAFT: 'DRAFT',
  IN_APPROVAL: 'IN_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type CSTStatus = (typeof CSTStatus)[keyof typeof CSTStatus];
