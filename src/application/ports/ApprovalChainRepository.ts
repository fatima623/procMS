import type { ApprovalChain } from '@/domain/approval/ApprovalChain';
import type { ApprovalSubject } from '@/domain/approval/ApprovalTypes';

export interface ApprovalChainRepository {
  findById(id: string): Promise<ApprovalChain | null>;

  /** Resolve a chain by the business entity it belongs to (idempotent lookup). */
  findBySubject(subject: ApprovalSubject, subjectId: string): Promise<ApprovalChain | null>;

  insert(chain: ApprovalChain): Promise<void>;

  save(chain: ApprovalChain): Promise<void>;
}
