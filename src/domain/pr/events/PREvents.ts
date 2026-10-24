import { BaseDomainEvent } from '../../shared/DomainEvent';
import type { PRStatus } from '../PRStatus';

export class PurchaseRequisitionCreatedEvent extends BaseDomainEvent {
  constructor(id: string, cstId: string, firmId: string, prNumber: string, amountMinor: string, currency: string) {
    super('pr.created', id, { cstId, firmId, prNumber, amountMinor, currency });
  }
}

export class PurchaseRequisitionStatusChangedEvent extends BaseDomainEvent {
  constructor(id: string, from: PRStatus, to: PRStatus, actorUserId: string) {
    super('pr.status.changed', id, { from, to, actorUserId });
  }
}
