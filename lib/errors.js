/**
 * Base application error
 */
export class AppError extends Error {
  constructor(code, message, status = 400, details = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource) {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super('UNAUTHORIZED', 'Invalid or missing API key', 401);
  }
}

export class DuplicateError extends AppError {
  constructor(resource) {
    super('DUPLICATE_ERROR', `${resource} already exists`, 409);
  }
}

export class ExternalApiError extends AppError {
  constructor(service, originalError) {
    super('EXTERNAL_API_ERROR', `${service} API error: ${originalError}`, 502);
  }
}

export class DatabaseError extends AppError {
  constructor(operation, originalError) {
    super('DATABASE_ERROR', `Database ${operation} failed`, 500, {
      originalError: originalError.message
    });
  }
}

/**
 * Map Supabase errors to our error classes
 */
export function mapSupabaseError(error, operation) {
  // Duplicate key violation
  if (error.code === '23505') {
    return new DuplicateError('Record');
  }
  
  // Foreign key violation
  if (error.code === '23503') {
    return new ValidationError('Referenced record does not exist', {
      constraint: error.constraint
    });
  }
  
  // Not null violation
  if (error.code === '23502') {
    return new ValidationError(`Required field is null: ${error.column}`);
  }
  
  // Default
  return new DatabaseError(operation, error);
}
