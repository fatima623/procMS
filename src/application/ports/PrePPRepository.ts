import type { PrePPStatus } from '@prisma/client';

export interface PrePPRecord {
  readonly id: string;
  readonly indentId: string;
  readonly status: PrePPStatus;
  readonly approvalChainId: string | null;
}

export interface PrePPRepository {
  findById(id: string): Promise<PrePPRecord | null>;
  findByIndentId(indentId: string): Promise<PrePPRecord | null>;
  setPending(id: string, approvalChainId: string): Promise<void>;
  setDecision(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string): Promise<void>;
}