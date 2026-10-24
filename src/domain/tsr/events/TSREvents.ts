import { BaseDomainEvent } from '../../shared/DomainEvent';
import type { TSRStatus, TSRVerdict } from '../TSRTypes';

export class TSRCreatedEvent extends BaseDomainEvent {
  constructor(id: string, itPerformaId: string, inspectorateUserId: string) {
    super('tsr.created', id, { itPerformaId, inspectorateUserId });
  }
}

export class TSRStatusChangedEvent extends BaseDomainEvent {
  constructor(id: string, from: TSRStatus, to: TSRStatus, actorUserId: string) {
    super('tsr.status.changed', id, { from, to, actorUserId });
  }
}

export class TSREvaluationRecordedEvent extends BaseDomainEvent {
  constructor(id: string, offerId: string, verdict: TSRVerdict, actorUserId: string, remarks: string | null) {
    super('tsr.evaluation.recorded', id, { offerId, verdict, actorUserId, remarks });
  }
}

export class TSRQueryRaisedEvent extends BaseDomainEvent {
  constructor(id: string, queryId: string, firmId: string, actorUserId: string) {
    super('tsr.query.raised', id, { queryId, firmId, actorUserId });
  }
}

export class TSRQueryAnsweredEvent extends BaseDomainEvent {
  constructor(id: string, queryId: string, firmId: string, actorUserId: string) {
    super('tsr.query.answered', id, { queryId, firmId, actorUserId });
  }
}
