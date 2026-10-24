/**
 * Explicit Result type for domain operations that can fail with a *domain*
 * reason (business-rule violations, invalid state transitions). Keeps us from
 * leaking exceptions through the hot path.
 *
 * Infrastructure errors (DB down, timeouts) still throw; those are
 * exceptional and should bubble to the HTTP layer's error boundary.
 */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
  },
  err<E>(error: E): Result<never, E> {
    return { ok: false, error };
  },
  isOk<T, E>(r: Result<T, E>): r is { ok: true; value: T } {
    return r.ok;
  },
  isErr<T, E>(r: Result<T, E>): r is { ok: false; error: E } {
    return !r.ok;
  },
};
