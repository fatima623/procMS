import type { CST } from '@/domain/cst/CST';

export interface CSTRepository {
  findById(id: string): Promise<CST | null>;
  findByIT(itPerformaId: string): Promise<CST | null>;
  insert(cst: CST): Promise<void>;
  save(cst: CST): Promise<void>;
}
