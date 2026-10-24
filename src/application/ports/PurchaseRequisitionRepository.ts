import type { PurchaseRequisition } from '@/domain/pr/PurchaseRequisition';

export interface PurchaseRequisitionRepository {
  findById(id: string): Promise<PurchaseRequisition | null>;
  findByCST(cstId: string): Promise<PurchaseRequisition | null>;
  findByPRNumber(prNumber: string): Promise<PurchaseRequisition | null>;
  insert(pr: PurchaseRequisition): Promise<void>;
  save(pr: PurchaseRequisition): Promise<void>;
}
