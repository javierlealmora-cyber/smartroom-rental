import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../features/webchat/services/webchat-api.js', () => ({
  pollWebChatMessages: vi.fn(),
}));

import { useWebChatPolling } from '../../features/webchat/hooks/useWebChatPolling.js';
import { pollWebChatMessages } from '../../features/webchat/services/webchat-api.js';

const MOCK_SESSION = {
  session_id:  'sess-1',
  sender_ref:  'wc_abc',
  client_account_id: 'tenant-1',
};

const MOCK_CONFIG = {
  apiBaseUrl:      'https://api.test',
  clientAccountId: 'tenant-1',
  pollIntervalMs:  60000,
};

beforeEach(() => {
  pollWebChatMessages.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WebChat Polling', () => {
  it('36. poll se ejecuta al montar cuando enabled=true y hay sesión', async () => {
    pollWebChatMessages.mockResolvedValue({ data: { messages: [], next_cursor: null } });
    renderHook(() => useWebChatPolling({
      session: MOCK_SESSION, config: MOCK_CONFIG, cursor: {},
      onMessages: vi.fn(), onError: vi.fn(), enabled: true,
    }));
    await act(async () => { await Promise.resolve(); });
    expect(pollWebChatMessages).toHaveBeenCalledTimes(1);
  });

  it('37. poll no se ejecuta cuando enabled=false', async () => {
    pollWebChatMessages.mockResolvedValue({ data: { messages: [] } });
    renderHook(() => useWebChatPolling({
      session: MOCK_SESSION, config: MOCK_CONFIG, cursor: {},
      onMessages: vi.fn(), enabled: false,
    }));
    await act(async () => { await Promise.resolve(); });
    expect(pollWebChatMessages).toHaveBeenCalledTimes(0);
  });

  it('38. poll no se ejecuta sin session', async () => {
    renderHook(() => useWebChatPolling({
      session: null, config: MOCK_CONFIG, cursor: {},
      onMessages: vi.fn(), enabled: true,
    }));
    await act(async () => { await Promise.resolve(); });
    expect(pollWebChatMessages).toHaveBeenCalledTimes(0);
  });

  it('39. onMessages es llamado cuando hay mensajes', async () => {
    const onMessages = vi.fn();
    pollWebChatMessages.mockResolvedValue({ data: { messages: [{ message_id: 'm1', created_at: '2024-01-01T00:00:00Z' }], next_cursor: null } });
    renderHook(() => useWebChatPolling({
      session: MOCK_SESSION, config: MOCK_CONFIG, cursor: {},
      onMessages, enabled: true,
    }));
    await act(async () => { await Promise.resolve(); });
    expect(onMessages).toHaveBeenCalledWith(
      [{ message_id: 'm1', created_at: '2024-01-01T00:00:00Z' }],
      null,
    );
  });

  it('40. onError es llamado cuando pollWebChatMessages rechaza', async () => {
    const onError = vi.fn();
    pollWebChatMessages.mockRejectedValue(Object.assign(new Error('poll_failed'), { status: 500 }));
    renderHook(() => useWebChatPolling({
      session: MOCK_SESSION, config: MOCK_CONFIG, cursor: {},
      onMessages: vi.fn(), onError, enabled: true,
    }));
    await act(async () => { await Promise.resolve(); });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('41. poll usa el token de sesión si está presente', async () => {
    pollWebChatMessages.mockResolvedValue({ data: { messages: [] } });
    const session = { ...MOCK_SESSION, webchat_session_token: 'tok.sign' };
    renderHook(() => useWebChatPolling({
      session, config: MOCK_CONFIG, cursor: {}, onMessages: vi.fn(), enabled: true,
    }));
    await act(async () => { await Promise.resolve(); });
    expect(pollWebChatMessages).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'tok.sign' }),
      expect.any(AbortSignal),
    );
  });

  it('42. poll usa cursor del estado', async () => {
    pollWebChatMessages.mockResolvedValue({ data: { messages: [] } });
    renderHook(() => useWebChatPolling({
      session: MOCK_SESSION, config: MOCK_CONFIG,
      cursor: { after_id: 'msg-42' },
      onMessages: vi.fn(), enabled: true,
    }));
    await act(async () => { await Promise.resolve(); });
    expect(pollWebChatMessages).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { after_id: 'msg-42' } }),
      expect.any(AbortSignal),
    );
  });

  it('43. AbortError no propaga a onError', async () => {
    const onError = vi.fn();
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
    pollWebChatMessages.mockRejectedValue(abortErr);
    renderHook(() => useWebChatPolling({
      session: MOCK_SESSION, config: MOCK_CONFIG, cursor: {},
      onMessages: vi.fn(), onError, enabled: true,
    }));
    await act(async () => { await Promise.resolve(); });
    expect(onError).not.toHaveBeenCalled();
  });

  it('44. poll no llama dos veces si está ocupado (busy guard)', async () => {
    let resolveFirst;
    pollWebChatMessages.mockImplementation(() => new Promise(r => { resolveFirst = r; }));
    const { result } = renderHook(() => useWebChatPolling({
      session: MOCK_SESSION, config: MOCK_CONFIG, cursor: {},
      onMessages: vi.fn(), enabled: true,
    }));
    await act(async () => {
      result.current.poll();
      await Promise.resolve();
    });
    expect(pollWebChatMessages).toHaveBeenCalledTimes(1);
    resolveFirst({ data: { messages: [] } });
  });

  it('45. poll incluye clientAccountId y sessionId', async () => {
    pollWebChatMessages.mockResolvedValue({ data: { messages: [] } });
    renderHook(() => useWebChatPolling({
      session: MOCK_SESSION, config: MOCK_CONFIG, cursor: {}, onMessages: vi.fn(), enabled: true,
    }));
    await act(async () => { await Promise.resolve(); });
    expect(pollWebChatMessages).toHaveBeenCalledWith(
      expect.objectContaining({ clientAccountId: 'tenant-1', sessionId: 'sess-1' }),
      expect.any(AbortSignal),
    );
  });

  it('46. el hook retorna la función poll invocable', () => {
    pollWebChatMessages.mockResolvedValue({ data: { messages: [] } });
    const { result } = renderHook(() => useWebChatPolling({
      session: MOCK_SESSION, config: MOCK_CONFIG, cursor: {},
      onMessages: vi.fn(), enabled: true,
    }));
    expect(typeof result.current.poll).toBe('function');
  });
});
