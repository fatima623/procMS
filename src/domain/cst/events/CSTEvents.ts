import { BaseDomainEvent } from '../../shared/DomainEvent';
import type { CSTStatus } from '../CSTStatus';

export class CSTCreatedEvent extends BaseDomainEvent {
  constructor(id: string, itPerformaId: string, preparedByUserId: string, singleQuote: boolean) {
    super('cst.created', id, { itPerformaId, preparedByUserId, singleQuote });
  }
}

export class CSTStatusChangedEvent extends BaseDomainEvent {
  constructor(id: string, from: CSTStatus, to: CSTStatus, actorUserId: string, reason?: string) {
    super('cst.status.changed', id, { from, to, actorUserId, reason: reason ?? null });
  }
}

export class CSTAwardRecommendedEvent extends BaseDomainEvent {
  constructor(id: string, commercialOfferId: string, firmId: string, actorUserId: string) {
    super('cst.award.recommended', id, { commercialOfferId, firmId, actorUserId });
  }
}
