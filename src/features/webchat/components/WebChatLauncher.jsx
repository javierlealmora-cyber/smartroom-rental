import React from 'react';

export function WebChatLauncher({ isOpen, onToggle, unreadCount = 0 }) {
  return (
    <button
      id="webchat-launcher"
      type="button"
      aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat'}
      aria-expanded={isOpen}
      aria-controls="webchat-panel"
      onClick={onToggle}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center"
    >
      <span aria-hidden="true" className="text-xl">{isOpen ? '✕' : '💬'}</span>
      {unreadCount > 0 && !isOpen && (
        <span
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center"
          aria-label={`${unreadCount} mensajes nuevos`}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
