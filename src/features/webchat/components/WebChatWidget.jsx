import React from 'react';
import { useWebChat }        from '../hooks/useWebChat.js';
import { WebChatLauncher }   from './WebChatLauncher.jsx';
import { WebChatPanel }      from './WebChatPanel.jsx';
import { WebChatErrorBoundary } from './WebChatErrorBoundary.jsx';

export function WebChatWidget({ config, realtimeAdapter }) {
  const {
    isOpen, open, close,
    messages, sessionLoading, sessionError,
    send, sendError, isSending, retryAfter,
  } = useWebChat({ config, realtimeAdapter });

  return (
    <WebChatErrorBoundary>
      <WebChatLauncher
        isOpen={isOpen}
        onToggle={isOpen ? close : open}
      />
      <WebChatPanel
        isOpen={isOpen}
        onClose={close}
        messages={messages}
        sessionLoading={sessionLoading}
        sessionError={sessionError}
        sendError={sendError}
        onSend={send}
        isSending={isSending}
        retryAfter={retryAfter}
      />
    </WebChatErrorBoundary>
  );
}
