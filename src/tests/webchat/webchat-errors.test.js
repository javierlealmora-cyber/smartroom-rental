import { describe, it, expect } from 'vitest';
import { toSafeError, SAFE_MESSAGES } from '../../features/webchat/utils/webchat-errors.js';

describe('WebChat Errors', () => {
  it('60. toSafeError 401 → session_expired con mensaje seguro', () => {
    const safe = toSafeError({ status: 401 });
    expect(safe.code).toBe('session_expired');
    expect(safe.message).toBe(SAFE_MESSAGES.session_expired);
  });

  it('61. toSafeError 403 → session_forbidden', () => {
    const safe = toSafeError({ status: 403 });
    expect(safe.code).toBe('session_forbidden');
  });

  it('62. toSafeError 429 → rate_limited con retryAfter', () => {
    const safe = toSafeError({
      status: 429,
      data: { error: { detail: { retry_after_seconds: 30 } } },
    });
    expect(safe.code).toBe('rate_limited');
    expect(safe.retryAfter).toBe(30);
  });

  it('63. toSafeError 429 sin retry_after_seconds usa 60 por defecto', () => {
    const safe = toSafeError({ status: 429, data: {} });
    expect(safe.retryAfter).toBe(60);
  });

  it('64. toSafeError 500 → server_error', () => {
    const safe = toSafeError({ status: 500 });
    expect(safe.code).toBe('server_error');
  });

  it('65. toSafeError 503 → server_error (cualquier 5xx)', () => {
    const safe = toSafeError({ status: 503 });
    expect(safe.code).toBe('server_error');
  });

  it('66. toSafeError sin status → mensaje default', () => {
    const safe = toSafeError({});
    expect(safe.message).toBe(SAFE_MESSAGES.default);
  });

  it('67. toSafeError null → mensaje default', () => {
    const safe = toSafeError(null);
    expect(safe.message).toBe(SAFE_MESSAGES.default);
  });

  it('68. SAFE_MESSAGES no contiene stack trace ni campo técnico', () => {
    for (const msg of Object.values(SAFE_MESSAGES)) {
      expect(msg).not.toMatch(/Error:|stack|undefined|null/i);
    }
  });

  it('69. toSafeError message conocido usa su mensaje', () => {
    const safe = toSafeError({ message: 'session_create_failed', status: 0 });
    expect(safe.message).toBe(SAFE_MESSAGES.session_create_failed);
  });

  it('70. toSafeError message desconocido → default', () => {
    const safe = toSafeError({ message: 'unexpected_xyz', status: 0 });
    expect(safe.message).toBe(SAFE_MESSAGES.default);
  });
});
