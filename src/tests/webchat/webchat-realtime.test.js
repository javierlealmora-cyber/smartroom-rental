import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebChatRealtime } from '../../features/webchat/hooks/useWebChatRealtime.js';

function makeAdapter() {
  const unsub = vi.fn();
  const subscribe = vi.fn((sessionId, onMsg) => {
    subscribe._lastOnMsg = onMsg;
    return unsub;
  });
  subscribe._unsub = unsub;
  return { subscribe, _unsub: unsub };
}

const SESSION = { session_id: 'sess-rt-1' };

describe('WebChat Realtime', () => {
  it('47. subscribe se llama cuando realtimeEnabled y hay sesión', () => {
    const adapter = makeAdapter();
    renderHook(() => useWebChatRealtime({
      session: SESSION,
      config: { realtimeEnabled: true },
      onNotification: vi.fn(),
      adapter,
    }));
    expect(adapter.subscribe).toHaveBeenCalledWith(
      'sess-rt-1', expect.any(Function), expect.any(Function),
    );
  });

  it('48. subscribe NO se llama cuando realtimeEnabled=false', () => {
    const adapter = makeAdapter();
    renderHook(() => useWebChatRealtime({
      session: SESSION,
      config: { realtimeEnabled: false },
      onNotification: vi.fn(),
      adapter,
    }));
    expect(adapter.subscribe).not.toHaveBeenCalled();
  });

  it('49. subscribe NO se llama sin sesión', () => {
    const adapter = makeAdapter();
    renderHook(() => useWebChatRealtime({
      session: null,
      config: { realtimeEnabled: true },
      onNotification: vi.fn(),
      adapter,
    }));
    expect(adapter.subscribe).not.toHaveBeenCalled();
  });

  it('50. subscribe NO se llama sin adapter', () => {
    renderHook(() => useWebChatRealtime({
      session: SESSION,
      config: { realtimeEnabled: true },
      onNotification: vi.fn(),
      adapter: null,
    }));
    // Sin error ni llamada
  });

  it('51. onNotification es llamado cuando llega un evento', async () => {
    const adapter = makeAdapter();
    const onNotification = vi.fn();
    renderHook(() => useWebChatRealtime({
      session: SESSION,
      config: { realtimeEnabled: true },
      onNotification,
      adapter,
    }));
    await act(async () => {
      adapter.subscribe._lastOnMsg?.({ session_id: 'sess-rt-1', message_id: 'm1' });
    });
    expect(onNotification).toHaveBeenCalledTimes(1);
  });

  it('52. onNotification no se llama si session_id no coincide', async () => {
    const adapter = makeAdapter();
    const onNotification = vi.fn();
    renderHook(() => useWebChatRealtime({
      session: SESSION,
      config: { realtimeEnabled: true },
      onNotification,
      adapter,
    }));
    await act(async () => {
      adapter.subscribe._lastOnMsg?.({ session_id: 'OTRA_SESION', message_id: 'm1' });
    });
    expect(onNotification).not.toHaveBeenCalled();
  });

  it('53. unsubscribe es llamado al desmontar', () => {
    const adapter = makeAdapter();
    const { unmount } = renderHook(() => useWebChatRealtime({
      session: SESSION,
      config: { realtimeEnabled: true },
      onNotification: vi.fn(),
      adapter,
    }));
    unmount();
    expect(adapter._unsub).toHaveBeenCalledTimes(1);
  });
});
