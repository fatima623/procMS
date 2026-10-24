import type { ApprovalStepStatus } from '@/domain/approval/ApprovalTypes';

export interface DecideApprovalDto {
  /** APPROVED | REJECTED | RETURNED — PENDING / SKIPPED are not valid decisions. */
  readonly decision: Extract<ApprovalStepStatus, 'APPROVED' | 'REJECTED' | 'RETURNED'>;
  readonly comments?: string;
}
