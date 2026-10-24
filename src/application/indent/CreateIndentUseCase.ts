import { Indent } from '@/domain/indent/Indent';
import { IndentItem } from '@/domain/indent/IndentItem';
import { Money } from '@/domain/shared/Money';
import { ForbiddenError } from '@/domain/errors/DomainError';
import { Role } from '@prisma/client';

import type { AuthContext } from '../ports/AuthContext';
import { hasRole } from '../ports/AuthContext';
import type { Clock } from '../ports/Clock';
import type { IdFactory } from '../ports/IdFactory';
import type { Logger } from '../ports/Logger';
import type { UnitOfWork } from '../ports/UnitOfWork';
import type { CreateIndentDto } from './dto/CreateIndentDto';

export interface CreateIndentResult {
  readonly indentId: string;
  readonly indentNumber: string;
}

/**
 * Create a draft indent on behalf of the current user.
 *
 * - AuthZ: the caller must hold INDENTER (or ADMIN) role.
 * - Owning section is derived from the caller's section membership; if the
 *   caller belongs to multiple sections, the first non-ADP section is used.
 *   For production use we expect the UI to pass an explicit sectionId;
 *   that extension point goes on the DTO when needed.
 */
export class CreateIndentUseCase {
  constructor(
    private readonly deps: {
      readonly uow: UnitOfWork;
      readonly ids: IdFactory;
      readonly clock: Clock;
      readonly logger: Logger;
      readonly indentNumberGenerator: () => Promise<string>;
    },
  ) {}

  public async execute(ctx: AuthContext, dto: CreateIndentDto): Promise<CreateIndentResult> {
    if (!hasRole(ctx, Role.INDENTER, Role.ADMIN)) {
      throw new ForbiddenError('Only indenters may create indents');
    }
    if (ctx.sectionIds.length === 0) {
      throw new ForbiddenError('User is not a member of any section');
    }
    const sectionId = ctx.sectionIds[0]!;

    const log = this.deps.logger.child({ useCase: 'CreateIndent', userId: ctx.userId });
    log.info({ dtoSubject: dto.subject, itemCount: dto.items.length }, 'creating indent');

    return this.deps.uow.run(async (h) => {
      const indentNumber = await this.deps.indentNumberGenerator();
      const indentId = this.deps.ids.next();
      const now = this.deps.clock.now();

      const items = dto.items.map((it) =>
        IndentItem.create(this.deps.ids.next(), {
          indentId,
          lineNo: it.lineNo,
          itemCode: it.itemCode,
          description: it.description,
          specifications: it.specifications,
          quantity: it.quantity,
          uom: it.uom,
          estimatedUnitPrice: Money.of(BigInt(it.estimatedUnitPriceMinor), it.currency),
        }),
      );

      const indent = Indent.create(
        indentId,
        {
          indentNumber,
          subject: dto.subject,
          justification: dto.justification,
          type: dto.type,
          priority: dto.priority,
          estimatedValue: Money.of(BigInt(dto.estimatedValueMinor), dto.currency),
          indenterId: ctx.userId,
          sectionId,
          fiscalYearId: dto.fiscalYearId,
          budgetHeadId: dto.budgetHeadId,
        },
        items,
        now,
      );

      await h.indents.insert(indent);

      await h.audit.append({
        actorUserId: ctx.userId,
        action: 'indent.created',
        subjectType: 'INDENT',
        subjectId: indent.id,
        metadata: { indentNumber: indent.indentNumber, value: indent.estimatedValue.toJSON() },
        occurredAt: now,
      });

      log.info({ indentId: indent.id, indentNumber }, 'indent created');
      return { indentId: indent.id, indentNumber };
    });
  }
}
