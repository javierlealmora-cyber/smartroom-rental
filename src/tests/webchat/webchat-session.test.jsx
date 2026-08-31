import React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

beforeAll(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })),
    });
  }
});

vi.mock('../../features/webchat/services/webchat-api.js', () => ({
  createWebChatSession:  vi.fn(),
  sendWebChatMessage:    vi.fn(),
  pollWebChatMessages:   vi.fn(),
}));
vi.mock('../../features/webchat/services/webchat-storage.js', () => ({
  saveSession:           vi.fn(),
  loadSession:           vi.fn(() => null),
  clearSession:          vi.fn(),
  saveCursor:            vi.fn(),
  loadCursor:            vi.fn(() => ({})),
  _resetMemoryForTests:  vi.fn(),
}));

import { createWebChatSession, pollWebChatMessages } from '../../features/webchat/services/webchat-api.js';
import { WebChatLauncher } from '../../features/webchat/components/WebChatLauncher.jsx';
import { WebChatPanel }    from '../../features/webchat/components/WebChatPanel.jsx';
import { useWebChat }      from '../../features/webchat/hooks/useWebChat.js';
import { renderHook, act } from '@testing-library/react';

const CONFIG = {
  enabled:         true,
  apiBaseUrl:      'https://api.test',
  clientAccountId: 'tenant-1',
  widgetPublicKey: '',
  realtimeEnabled: false,
  pollIntervalMs:  60000,
  sessionStorageMode: 'memory',
  debug:           false,
  maxMessageLength: 2000,
};

const SESSION_DATA = {
  session_id:        'sess-1',
  sender_ref:        'wc_abc',
  client_account_id: 'tenant-1',
  expires_at:        new Date(Date.now() + 3600000).toISOString(),
  status:            'ready',
};

beforeEach(() => {
  createWebChatSession.mockReset();
  pollWebChatMessages.mockResolvedValue({ data: { messages: [], next_cursor: null } });
});

function Wrapper({ children }) { return children; }

describe('WebChat Session', () => {
  it('8. WebChatLauncher renderiza con aria-expanded=false por defecto', () => {
    render(<WebChatLauncher isOpen={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it('9. WebChatLauncher tiene aria-label "Abrir chat" cuando cerrado', () => {
    render(<WebChatLauncher isOpen={false} onToggle={vi.fn()} />);
    expect(screen.getByLabelText('Abrir chat')).toBeTruthy();
  });

  it('10. WebChatLauncher tiene aria-label "Cerrar chat" cuando abierto', () => {
    render(<WebChatLauncher isOpen={true} onToggle={vi.fn()} />);
    expect(screen.getByLabelText('Cerrar chat')).toBeTruthy();
  });

  it('11. WebChatLauncher llama onToggle al click', () => {
    const onToggle = vi.fn();
    render(<WebChatLauncher isOpen={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('12. WebChatPanel no renderiza cuando isOpen=false', () => {
    render(<WebChatPanel isOpen={false} onClose={vi.fn()} messages={[]} sessionLoading={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('13. WebChatPanel renderiza con role=dialog cuando isOpen=true', () => {
    render(<WebChatPanel isOpen={true} onClose={vi.fn()} messages={[]} sessionLoading={false} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('14. open() crea sesión si no existe', async () => {
    createWebChatSession.mockResolvedValue(SESSION_DATA);
    const { result } = renderHook(() => useWebChat({ config: CONFIG }));
    await act(async () => { await result.current.open(); });
    expect(createWebChatSession).toHaveBeenCalledTimes(1);
    expect(result.current.session?.session_id).toBe('sess-1');
  });

  it('15. open() no crea sesión si ya existe', async () => {
    createWebChatSession.mockResolvedValue(SESSION_DATA);
    const { result } = renderHook(() => useWebChat({ config: CONFIG }));
    await act(async () => { await result.current.open(); });
    createWebChatSession.mockClear();
    await act(async () => { await result.current.open(); });
    expect(createWebChatSession).toHaveBeenCalledTimes(0);
  });

  it('16. sessionLoading es true durante createSession y false al terminar', async () => {
    let resolve;
    createWebChatSession.mockImplementation(() => new Promise(r => { resolve = r; }));
    const { result } = renderHook(() => useWebChat({ config: CONFIG }));
    act(() => { result.current.open(); });
    await waitFor(() => expect(result.current.sessionLoading).toBe(true));
    await act(async () => { resolve(SESSION_DATA); });
    await waitFor(() => expect(result.current.sessionLoading).toBe(false));
  });

  it('17. sessionError se popula cuando createSession falla', async () => {
    createWebChatSession.mockRejectedValue(Object.assign(new Error('session_create_failed'), { status: 503 }));
    const { result } = renderHook(() => useWebChat({ config: CONFIG }));
    await act(async () => { await result.current.open(); });
    expect(result.current.sessionError).not.toBeNull();
    expect(result.current.sessionError.code).toBe('server_error');
  });

  it('18. isOpen=true después de open()', async () => {
    createWebChatSession.mockResolvedValue(SESSION_DATA);
    const { result } = renderHook(() => useWebChat({ config: CONFIG }));
    await act(async () => { await result.current.open(); });
    expect(result.current.isOpen).toBe(true);
  });

  it('19. isOpen=false después de close()', async () => {
    createWebChatSession.mockResolvedValue(SESSION_DATA);
    const { result } = renderHook(() => useWebChat({ config: CONFIG }));
    await act(async () => { await result.current.open(); });
    act(() => { result.current.close(); });
    expect(result.current.isOpen).toBe(false);
  });

  it('20. WebChatPanel muestra spinner/loading cuando sessionLoading=true', () => {
    render(<WebChatPanel isOpen={true} onClose={vi.fn()} messages={[]} sessionLoading={true} />);
    expect(screen.getByRole('status')).toBeTruthy();
  });
});
