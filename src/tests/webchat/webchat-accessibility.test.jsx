import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

beforeAll(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })),
    });
  }
});

import { WebChatLauncher }  from '../../features/webchat/components/WebChatLauncher.jsx';
import { WebChatPanel }     from '../../features/webchat/components/WebChatPanel.jsx';
import { WebChatComposer }  from '../../features/webchat/components/WebChatComposer.jsx';
import { WebChatMessageList } from '../../features/webchat/components/WebChatMessageList.jsx';
import { WebChatStatus }    from '../../features/webchat/components/WebChatStatus.jsx';

describe('WebChat Accessibility', () => {
  it('71. WebChatLauncher tiene tipo button', () => {
    render(<WebChatLauncher isOpen={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('72. WebChatLauncher aria-expanded cambia de false a true', () => {
    const { rerender } = render(<WebChatLauncher isOpen={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    rerender(<WebChatLauncher isOpen={true} onToggle={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('73. WebChatLauncher aria-controls apunta a webchat-panel', () => {
    render(<WebChatLauncher isOpen={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-controls', 'webchat-panel');
  });

  it('74. WebChatPanel tiene role=dialog', () => {
    render(<WebChatPanel isOpen={true} onClose={vi.fn()} messages={[]} sessionLoading={false} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('75. WebChatPanel tiene aria-modal=true', () => {
    render(<WebChatPanel isOpen={true} onClose={vi.fn()} messages={[]} sessionLoading={false} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('76. WebChatPanel tiene aria-label', () => {
    render(<WebChatPanel isOpen={true} onClose={vi.fn()} messages={[]} sessionLoading={false} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label');
  });

  it('77. WebChatPanel cierra al pulsar Escape', () => {
    const onClose = vi.fn();
    render(<WebChatPanel isOpen={true} onClose={onClose} messages={[]} sessionLoading={false} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('78. WebChatMessageList tiene role=log y aria-live=polite', () => {
    render(<WebChatMessageList messages={[]} />);
    const log = screen.getByRole('log');
    expect(log).toHaveAttribute('aria-live', 'polite');
  });

  it('79. WebChatComposer textarea tiene aria-label', () => {
    render(<WebChatComposer onSend={vi.fn()} />);
    expect(screen.getByLabelText(/escribe un mensaje/i)).toBeTruthy();
  });

  it('80. WebChatComposer botón Enviar tiene aria-label', () => {
    render(<WebChatComposer onSend={vi.fn()} />);
    expect(screen.getByLabelText(/enviar mensaje/i)).toBeTruthy();
  });

  it('81. WebChatStatus muestra role=alert cuando hay error', () => {
    render(<WebChatStatus error={{ message: 'Error de prueba' }} sessionLoading={false} />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
