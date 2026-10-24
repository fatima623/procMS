import type { TechnicalOffer } from '@/domain/offers/TechnicalOffer';

export interface TechnicalOfferRepository {
  findById(id: string): Promise<TechnicalOffer | null>;
  findByIT(itPerformaId: string): Promise<readonly TechnicalOffer[]>;
  findForFirm(itPerformaId: string, firmId: string): Promise<TechnicalOffer | null>;
  insert(offer: TechnicalOffer): Promise<void>;
  save(offer: TechnicalOffer): Promise<void>;
}
