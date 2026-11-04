import { NotFoundError, ForbiddenError, ValidationError } from '@/domain/errors/DomainError';
import { Role } from '@prisma/client';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

export interface AssignToADPDto {
  readonly adpSectionId: string;
}

/**
 * COORD Section routes the indent to a specific Concerned ADP section.
 * COORD_VETTING → ADP_VETTING; stamps `assignedAdpId` on the indent.
 */
export class AssignToADPUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, indentId: string, dto: AssignToADPDto): Promise<void> {
    if (!hasRole(ctx, Role.COORD_STAFF, Role.ADMIN)) {
      throw new ForbiddenError('Only COORD Section may assign an indent to an ADP');
    }
    if (!dto.adpSectionId || dto.adpSectionId.trim().length === 0) {
      throw new ValidationError('ADP section id is required', { adpSectionId: 'required' });
    }
    const log = this.deps.logger.child({ useCase: 'AssignToADP', indentId, userId: ctx.userId });

    // Validate the section exists and is of kind=ADP. Cheap pre-check so the
    // ForeignKey error doesn't bubble up as a 500.
    const { prisma } = await import('@/infrastructure/db/prisma');
    const section = await prisma.section.findUnique({
      where: { id: dto.adpSectionId },
      select: { id: true, kind: true, isActive: true },
    });
    if (!section) throw new NotFoundError('Section', dto.adpSectionId);
    if (section.kind !== 'ADP') {
      throw new ValidationError(`Section is not an ADP section (kind=${section.kind})`);
    }
    if (!section.isActive) {
      throw new ValidationError('Target ADP section is inactive');
    }

    await this.deps.uow.run(async (h) => {
      const indent = await h.indents.findById(indentId);
      if (!indent) throw new NotFoundError('Indent', indentId);

      indent.assignToADP(ctx.userId, dto.adpSectionId);
      await h.indents.save(indent);

      await h.audit.appendFromEvents(ctx.userId, indent.pullEvents(), {
        subjectType: 'INDENT',
        subjectId: indent.id,
      });
      log.info({ adpSectionId: dto.adpSectionId }, 'indent assigned to ADP');
    });
  }
}
