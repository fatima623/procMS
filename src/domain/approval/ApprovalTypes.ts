export const ApprovalSubject = {
  INDENT: 'INDENT',
  IT_PROFORMA: 'IT_PROFORMA',
  CST: 'CST',
} as const;
export type ApprovalSubject = (typeof ApprovalSubject)[keyof typeof ApprovalSubject];

export const ApprovalChainStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;
export type ApprovalChainStatus = (typeof ApprovalChainStatus)[keyof typeof ApprovalChainStatus];

export const ApprovalStepStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RETURNED: 'RETURNED',
  SKIPPED: 'SKIPPED',
} as const;
export type ApprovalStepStatus = (typeof ApprovalStepStatus)[keyof typeof ApprovalStepStatus];

/** The eight roles that may appear in an approval chain. Mirrors prisma Role. */
export const ApprovalRole = {
  AD: 'AD',
  DD: 'DD',
  DP_N: 'DP_N',
  DGDP: 'DGDP',
  SECY_DP: 'SECY_DP',
  SUPTD: 'SUPTD',
  CPO: 'CPO',
} as const;
export type ApprovalRole = (typeof ApprovalRole)[keyof typeof ApprovalRole];

/** Canonical chain templates per subject. */
export const CHAIN_TEMPLATES: Readonly<Record<ApprovalSubject, readonly ApprovalRole[]>> = {
  INDENT: [ApprovalRole.AD, ApprovalRole.DD, ApprovalRole.DP_N, ApprovalRole.DGDP, ApprovalRole.SECY_DP],
  IT_PROFORMA: [ApprovalRole.AD, ApprovalRole.DD, ApprovalRole.DP_N],
  CST: [ApprovalRole.AD, ApprovalRole.DD],
};

/** Single-quote CST escalates to the full senior chain. */
export const CST_SINGLE_QUOTE_TEMPLATE: readonly ApprovalRole[] = [
  ApprovalRole.AD,
  ApprovalRole.DD,
  ApprovalRole.DP_N,
  ApprovalRole.DGDP,
  ApprovalRole.SECY_DP,
];
