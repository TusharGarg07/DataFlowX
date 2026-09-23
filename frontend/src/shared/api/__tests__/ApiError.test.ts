import { describe, it, expect } from 'vitest';
import { ApiError, normalizeApiError, parseFieldErrors } from '../ApiError';

describe('ApiError & Normalizer', () => {
  it('parses flattened field errors correctly', () => {
    const message = 'password: size must be between 8 and 72; username: must not be blank';
    const parsed = parseFieldErrors(message);
    expect(parsed).toEqual({
      password: 'size must be between 8 and 72',
      username: 'must not be blank',
    });
  });

  it('normalizes structured ApiError response', () => {
    const raw = JSON.stringify({
      timestamp: '2026-09-22T12:00:00Z',
      status: 400,
      error: 'VALIDATION_FAILED',
      message: 'password: size must be between 8 and 72',
      path: '/api/v1/auth/register',
    });

    const error = normalizeApiError(400, raw);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.message).toBe('password: size must be between 8 and 72');
    expect(error.fieldErrors).toEqual({
      password: 'size must be between 8 and 72',
    });
  });

  it('normalizes unstructured / fallback HTTP errors', () => {
    const error401 = normalizeApiError(401, 'Unauthorized string body');
    expect(error401.status).toBe(401);
    expect(error401.message).toBe('Unauthorized');

    const error403 = normalizeApiError(403, '');
    expect(error403.status).toBe(403);
    expect(error403.message).toBe('Access forbidden');
  });
});