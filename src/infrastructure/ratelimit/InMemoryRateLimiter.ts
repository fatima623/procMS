import type { RateLimiter, RateLimitDecision } from '@/application/ports/RateLimiter';

/**
 * Sliding-window counter kept in-process. For prod with multiple nodes,
 * swap for a Redis adapter that runs an atomic Lua `ZADD` + `ZCOUNT`.
 *
 * Buckets are cleaned lazily — on every write we drop timestamps older than
 * the window. Memory bound is O(active-keys × limit).
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();

  public async tryConsume(key: string, opts: { limit: number; windowSeconds: number }): Promise<RateLimitDecision> {
    const now = Date.now();
    const windowMs = opts.windowSeconds * 1000;
    const cutoff = now - windowMs;

    const bucket = this.hits.get(key) ?? [];
    // Drop expired timestamps.
    let dropIdx = 0;
    while (dropIdx < bucket.length && bucket[dropIdx]! < cutoff) dropIdx += 1;
    const active = dropIdx > 0 ? bucket.slice(dropIdx) : bucket;

    const allowed = active.length < opts.limit;
    if (allowed) active.push(now);
    this.hits.set(key, active);

    const oldest = active[0];
    const retryAfterSeconds = allowed
      ? 0
      : Math.max(1, Math.ceil(((oldest ?? now) + windowMs - now) / 1000));

    return {
      allowed,
      limit: opts.limit,
      remaining: Math.max(0, opts.limit - active.length),
      retryAfterSeconds,
      windowSeconds: opts.windowSeconds,
    };
  }
}

export const rateLimiter: RateLimiter = new InMemoryRateLimiter();
