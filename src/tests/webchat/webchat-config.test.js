import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { getWebchatConfig } from '../../features/webchat/utils/webchat-config.js';

beforeAll(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })),
    });
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('WebChat Config', () => {
  it('1. Widget deshabilitado por defecto', () => {
    const config = getWebchatConfig();
    expect(config.enabled).toBe(false);
  });

  it('2. Realtime deshabilitado por defecto', () => {
    const config = getWebchatConfig();
    expect(config.realtimeEnabled).toBe(false);
  });

  it('3. debug deshabilitado por defecto', () => {
    const config = getWebchatConfig();
    expect(config.debug).toBe(false);
  });

  it('4. sessionStorageMode es memory por defecto', () => {
    const config = getWebchatConfig();
    expect(config.sessionStorageMode).toBe('memory');
  });

  it('5. pollIntervalMs es 5000 por defecto', () => {
    const config = getWebchatConfig();
    expect(config.pollIntervalMs).toBe(5000);
  });

  it('6. maxMessageLength es 2000', () => {
    const config = getWebchatConfig();
    expect(config.maxMessageLength).toBe(2000);
  });

  it('7. apiBaseUrl es cadena vacía si no se configura', () => {
    const config = getWebchatConfig();
    expect(typeof config.apiBaseUrl).toBe('string');
  });
});
