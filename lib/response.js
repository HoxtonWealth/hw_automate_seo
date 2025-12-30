import { AppError } from './errors.js';

/**
 * Send success response
 */
export function success(res, data, meta = {}) {
  return res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  });
}

/**
 * Send created response (201)
 */
export function created(res, data, meta = {}) {
  return res.status(201).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  });
}

/**
 * Send error response
 */
export function error(res, err) {
  // Handle our custom AppError instances
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
  }

  // Handle unexpected errors
  console.error('Unexpected error:', err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
}
