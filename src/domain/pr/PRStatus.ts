export const PRStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  CLOSED: 'CLOSED',
} as const;
export type PRStatus = (typeof PRStatus)[keyof typeof PRStatus];
