import type { TSR } from '@/domain/tsr/TSR';

export interface TSRRepository {
  findById(id: string): Promise<TSR | null>;
  findByIT(itPerformaId: string): Promise<TSR | null>;
  insert(tsr: TSR): Promise<void>;
  save(tsr: TSR): Promise<void>;
}
