import { Role } from '@prisma/client';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  NotFoundError,
} from '@/domain/errors/DomainError';
import { ITPerforma } from '@/domain/itproforma/ITPerforma';
import { IndentStatus } from '@/domain/indent/IndentStatus';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { IdFactory } from '../ports/IdFactory';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';
import type { CreateITPerformaDto } from '../indent/dto/CreateITPerformaDto';

export interface CreateITPerformaResult {
  readonly itPerformaId: string;
  readonly reference: string;
}

/**
 * Concerned ADP prepares the IT Issue Proforma for an indent whose
 * indent-approval chain has terminated APPROVED (indent is in IT_PREPARATION).
 */
export class CreateITPerformaUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly ids: IdFactory;
      readonly clock: Clock;
      readonly logger: Logger;
    },
  ) {}

  public async execute(ctx: AuthContext, dto: CreateITPerformaDto): Promise<CreateITPerformaResult> {
    if (!hasRole(ctx, Role.ADP_STAFF, Role.ADMIN)) {
      throw new ForbiddenError('Only Concerned ADP staff may prepare IT proformas');
    }

    const log = this.deps.logger.child({ useCase: 'CreateITPerforma', userId: ctx.userId });

    return this.deps.uow.run(async (h) => {
      const indent = await h.indents.findById(dto.indentId);
      if (!indent) throw new NotFoundError('Indent', dto.indentId);
      if (indent.status !== IndentStatus.IT_PREPARATION) {
        throw new BusinessRuleViolationError(
          `Indent must be in IT_PREPARATION to attach a proforma (currently ${indent.status})`,
        );
      }
      const existing = await h.itProformas.findByIndentId(dto.indentId);
      if (existing) {
        throw new BusinessRuleViolationError('IT Proforma already exists for this indent');
      }
      if (await h.itProformas.findByReference(dto.reference)) {
        throw new BusinessRuleViolationError(`IT reference ${dto.reference} already in use`);
      }

      const now = this.deps.clock.now();
      const it = ITPerforma.create(
        this.deps.ids.next(),
        {
          indentId: dto.indentId,
          reference: dto.reference,
          checklist: dto.checklist,
          preparedByUserId: ctx.userId,
        },
        dto.invitedFirmIds,
        now,
      );
      await h.itProformas.insert(it);
      await h.audit.appendFromEvents(ctx.userId, it.pullEvents(), {
        subjectType: 'IT_PROFORMA',
        subjectId: it.id,
      });
      log.info({ itId: it.id, reference: it.reference }, 'IT proforma created');
      return { itPerformaId: it.id, reference: it.reference };
    });
  }
}
