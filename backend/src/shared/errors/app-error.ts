export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  readonly isOperational: boolean = true;
  readonly details?: any;
  readonly code?: string;

  constructor(message: string, details?: any, code?: string) {
    super(message);
    this.details = details;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  readonly statusCode = 400;
  constructor(message: string, details?: any, code?: string) {
    super(message, details, code);
  }
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  constructor(message: string, details?: any, code?: string) {
    super(message, details, code);
  }
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  constructor(message: string, details?: any, code?: string) {
    super(message, details, code);
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  constructor(message: string, details?: any, code?: string) {
    super(message, details, code);
  }
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  constructor(message: string, details?: any, code?: string) {
    super(message, details, code);
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 422;
  constructor(message: string, public readonly validationErrors?: any[]) {
    super(message, validationErrors, 'VALIDATION_ERROR');
  }
}

export class StateMachineError extends AppError {
  readonly statusCode = 400;
  constructor(message: string, public readonly transitionDetails?: any) {
    super(message, transitionDetails, 'STATE_MACHINE_ERROR');
  }
}

export class ConcurrencyConflictError extends AppError {
  readonly statusCode = 409;
  constructor(message: string = 'Resource was modified by another request. Please reload and retry.') {
    super(message, undefined, 'OCC_CONFLICT');
  }
}

export class RateLimitExceededError extends AppError {
  readonly statusCode = 429;
  constructor(message: string = 'Too many requests. Please try again later.') {
    super(message, undefined, 'RATE_LIMIT_EXCEEDED');
  }
}
