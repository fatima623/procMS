import type { Role } from '@prisma/client';

/**
 * The authenticated principal running a use-case. Built by the HTTP layer
 * (interfaces/http/middleware/authGuard) from the session. Use-cases accept
 * this as an explicit argument — never pulled from AsyncLocalStorage inside
 * the application layer, which would make tests implicit.
 */
export interface AuthContext {
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly sectionIds: readonly string[];
  readonly firmId?: string;
}

export const hasRole = (ctx: AuthContext, ...roles: Role[]): boolean =>
  roles.some((r) => ctx.roles.includes(r));
