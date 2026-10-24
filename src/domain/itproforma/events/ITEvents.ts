import { BaseDomainEvent } from '../../shared/DomainEvent';
import type { ITStatus } from '../ITStatus';

export class ITProformaCreatedEvent extends BaseDomainEvent {
  constructor(itId: string, indentId: string, reference: string, preparedByUserId: string) {
    super('it.created', itId, { indentId, reference, preparedByUserId });
  }
}

export class ITStatusChangedEvent extends BaseDomainEvent {
  constructor(itId: string, from: ITStatus, to: ITStatus, actorUserId: string, reason?: string) {
    super('it.status.changed', itId, { from, to, actorUserId, reason: reason ?? null });
  }
}

export class ITFirmInvitedEvent extends BaseDomainEvent {
  constructor(itId: string, firmId: string, invitedByUserId: string) {
    super('it.firm.invited', itId, { firmId, invitedByUserId });
  }
}

export class ITFirmUninvitedEvent extends BaseDomainEvent {
  constructor(itId: string, firmId: string, removedByUserId: string) {
    super('it.firm.uninvited', itId, { firmId, removedByUserId });
  }
}

export class ITDispatchedEvent extends BaseDomainEvent {
  constructor(itId: string, dispatchedByUserId: string, dispatchedAt: Date, closingAt: Date) {
    super('it.dispatched', itId, {
      dispatchedByUserId,
      dispatchedAt: dispatchedAt.toISOString(),
      closingAt: closingAt.toISOString(),
    });
  }
}
