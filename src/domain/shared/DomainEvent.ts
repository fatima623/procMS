/**
 * Marker interface for all domain events. Events are facts about the past;
 * they are named in the perfect tense (`IndentSubmitted`, `IndentApproved`)
 * and are immutable.
 */
export interface DomainEvent {
  readonly eventName: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export abstract class BaseDomainEvent implements DomainEvent {
  public readonly occurredAt: Date;

  protected constructor(
    public readonly eventName: string,
    public readonly aggregateId: string,
    public readonly payload: Readonly<Record<string, unknown>>,
    occurredAt?: Date,
  ) {
    this.occurredAt = occurredAt ?? new Date();
  }
}
