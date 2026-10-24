import type { CommercialOffer } from '@/domain/offers/CommercialOffer';

export interface CommercialOfferRepository {
  findById(id: string): Promise<CommercialOffer | null>;
  findByIT(itPerformaId: string): Promise<readonly CommercialOffer[]>;
  findForFirm(itPerformaId: string, firmId: string): Promise<CommercialOffer | null>;
  insert(offer: CommercialOffer): Promise<void>;
  save(offer: CommercialOffer): Promise<void>;
}
