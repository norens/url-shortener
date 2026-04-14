export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(404, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(409, message);
  }
}

export class GoneError extends AppError {
  constructor(message = "Gone") {
    super(410, message);
  }
}

export class RateLimitError extends AppError {
  constructor(
    message = "Rate limit exceeded",
    public readonly retryAfter?: number,
  ) {
    super(429, message);
  }
}

export class LimitReachedError extends AppError {
  constructor(message = "Limit reached") {
    super(429, message);
  }
}

export class InternalError extends AppError {
  constructor(message = "Internal server error") {
    super(500, message);
  }
}
