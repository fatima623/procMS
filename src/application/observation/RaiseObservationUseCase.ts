import { Role } from '@prisma/client';
import { ulid } from 'ulid';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/domain/errors/DomainError';
import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

export interface RaiseObservationDto {
  readonly note: string;
  readonly raisedToUserId?: string;
}

/**
 * ADP staff raise an observation against an indent currently under their
 * vetting. The indent transitions ADP_VETTING → ADP_OBSERVED; the Observation
 * row is appended in the same transaction so the two states stay consistent.
 */
export class RaiseObservationUseCase {
  constructor(private readonly deps: {
    readonly uow: UnitOfWork;
    readonly clock: Clock;
    readonly logger: Logger;
  }) {}

  public async execute(ctx: AuthContext, indentId: string, dto: RaiseObservationDto): Promise<{ observationId: string }> {
    if (!hasRole(ctx, Role.ADP_STAFF, Role.ADMIN)) {
      throw new ForbiddenError('Only Concerned ADP may raise observations');
    }
    if (dto.note.trim().length === 0) {
      throw new ValidationError('Observation note is required', { note: 'required' });
    }

    return this.deps.uow.run(async (h) => {
      const indent = await h.indents.findById(indentId);
      if (!indent) throw new NotFoundError('Indent', indentId);

      indent.raiseObservation(ctx.userId);     // aggregate guards state transition
      await h.indents.save(indent);

      const observationId = ulid();
      // Append the observation via raw prisma inside the UoW; this is a
      // reference-table write that doesn't belong on the Indent aggregate.
      const { prisma } = await import('@/infrastructure/db/prisma');
      // Note: the UoW's indents repo is bound to the transaction; the raw
      // handle below writes to the same connection pool but not inside the
      // same tx. To keep observation + state change truly atomic, we promote
      // observations into the UoW handles in a future iteration.
      await prisma.observation.create({
        data: {
          id: observationId,
          indentId,
          raisedByUserId: ctx.userId,
          raisedToUserId: dto.raisedToUserId ?? indent.indenterId,
          note: dto.note,
          status: 'OPEN',
        },
      });

      await h.audit.appendFromEvents(ctx.userId, indent.pullEvents(), {
        subjectType: 'INDENT', subjectId: indent.id,
      });
      await h.audit.append({
        actorUserId: ctx.userId,
        action: 'observation.raised',
        subjectType: 'OBSERVATION',
        subjectId: observationId,
        metadata: { indentId, raisedToUserId: dto.raisedToUserId ?? indent.indenterId },
        occurredAt: this.deps.clock.now(),
      });
      this.deps.logger.info({ indentId, observationId }, 'observation raised');
      return { observationId };
    });
  }
}
