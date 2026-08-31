import React, { useEffect, useRef } from 'react';
import { WebChatMessageBubble } from './WebChatMessageBubble.jsx';

export function WebChatMessageList({ messages = [], loading = false }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Mensajes del chat"
      className="flex-1 overflow-y-auto px-3 py-2 space-y-1"
    >
      {loading && messages.length === 0 && (
        <p className="text-center text-sm text-gray-400 mt-4">Cargando…</p>
      )}
      {!loading && messages.length === 0 && (
        <p className="text-center text-sm text-gray-400 mt-4">
          ¡Hola! ¿En qué podemos ayudarte?
        </p>
      )}
      {messages.map(m => (
        <WebChatMessageBubble key={m.message_id} message={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
