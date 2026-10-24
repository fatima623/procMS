import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  BusinessRuleViolationError,
  ConcurrencyConflictError,
  DomainError,
  ForbiddenError,
  InvalidStateTransitionError,
  NotFoundError,
  ValidationError,
} from '@/domain/errors/DomainError';
import { rootLogger } from '@/infrastructure/logging/pinoLogger';
import { RateLimitedError } from './middleware/authGuard';

export interface ApiErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly fields?: Readonly<Record<string, string>>;
    readonly requestId?: string;
  };
}

/**
 * Translate any error thrown by a use-case / handler into a NextResponse.
 * Domain errors become 4xx; everything else is a 500 with a generic body
 * (so we never leak stack traces to clients).
 */
export function toHttpResponse(err: unknown, requestId?: string): NextResponse<ApiErrorBody> {
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload',
          fields: Object.fromEntries(err.issues.map((i) => [i.path.join('.'), i.message])),
          requestId,
        },
      },
      { status: 400 },
    );
  }
  if (err instanceof ValidationError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, fields: err.fields, requestId } },
      { status: 400 },
    );
  }
  if (err instanceof NotFoundError) {
    return NextResponse.json({ error: { code: err.code, message: err.message, requestId } }, { status: 404 });
  }
  if (err instanceof RateLimitedError) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: err.message, requestId } },
      {
        status: 429,
        headers: { 'Retry-After': String(err.retryAfterSeconds) },
      },
    );
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: { code: err.code, message: err.message, requestId } }, { status: 403 });
  }
  if (err instanceof ConcurrencyConflictError) {
    return NextResponse.json({ error: { code: err.code, message: err.message, requestId } }, { status: 409 });
  }
  if (err instanceof InvalidStateTransitionError || err instanceof BusinessRuleViolationError) {
    return NextResponse.json({ error: { code: err.code, message: err.message, requestId } }, { status: 409 });
  }
  if (err instanceof DomainError) {
    return NextResponse.json({ error: { code: err.code, message: err.message, requestId } }, { status: 400 });
  }

  // Infrastructure or unexpected error — log fully, respond generically.
  rootLogger.error({ err, requestId }, 'unhandled error in route handler');
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', requestId } },
    { status: 500 },
  );
}
