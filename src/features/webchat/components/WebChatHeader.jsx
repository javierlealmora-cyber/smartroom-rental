import React from 'react';

export function WebChatHeader({ onClose, title = 'Soporte' }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white rounded-t-lg">
      <span className="font-semibold text-sm">{title}</span>
      <button
        type="button"
        aria-label="Cerrar chat"
        onClick={onClose}
        className="p-1 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
}
