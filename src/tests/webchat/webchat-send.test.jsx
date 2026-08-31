import React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';

beforeAll(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })),
    });
  }
});

vi.mock('../../features/webchat/services/webchat-api.js', () => ({
  createWebChatSession: vi.fn(),
  sendWebChatMessage:   vi.fn(),
  pollWebChatMessages:  vi.fn(),
}));
vi.mock('../../features/webchat/services/webchat-storage.js', () => ({
  saveSession: vi.fn(), loadSession: vi.fn(() => null),
  clearSession: vi.fn(), saveCursor: vi.fn(), loadCursor: vi.fn(() => ({})),
  _resetMemoryForTests: vi.fn(),
}));

import {
  createWebChatSession, sendWebChatMessage, pollWebChatMessages,
} from '../../features/webchat/services/webchat-api.js';
import { WebChatComposer } from '../../features/webchat/components/WebChatComposer.jsx';
import { useWebChat }      from '../../features/webchat/hooks/useWebChat.js';

const CONFIG = {
  enabled: true, apiBaseUrl: 'https://api.test', clientAccountId: 'tenant-1',
  realtimeEnabled: false, pollIntervalMs: 60000, sessionStorageMode: 'memory',
  debug: false, maxMessageLength: 2000,
};
const SESSION = {
  session_id: 'sess-1', sender_ref: 'wc_abc',
  client_account_id: 'tenant-1',
  expires_at: new Date(Date.now() + 3600000).toISOString(),
};

beforeEach(() => {
  createWebChatSession.mockReset();
  sendWebChatMessage.mockReset();
  pollWebChatMessages.mockResolvedValue({ data: { messages: [], next_cursor: null } });
});

async function openedHook() {
  createWebChatSession.mockResolvedValue(SESSION);
  const hook = renderHook(() => useWebChat({ config: CONFIG }));
  await act(async () => { await hook.result.current.open(); });
  return hook;
}

describe('WebChat Send', () => {
  it('21. WebChatComposer renderiza textarea y botón Enviar', () => {
    render(<WebChatComposer onSend={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeTruthy();
    expect(screen.getByRole('button', { name: /enviar/i })).toBeTruthy();
  });

  it('22. Botón Enviar deshabilitado cuando textarea vacío', () => {
    render(<WebChatComposer onSend={vi.fn()} />);
    expect(screen.getByRole('button', { name: /enviar/i })).toBeDisabled();
  });

  it('23. Botón Enviar habilitado cuando hay texto', () => {
    render(<WebChatComposer onSend={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hola' } });
    expect(screen.getByRole('button', { name: /enviar/i })).not.toBeDisabled();
  });

  it('24. onSend es llamado con el texto al pulsar Enviar', () => {
    const onSend = vi.fn();
    render(<WebChatComposer onSend={onSend} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hola' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    expect(onSend).toHaveBeenCalledWith('Hola');
  });

  it('25. textarea se limpia tras enviar', () => {
    render(<WebChatComposer onSend={vi.fn()} />);
    const ta = screen.getByRole('textbox');
    fireEvent.change(ta, { target: { value: 'Hola' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    expect(ta.value).toBe('');
  });

  it('26. Enter sin Shift envía el mensaje', () => {
    const onSend = vi.fn();
    render(<WebChatComposer onSend={onSend} />);
    const ta = screen.getByRole('textbox');
    fireEvent.change(ta, { target: { value: 'test' } });
    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: false });
    expect(onSend).toHaveBeenCalledWith('test');
  });

  it('27. Shift+Enter no envía', () => {
    const onSend = vi.fn();
    render(<WebChatComposer onSend={onSend} />);
    const ta = screen.getByRole('textbox');
    fireEvent.change(ta, { target: { value: 'linea1' } });
    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('28. send() llama sendWebChatMessage con sessionId correcto', async () => {
    sendWebChatMessage.mockResolvedValue({ data: { message_id: 'm1' } });
    const { result } = await openedHook();
    await act(async () => { await result.current.send('Hola'); });
    expect(sendWebChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'sess-1', messageText: 'Hola' }),
      expect.any(AbortSignal),
    );
  });

  it('29. send() agrega mensaje optimista a messages', async () => {
    sendWebChatMessage.mockResolvedValue({ data: { message_id: 'm1' } });
    const { result } = await openedHook();
    act(() => { result.current.send('Optimista'); });
    expect(result.current.messages.some(m => m.message_text === 'Optimista')).toBe(true);
  });

  it('30. isSending es true durante el envío', async () => {
    let resolve;
    sendWebChatMessage.mockImplementation(() => new Promise(r => { resolve = r; }));
    const { result } = await openedHook();
    act(() => { result.current.send('test'); });
    await waitFor(() => expect(result.current.isSending).toBe(true));
    await act(async () => { resolve({ data: { message_id: 'm1' } }); });
  });

  it('31. send() no envía mensaje vacío', async () => {
    const { result } = await openedHook();
    await act(async () => { await result.current.send('   '); });
    expect(sendWebChatMessage).not.toHaveBeenCalled();
  });

  it('32. sendError se popula cuando sendWebChatMessage falla', async () => {
    sendWebChatMessage.mockRejectedValue(Object.assign(new Error('message_send_failed'), { status: 500 }));
    const { result } = await openedHook();
    await act(async () => { await result.current.send('test'); });
    expect(result.current.sendError).not.toBeNull();
  });

  it('33. mensaje optimista es eliminado si falla el envío', async () => {
    sendWebChatMessage.mockRejectedValue(Object.assign(new Error('message_send_failed'), { status: 500 }));
    const { result } = await openedHook();
    await act(async () => { await result.current.send('fallido'); });
    expect(result.current.messages.some(m => m.message_text === 'fallido')).toBe(false);
  });

  it('34. retryAfter se establece cuando 429 con retry_after_seconds', async () => {
    sendWebChatMessage.mockRejectedValue(
      Object.assign(new Error('message_send_failed'), {
        status: 429,
        data: { error: { detail: { retry_after_seconds: 5 } } },
      })
    );
    const { result } = await openedHook();
    await act(async () => { await result.current.send('flood'); });
    expect(result.current.retryAfter).toBeGreaterThan(0);
  });

  it('35. send() no envía mientras retryAfter > 0', async () => {
    sendWebChatMessage.mockRejectedValue(
      Object.assign(new Error('message_send_failed'), {
        status: 429, data: { error: { detail: { retry_after_seconds: 60 } } },
      })
    );
    const { result } = await openedHook();
    await act(async () => { await result.current.send('flood'); });
    sendWebChatMessage.mockClear();
    await act(async () => { await result.current.send('intento'); });
    expect(sendWebChatMessage).not.toHaveBeenCalled();
  });
});
