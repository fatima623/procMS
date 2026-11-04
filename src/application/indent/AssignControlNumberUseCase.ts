import { NotFoundError, ForbiddenError, ValidationError } from '@/domain/errors/DomainError';
import { Role } from '@prisma/client';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';

export interface AssignControlNumberDto {
  readonly controlNumber: string;
}

/**
 * Concerned ADP stamps the official control number and sends the indent on
 * to SUPTD for vetting. Domain guards the format and the dup check.
 * ADP_VETTING (or ADP_OBSERVED after rework) → SUPTD_VETTING.
 */
export class AssignControlNumberUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, indentId: string, dto: AssignControlNumberDto): Promise<void> {
    if (!hasRole(ctx, Role.ADP_STAFF, Role.ADMIN)) {
      throw new ForbiddenError('Only Concerned ADP may stamp a control number');
    }
    const controlNumber = (dto.controlNumber ?? '').trim();
    if (controlNumber.length === 0) {
      throw new ValidationError('Control number is required', { controlNumber: 'required' });
    }
    const log = this.deps.logger.child({ useCase: 'AssignControlNumber', indentId, userId: ctx.userId });

    await this.deps.uow.run(async (h) => {
      const indent = await h.indents.findById(indentId);
      if (!indent) throw new NotFoundError('Indent', indentId);

      indent.assignControlNumber(ctx.userId, controlNumber);
      await h.indents.save(indent);

      await h.audit.appendFromEvents(ctx.userId, indent.pullEvents(), {
        subjectType: 'INDENT',
        subjectId: indent.id,
      });
      log.info({ controlNumber }, 'control number assigned');
    });
  }
}
