/**
 * Port for rate limiting. Default implementation is an in-memory sliding
 * window — fine for a single-process dev / small deployment. A Redis-backed
 * adapter (using an atomic Lua script) plugs in without touching callers.
 */
export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  /** Seconds until the next slot frees up — ≥ 0 even when allowed. */
  readonly retryAfterSeconds: number;
  /** Window size (seconds) used for the decision. */
  readonly windowSeconds: number;
}

export interface RateLimiter {
  /**
   * Record one hit against `key` and decide whether to allow it. Each caller
   * chooses the limit so the policy stays close to the handler. The limiter
   * does NOT delay or throw — callers that want a 429 response render it
   * themselves from the decision.
   */
  tryConsume(key: string, opts: { limit: number; windowSeconds: number }): Promise<RateLimitDecision>;
}
