import { ValidationError } from './errors.js';

/**
 * Validate that required fields are present in body
 */
export function validateRequired(body, fields) {
  const missing = fields.filter(field => body[field] === undefined || body[field] === null);
  
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required field(s): ${missing.join(', ')}`,
      { missing }
    );
  }
}

/**
 * Validate that a value is of expected type
 */
export function validateType(value, name, expectedType) {
  const actualType = Array.isArray(value) ? 'array' : typeof value;
  
  if (actualType !== expectedType) {
    throw new ValidationError(
      `Invalid type for ${name}`,
      { field: name, expected: expectedType, received: actualType }
    );
  }
}

/**
 * Validate that a value is one of allowed values
 */
export function validateEnum(value, name, allowedValues) {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `Invalid value for ${name}`,
      { field: name, allowed: allowedValues, received: value }
    );
  }
}

/**
 * Validate HTTP method
 */
export function validateMethod(req, allowed) {
  const methods = Array.isArray(allowed) ? allowed : [allowed];
  
  if (!methods.includes(req.method)) {
    throw new ValidationError(
      `Method ${req.method} not allowed`,
      { allowed: methods, received: req.method }
    );
  }
}
