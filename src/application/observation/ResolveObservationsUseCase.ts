import { Role } from '@prisma/client';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/domain/errors/DomainError';
import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

export interface ResolveObservationsDto {
  readonly resolution: string;
}

/**
 * Indenter resolves ALL open observations on their indent in one shot and
 * returns the file to the ADP (ADP_OBSERVED → ADP_VETTING). We resolve the
 * whole set because the workflow treats observations as a batch — the indent
 * can't return to vetting while any are open.
 */
export class ResolveObservationsUseCase {
  constructor(private readonly deps: {
    readonly uow: UnitOfWork;
    readonly clock: Clock;
    readonly logger: Logger;
  }) {}

  public async execute(ctx: AuthContext, indentId: string, dto: ResolveObservationsDto): Promise<{ resolvedCount: number }> {
    if (!hasRole(ctx, Role.INDENTER, Role.ADMIN)) {
      throw new ForbiddenError('Only the indenter may resolve observations');
    }
    if (dto.resolution.trim().length === 0) {
      throw new ValidationError('Resolution text is required', { resolution: 'required' });
    }

    return this.deps.uow.run(async (h) => {
      const indent = await h.indents.findById(indentId);
      if (!indent) throw new NotFoundError('Indent', indentId);
      if (indent.indenterId !== ctx.userId && !hasRole(ctx, Role.ADMIN)) {
        throw new ForbiddenError('Only the owning indenter may resolve observations');
      }

      const { prisma } = await import('@/infrastructure/db/prisma');
      const open = await prisma.observation.findMany({ where: { indentId, status: 'OPEN' } });
      if (open.length === 0) {
        throw new BusinessRuleViolationError('No open observations to resolve');
      }

      indent.resolveObservations(ctx.userId);     // state transition ADP_OBSERVED → ADP_VETTING
      await h.indents.save(indent);

      const now = this.deps.clock.now();
      await prisma.observation.updateMany({
        where: { indentId, status: 'OPEN' },
        data: {
          status: 'RESOLVED',
          resolvedByUserId: ctx.userId,
          resolvedAt: now,
          resolution: dto.resolution,
        },
      });

      await h.audit.appendFromEvents(ctx.userId, indent.pullEvents(), {
        subjectType: 'INDENT', subjectId: indent.id,
      });
      for (const obs of open) {
        await h.audit.append({
          actorUserId: ctx.userId,
          action: 'observation.resolved',
          subjectType: 'OBSERVATION',
          subjectId: obs.id,
          metadata: { indentId },
          occurredAt: now,
        });
      }

      this.deps.logger.info({ indentId, resolvedCount: open.length }, 'observations resolved');
      return { resolvedCount: open.length };
    });
  }
}
