/**
 * Base class for all errors raised by the domain. The HTTP layer maps these
 * to specific status codes (see interfaces/http/errors.ts). Infrastructure
 * errors (DB down, network timeout) should not extend this class — those
 * stay as generic `Error`s and surface as 500.
 */
export abstract class DomainError extends Error {
  public abstract readonly code: string;
  public override readonly cause?: unknown;

  protected constructor(message: string, cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.cause = cause;
    // Preserve stack across async boundaries.
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends DomainError {
  public readonly code = 'VALIDATION_ERROR';
  public readonly fields: Readonly<Record<string, string>>;
  constructor(message: string, fields: Record<string, string> = {}) {
    super(message);
    this.fields = Object.freeze({ ...fields });
  }
}

export class NotFoundError extends DomainError {
  public readonly code = 'NOT_FOUND';
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`);
  }
}

export class ForbiddenError extends DomainError {
  public readonly code = 'FORBIDDEN';
  constructor(message = 'Not permitted') {
    super(message);
  }
}

export class ConcurrencyConflictError extends DomainError {
  public readonly code = 'CONCURRENCY_CONFLICT';
  constructor(resource: string, id: string) {
    super(`${resource} ${id} was modified by another request; retry`);
  }
}

export class InvalidStateTransitionError extends DomainError {
  public readonly code = 'INVALID_STATE_TRANSITION';
  constructor(from: string, event: string) {
    super(`Illegal transition: event "${event}" is not valid in state "${from}"`);
  }
}

export class BusinessRuleViolationError extends DomainError {
  public readonly code = 'BUSINESS_RULE_VIOLATION';
  constructor(message: string) {
    super(message);
  }
}
