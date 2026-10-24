import { BaseDomainEvent } from '../../shared/DomainEvent';
import type { ApprovalChainStatus, ApprovalRole, ApprovalStepStatus, ApprovalSubject } from '../ApprovalTypes';

export class ApprovalChainStartedEvent extends BaseDomainEvent {
  constructor(chainId: string, subject: ApprovalSubject, subjectId: string, template: readonly ApprovalRole[]) {
    super('approval.chain.started', chainId, { subject, subjectId, template });
  }
}

export class ApprovalStepDecidedEvent extends BaseDomainEvent {
  constructor(
    chainId: string,
    stepIndex: number,
    role: ApprovalRole,
    status: ApprovalStepStatus,
    actorUserId: string,
    comments: string | null,
  ) {
    super('approval.step.decided', chainId, { stepIndex, role, status, actorUserId, comments });
  }
}

export class ApprovalChainCompletedEvent extends BaseDomainEvent {
  constructor(chainId: string, subject: ApprovalSubject, subjectId: string, finalStatus: ApprovalChainStatus) {
    super('approval.chain.completed', chainId, { subject, subjectId, finalStatus });
  }
}
