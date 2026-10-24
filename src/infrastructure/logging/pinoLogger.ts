import pino from 'pino';
import type { Logger } from '@/application/ports/Logger';
import { env } from '@/config/env';

/**
 * Transport selection:
 *   - production → JSON to stdout (collector friendly).
 *   - development → JSON too. We previously used the `pino-pretty` transport,
 *     but Next.js's RSC bundler doesn't play well with the worker-thread
 *     stream it spins up (`MODULE_NOT_FOUND` in a background worker thread,
 *     uncaughtException). JSON output in dev is still readable and avoids
 *     the whole bundler/worker edge case. Pipe through `pino-pretty` from
 *     the terminal if you want colour: `npm run dev | npx pino-pretty`.
 */
const base = pino({
  level: env.LOG_LEVEL,
  base: { service: env.OTEL_SERVICE_NAME, env: env.NODE_ENV },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      '*.password',
    ],
    censor: '[REDACTED]',
  },
});

class PinoAdapter implements Logger {
  constructor(private readonly inner: pino.Logger) {}
  info(bindings: Record<string, unknown>, msg: string): void { this.inner.info(bindings, msg); }
  warn(bindings: Record<string, unknown>, msg: string): void { this.inner.warn(bindings, msg); }
  error(bindings: Record<string, unknown>, msg: string): void { this.inner.error(bindings, msg); }
  debug(bindings: Record<string, unknown>, msg: string): void { this.inner.debug(bindings, msg); }
  child(bindings: Record<string, unknown>): Logger { return new PinoAdapter(this.inner.child(bindings)); }
}

export const rootLogger: Logger = new PinoAdapter(base);
