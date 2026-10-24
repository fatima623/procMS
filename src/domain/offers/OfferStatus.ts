export const OfferStatus = {
  RECEIVED: 'RECEIVED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;
export type OfferStatus = (typeof OfferStatus)[keyof typeof OfferStatus];
