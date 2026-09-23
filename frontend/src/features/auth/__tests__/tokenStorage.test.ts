import { describe, it, expect, beforeEach } from 'vitest';
import { tokenStorage } from '../tokenStorage';

describe('tokenStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns null when no token exists in sessionStorage', () => {
    expect(tokenStorage.getToken()).toBeNull();
  });

  it('stores and retrieves token from sessionStorage', () => {
    tokenStorage.setToken('test-jwt-token');
    expect(tokenStorage.getToken()).toBe('test-jwt-token');
    expect(sessionStorage.getItem('dataflowx_token')).toBe('test-jwt-token');
  });

  it('clears stored token from sessionStorage', () => {
    tokenStorage.setToken('test-jwt-token');
    tokenStorage.clearToken();
    expect(tokenStorage.getToken()).toBeNull();
    expect(sessionStorage.getItem('dataflowx_token')).toBeNull();
  });
});
