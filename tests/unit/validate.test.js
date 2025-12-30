import { validateRequired, validateType, validateEnum } from '../../lib/validate.js';
import { ValidationError } from '../../lib/errors.js';

describe('validateRequired', () => {
  test('passes when all required fields present', () => {
    const body = { keywords: ['test'], country: 'UK' };
    expect(() => validateRequired(body, ['keywords', 'country'])).not.toThrow();
  });

  test('throws ValidationError when field missing', () => {
    const body = { keywords: ['test'] };
    expect(() => validateRequired(body, ['keywords', 'country']))
      .toThrow(ValidationError);
  });

  test('lists all missing fields in error details', () => {
    const body = {};
    try {
      validateRequired(body, ['keywords', 'country']);
    } catch (error) {
      expect(error.details.missing).toContain('keywords');
      expect(error.details.missing).toContain('country');
    }
  });
});

describe('validateType', () => {
  test('passes for correct array type', () => {
    expect(() => validateType(['a', 'b'], 'keywords', 'array')).not.toThrow();
  });

  test('throws for wrong type', () => {
    expect(() => validateType('string', 'keywords', 'array'))
      .toThrow(ValidationError);
  });
});

describe('validateEnum', () => {
  test('passes for valid enum value', () => {
    expect(() => validateEnum('UK', 'country', ['UK', 'US', 'UAE'])).not.toThrow();
  });

  test('throws for invalid enum value', () => {
    expect(() => validateEnum('INVALID', 'country', ['UK', 'US', 'UAE']))
      .toThrow(ValidationError);
  });
});
