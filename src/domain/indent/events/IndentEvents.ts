import { BaseDomainEvent } from '../../shared/DomainEvent';
import type { IndentStatus } from '../IndentStatus';

export class IndentSubmittedEvent extends BaseDomainEvent {
  constructor(indentId: string, submittedAt: Date, indenterId: string) {
    super('indent.submitted', indentId, { submittedAt: submittedAt.toISOString(), indenterId });
  }
}

export class IndentStatusChangedEvent extends BaseDomainEvent {
  constructor(indentId: string, from: IndentStatus, to: IndentStatus, actorUserId: string, reason?: string) {
    super('indent.status.changed', indentId, { from, to, actorUserId, reason: reason ?? null });
  }
}

export class IndentControlNumberAssignedEvent extends BaseDomainEvent {
  constructor(indentId: string, controlNumber: string, assignedByUserId: string) {
    super('indent.controlNumber.assigned', indentId, { controlNumber, assignedByUserId });
  }
}

export class IndentCancelledEvent extends BaseDomainEvent {
  constructor(indentId: string, reason: string, cancelledByUserId: string) {
    super('indent.cancelled', indentId, { reason, cancelledByUserId });
  }
}
