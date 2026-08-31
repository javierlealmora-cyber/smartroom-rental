import React, { useState, useCallback } from 'react';

const MAX_LENGTH = 2000;

export function WebChatComposer({ onSend, disabled = false, isSending = false, retryAfter = 0 }) {
  const [text, setText] = useState('');

  const canSend = text.trim().length > 0 && !disabled && !isSending && retryAfter === 0;

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!canSend) return;
    onSend?.(text.trim());
    setText('');
  }, [canSend, text, onSend]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) { onSend?.(text.trim()); setText(''); }
    }
  }, [canSend, text, onSend]);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 px-3 py-2 border-t border-gray-200"
      aria-label="Escribir mensaje"
    >
      <textarea
        aria-label="Escribe un mensaje"
        placeholder={retryAfter > 0 ? `Espera ${retryAfter}s…` : 'Escribe un mensaje…'}
        value={text}
        onChange={e => setText(e.target.value.slice(0, MAX_LENGTH))}
        onKeyDown={handleKeyDown}
        disabled={disabled || retryAfter > 0}
        rows={1}
        maxLength={MAX_LENGTH}
        className="flex-1 resize-none rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
      <button
        type="submit"
        aria-label="Enviar mensaje"
        disabled={!canSend}
        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
      >
        {isSending ? '…' : 'Enviar'}
      </button>
    </form>
  );
}
