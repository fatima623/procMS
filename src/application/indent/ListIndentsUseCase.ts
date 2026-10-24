import { Role } from '@prisma/client';
import type { AuthContext } from '../ports/AuthContext';
import type {
  IndentPage,
  IndentRepository,
  ListIndentsFilter,
} from '../ports/IndentRepository';

/**
 * Row-level authorisation on top of the raw repository query. The repository
 * does not know who is calling — this use-case tightens the filter so a user
 * can only see rows they are entitled to.
 */
export class ListIndentsUseCase {
  constructor(private readonly indents: IndentRepository) {}

  public async execute(ctx: AuthContext, filter: ListIndentsFilter): Promise<IndentPage> {
    const isPrivileged = ctx.roles.some((r) =>
      ([
        Role.ADMIN,
        Role.AD, Role.DD, Role.DP_N, Role.DGDP, Role.SECY_DP,
        Role.SUPTD, Role.CPO, Role.COORD_STAFF, Role.BUDGET_STAFF,
        Role.CR_STAFF, Role.INSPECTORATE,
      ] as Role[]).includes(r),
    );

    // Rank-and-file users only see their own indents.
    const narrowed: ListIndentsFilter = isPrivileged
      ? filter
      : { ...filter, indenterId: ctx.userId };
    return this.indents.list(narrowed);
  }
}
