import type { ITPerforma } from '@/domain/itproforma/ITPerforma';

export interface ITPerformaRepository {
  findById(id: string): Promise<ITPerforma | null>;
  findByIndentId(indentId: string): Promise<ITPerforma | null>;
  findByReference(reference: string): Promise<ITPerforma | null>;
  insert(it: ITPerforma): Promise<void>;
  save(it: ITPerforma): Promise<void>;
}
