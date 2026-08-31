import React from 'react';

export function WebChatMessageBubble({ message }) {
  const isUser = message.direction === 'inbound' || message.sender_type === 'user';
  const isPending = message.temp === true;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={[
          'max-w-[80%] px-3 py-2 rounded-lg text-sm break-words',
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-gray-100 text-gray-900 rounded-bl-none',
          isPending ? 'opacity-60' : '',
        ].join(' ')}
        aria-label={isUser ? 'Tu mensaje' : 'Respuesta'}
      >
        {message.message_text ?? message.text ?? ''}
        {isPending && (
          <span className="ml-1 text-xs opacity-70" aria-label="enviando">…</span>
        )}
      </div>
    </div>
  );
}
