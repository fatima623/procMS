import { NotFoundError, ForbiddenError } from '@/domain/errors/DomainError';
import type { Indent } from '@/domain/indent/Indent';
import { Role } from '@prisma/client';
import type { AuthContext } from '../ports/AuthContext';
import type { IndentRepository } from '../ports/IndentRepository';

/**
 * Read-only use-case; no UoW needed. Enforces that the caller is allowed to
 * see the indent (owning indenter, section member, assigned ADP, or a role
 * on the approval chain).
 */
export class GetIndentUseCase {
  constructor(private readonly indents: IndentRepository) {}

  public async execute(ctx: AuthContext, indentId: string): Promise<Indent> {
    const indent = await this.indents.findById(indentId);
    if (!indent) throw new NotFoundError('Indent', indentId);

    const canSee =
      ctx.roles.includes(Role.ADMIN) ||
      ctx.userId === indent.indenterId ||
      ctx.sectionIds.includes(indent.sectionId) ||
      (indent.assignedAdpId !== null && ctx.sectionIds.includes(indent.assignedAdpId)) ||
      // Approval-chain roles may see everything in flight so they can act.
      ctx.roles.some((r) =>
        ([Role.AD, Role.DD, Role.DP_N, Role.DGDP, Role.SECY_DP, Role.SUPTD, Role.CPO, Role.COORD_STAFF, Role.BUDGET_STAFF, Role.INSPECTORATE] as Role[]).includes(r),
      );
    if (!canSee) throw new ForbiddenError('Not permitted to view this indent');

    return indent;
  }
}
