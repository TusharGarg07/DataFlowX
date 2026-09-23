export interface RawApiErrorPayload {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  path?: string;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly fieldErrors?: Record<string, string>;
  public readonly raw?: unknown;

  constructor(status: number, message: string, code?: string, fieldErrors?: Record<string, string>, raw?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.raw = raw;
  }
}

export function parseFieldErrors(message: string): Record<string, string> | undefined {
  if (!message || !message.includes(':')) return undefined;
  const result: Record<string, string> = {};
  const parts = message.split(';');
  let hasValidField = false;

  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx > 0) {
      const key = part.slice(0, colonIdx).trim();
      const val = part.slice(colonIdx + 1).trim();
      if (key && val) {
        result[key] = val;
        hasValidField = true;
      }
    }
  }

  return hasValidField ? result : undefined;
}

export function normalizeApiError(status: number, bodyText: string): ApiError {
  let jsonBody: RawApiErrorPayload | null = null;
  try {
    jsonBody = JSON.parse(bodyText);
  } catch {
    jsonBody = null;
  }

  if (jsonBody && typeof jsonBody === 'object') {
    const message = jsonBody.message || jsonBody.error || `HTTP ${status} Error`;
    const code = jsonBody.error;
    const fieldErrors = message ? parseFieldErrors(message) : undefined;
    return new ApiError(status, message, code, fieldErrors, jsonBody);
  }

  let fallbackMessage = `HTTP ${status} Error`;
  if (status === 401) {
    fallbackMessage = 'Unauthorized';
  } else if (status === 403) {
    fallbackMessage = 'Access forbidden';
  } else if (status === 404) {
    fallbackMessage = 'Resource not found';
  } else if (status === 409) {
    fallbackMessage = 'Resource conflict';
  }

  return new ApiError(status, fallbackMessage, undefined, undefined, bodyText);
}