import type { DomainEvent } from '@/domain/shared/DomainEvent';

export interface AuditLogEntry {
  readonly actorUserId: string | null;
  readonly action: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly occurredAt: Date;
}

export interface AuditLogWriter {
  /** Append one entry inside the current unit of work. */
  append(entry: AuditLogEntry): Promise<void>;

  /** Convenience for persisting an entire batch of domain events. */
  appendFromEvents(
    actorUserId: string | null,
    events: readonly DomainEvent[],
    extras: { subjectType: string; subjectId: string; ipAddress?: string; userAgent?: string },
  ): Promise<void>;
}
