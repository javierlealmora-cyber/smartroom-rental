import React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks de infraestructura ──────────────────────────────────────────────────

beforeAll(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })),
    });
  }
});

vi.mock('../../providers/AuthProvider', () => ({
  useAuth: vi.fn(() => ({ user: { email: 'test@test.com' } })),
}));
vi.mock('../../providers/TenantProvider', () => ({
  useTenant: vi.fn(() => ({ branding: {} })),
}));
vi.mock('../../features/webchat/utils/webchat-config.js', () => ({
  getWebchatConfig: vi.fn(() => ({
    enabled:         false,
    apiBaseUrl:      'https://api.test',
    clientAccountId: 'tenant-1',
    realtimeEnabled: false,
    pollIntervalMs:  60000,
    sessionStorageMode: 'memory',
    debug: false,
    maxMessageLength: 2000,
  })),
}));
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

import { getWebchatConfig } from '../../features/webchat/utils/webchat-config.js';
import {
  createWebChatSession, pollWebChatMessages,
} from '../../features/webchat/services/webchat-api.js';
import V2Layout from '../../layouts/V2Layout.jsx';
import { WebChatMessageBubble } from '../../features/webchat/components/WebChatMessageBubble.jsx';

const SESSION = {
  session_id:        'sess-int-1',
  sender_ref:        'wc_integration',
  client_account_id: 'tenant-1',
  expires_at:        new Date(Date.now() + 3600000).toISOString(),
};

function renderLayout(children = <div data-testid="content">Content</div>) {
  return render(
    <MemoryRouter initialEntries={['/v2/admin']}>
      <V2Layout role="admin">{children}</V2Layout>
    </MemoryRouter>
  );
}

beforeEach(() => {
  getWebchatConfig.mockReturnValue({
    enabled:         false,
    apiBaseUrl:      'https://api.test',
    clientAccountId: 'tenant-1',
    realtimeEnabled: false,
    pollIntervalMs:  60000,
    sessionStorageMode: 'memory',
    debug: false,
    maxMessageLength: 2000,
  });
  createWebChatSession.mockReset();
  pollWebChatMessages.mockResolvedValue({ data: { messages: [], next_cursor: null } });
});

describe('WebChat App Integration', () => {
  it('INT-01. flag false → launcher NO aparece en V2Layout', () => {
    renderLayout();
    expect(screen.queryByLabelText('Abrir chat')).toBeNull();
  });

  it('INT-02. flag true → launcher aparece en V2Layout', () => {
    getWebchatConfig.mockReturnValue({
      enabled: true, apiBaseUrl: 'https://api.test', clientAccountId: 'tenant-1',
      realtimeEnabled: false, pollIntervalMs: 60000, sessionStorageMode: 'memory',
      debug: false, maxMessageLength: 2000,
    });
    renderLayout();
    expect(screen.getByLabelText('Abrir chat')).toBeTruthy();
  });

  it('INT-03. abrir launcher monta el panel (role=dialog)', async () => {
    createWebChatSession.mockResolvedValue(SESSION);
    getWebchatConfig.mockReturnValue({
      enabled: true, apiBaseUrl: 'https://api.test', clientAccountId: 'tenant-1',
      realtimeEnabled: false, pollIntervalMs: 60000, sessionStorageMode: 'memory',
      debug: false, maxMessageLength: 2000,
    });
    renderLayout();
    await act(async () => { fireEvent.click(screen.getByLabelText('Abrir chat')); });
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('INT-04. cerrar panel lo oculta', async () => {
    createWebChatSession.mockResolvedValue(SESSION);
    getWebchatConfig.mockReturnValue({
      enabled: true, apiBaseUrl: 'https://api.test', clientAccountId: 'tenant-1',
      realtimeEnabled: false, pollIntervalMs: 60000, sessionStorageMode: 'memory',
      debug: false, maxMessageLength: 2000,
    });
    renderLayout();
    await act(async () => { fireEvent.click(screen.getByLabelText('Abrir chat')); });
    expect(screen.getByRole('dialog')).toBeTruthy();
    await act(async () => {
      const launcher = document.getElementById('webchat-launcher');
      fireEvent.click(launcher);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('INT-05. solo existe una instancia del widget (un launcher)', () => {
    getWebchatConfig.mockReturnValue({
      enabled: true, apiBaseUrl: 'https://api.test', clientAccountId: 'tenant-1',
      realtimeEnabled: false, pollIntervalMs: 60000, sessionStorageMode: 'memory',
      debug: false, maxMessageLength: 2000,
    });
    renderLayout();
    const launchers = screen.queryAllByLabelText('Abrir chat');
    expect(launchers.length).toBe(1);
  });

  it('INT-06. el contenido del layout sigue renderizando', () => {
    renderLayout(<div data-testid="page-content">Página principal</div>);
    expect(screen.getByTestId('page-content')).toBeTruthy();
  });

  it('INT-07. flag false no añade root React adicional', () => {
    renderLayout();
    const roots = document.querySelectorAll('[id^="root"]');
    expect(roots.length).toBeLessThanOrEqual(1);
  });
});

describe('WebChat Token Security (runtime)', () => {
  it('SEC-RT-01. token no está en localStorage (modo memory)', async () => {
    createWebChatSession.mockResolvedValue({ ...SESSION, webchat_session_token: 'tok.sign' });
    getWebchatConfig.mockReturnValue({
      enabled: true, apiBaseUrl: 'https://api.test', clientAccountId: 'tenant-1',
      realtimeEnabled: false, pollIntervalMs: 60000, sessionStorageMode: 'memory',
      debug: false, maxMessageLength: 2000,
    });
    renderLayout();
    await act(async () => { fireEvent.click(screen.getByLabelText('Abrir chat')); });
    const stored = Object.values(localStorage).join('');
    expect(stored).not.toContain('tok.sign');
  });

  it('SEC-RT-02. token no aparece en el DOM renderizado', async () => {
    const TOKEN = 'tok.secret.value';
    createWebChatSession.mockResolvedValue({ ...SESSION, webchat_session_token: TOKEN });
    getWebchatConfig.mockReturnValue({
      enabled: true, apiBaseUrl: 'https://api.test', clientAccountId: 'tenant-1',
      realtimeEnabled: false, pollIntervalMs: 60000, sessionStorageMode: 'memory',
      debug: false, maxMessageLength: 2000,
    });
    renderLayout();
    await act(async () => { fireEvent.click(screen.getByLabelText('Abrir chat')); });
    expect(document.body.textContent).not.toContain(TOKEN);
  });

  it('SEC-RT-03. HTML recibido se muestra como texto, no se ejecuta como markup', () => {
    const msg = {
      message_id:   'x1',
      direction:    'outbound',
      sender_type:  'bot',
      message_text: '<script>alert(1)</script>',
      created_at:   '2024-01-01T00:00:00Z',
    };
    render(<WebChatMessageBubble message={msg} />);
    expect(screen.queryByText('<script>alert(1)</script>')).toBeTruthy();
    expect(document.querySelector('script[src]')).toBeNull();
  });
});
