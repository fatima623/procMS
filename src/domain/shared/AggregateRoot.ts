import { Entity } from './Entity';
import type { DomainEvent } from './DomainEvent';

/**
 * Aggregate root — the only entity type the outside world may obtain a
 * reference to. Transactional boundary == one aggregate. Cross-aggregate
 * consistency is eventual (via domain events dispatched by the application
 * layer after commit).
 */
export abstract class AggregateRoot<TId extends string = string> extends Entity<TId> {
  // Optimistic-concurrency token. The repository compares and bumps it on save.
  private _version: number;

  // Events accumulated during this unit of work. The application layer drains
  // them with pullEvents() after a successful commit and dispatches them.
  private readonly _events: DomainEvent[] = [];

  protected constructor(id: TId, version: number) {
    super(id);
    this._version = version;
  }

  public get version(): number {
    return this._version;
  }

  /** Called by the repository after a successful save. */
  public markPersisted(newVersion: number): void {
    this._version = newVersion;
  }

  protected addEvent(event: DomainEvent): void {
    this._events.push(event);
  }

  /** Drain accumulated events — caller owns dispatch and must not mutate the array. */
  public pullEvents(): readonly DomainEvent[] {
    const drained = [...this._events];
    this._events.length = 0;
    return drained;
  }
}
