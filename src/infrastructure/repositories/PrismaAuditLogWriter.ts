import { Prisma, type PrismaClient } from '@prisma/client';
import { ulid } from 'ulid';

import type { AuditLogEntry, AuditLogWriter } from '@/application/ports/AuditLogWriter';
import type { DomainEvent } from '@/domain/shared/DomainEvent';

type Tx = Prisma.TransactionClient | PrismaClient;

export class PrismaAuditLogWriter implements AuditLogWriter {
  constructor(private readonly tx: Tx) {}

  public async append(entry: AuditLogEntry): Promise<void> {
    await this.tx.auditLog.create({
      data: {
        id: ulid(),
        actorUserId: entry.actorUserId,
        action: entry.action,
        subjectType: entry.subjectType,
        subjectId: entry.subjectId,
        metadata: (entry.metadata as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        occurredAt: entry.occurredAt,
      },
    });
  }

  public async appendFromEvents(
    actorUserId: string | null,
    events: readonly DomainEvent[],
    extras: { subjectType: string; subjectId: string; ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    if (events.length === 0) return;
    // Use createMany for a single round-trip when we have multiple events.
    await this.tx.auditLog.createMany({
      data: events.map((ev) => ({
        id: ulid(),
        actorUserId,
        action: ev.eventName,
        subjectType: extras.subjectType,
        subjectId: extras.subjectId,
        metadata: ev.payload as Prisma.InputJsonValue,
        ipAddress: extras.ipAddress ?? null,
        userAgent: extras.userAgent ?? null,
        occurredAt: ev.occurredAt,
      })),
    });
  }
}
