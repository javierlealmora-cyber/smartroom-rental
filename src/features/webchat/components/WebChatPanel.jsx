import React, { useEffect, useRef } from 'react';
import { WebChatHeader }      from './WebChatHeader.jsx';
import { WebChatMessageList } from './WebChatMessageList.jsx';
import { WebChatComposer }    from './WebChatComposer.jsx';
import { WebChatStatus }      from './WebChatStatus.jsx';
import { focusFirst, trapFocus } from '../utils/webchat-accessibility.js';

export function WebChatPanel({
  isOpen, onClose, messages, sessionLoading, sessionError, sendError,
  isSending, retryAfter, onSend,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (isOpen) focusFirst(panelRef.current);
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose?.(); return; }
    trapFocus(panelRef.current, e);
  };

  if (!isOpen) return null;

  return (
    <div
      id="webchat-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Chat de soporte"
      ref={panelRef}
      onKeyDown={handleKeyDown}
      className="fixed bottom-24 right-6 z-50 w-80 h-[480px] flex flex-col bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden"
    >
      <WebChatHeader onClose={onClose} />
      <WebChatStatus error={sessionError ?? sendError} sessionLoading={sessionLoading} />
      <WebChatMessageList messages={messages} loading={sessionLoading} />
      <WebChatComposer
        onSend={onSend}
        disabled={!!sessionError || sessionLoading}
        isSending={isSending}
        retryAfter={retryAfter}
      />
    </div>
  );
}
