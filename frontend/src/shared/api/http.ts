import { env } from '../lib/env';
import { ApiError, normalizeApiError } from './ApiError';

type TokenGetter = () => string | null;
type UnauthorizedHandler = () => void;

let tokenGetterFn: TokenGetter | null = null;
let unauthorizedHandlerFn: UnauthorizedHandler | null = null;

export function setTokenGetter(getter: TokenGetter): void {
  tokenGetterFn = getter;
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandlerFn = handler;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

export async function http<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, params, headers: customHeaders, ...customInit } = options;

  let url = endpoint.startsWith('http') ? endpoint : `${env.API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const headers = new Headers(customHeaders);
  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (tokenGetterFn) {
    const token = tokenGetterFn();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const init: RequestInit = {
    ...customInit,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    throw new ApiError(0, err instanceof Error ? err.message : 'Network failure', 'NETWORK_ERROR');
  }

  if (!response.ok) {
    if (response.status === 401 && unauthorizedHandlerFn) {
      unauthorizedHandlerFn();
    }
    const errorText = await response.text().catch(() => '');
    throw normalizeApiError(response.status, errorText);
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as unknown as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as unknown as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

http.get = <T>(endpoint: string, options?: RequestOptions) => http<T>(endpoint, { ...options, method: 'GET' });
http.post = <T>(endpoint: string, body?: unknown, options?: RequestOptions) => http<T>(endpoint, { ...options, method: 'POST', body });
http.put = <T>(endpoint: string, body?: unknown, options?: RequestOptions) => http<T>(endpoint, { ...options, method: 'PUT', body });
http.delete = <T>(endpoint: string, options?: RequestOptions) => http<T>(endpoint, { ...options, method: 'DELETE' });