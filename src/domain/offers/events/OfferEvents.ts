import { BaseDomainEvent } from '../../shared/DomainEvent';
import type { OfferStatus } from '../OfferStatus';

export class TechnicalOfferSubmittedEvent extends BaseDomainEvent {
  constructor(id: string, itPerformaId: string, firmId: string, submittedAt: Date) {
    super('offer.technical.submitted', id, {
      itPerformaId,
      firmId,
      submittedAt: submittedAt.toISOString(),
    });
  }
}

export class TechnicalOfferStatusChangedEvent extends BaseDomainEvent {
  constructor(id: string, from: OfferStatus, to: OfferStatus, actorUserId: string, remarks: string | null) {
    super('offer.technical.status.changed', id, { from, to, actorUserId, remarks });
  }
}

export class CommercialOfferOpenedEvent extends BaseDomainEvent {
  constructor(id: string, itPerformaId: string, firmId: string, totalPriceMinor: string, currency: string) {
    super('offer.commercial.opened', id, { itPerformaId, firmId, totalPriceMinor, currency });
  }
}

export class CommercialOfferStatusChangedEvent extends BaseDomainEvent {
  constructor(id: string, from: OfferStatus, to: OfferStatus, actorUserId: string) {
    super('offer.commercial.status.changed', id, { from, to, actorUserId });
  }
}
