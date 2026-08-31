import React from 'react';

export function WebChatStatus({ error, sessionLoading }) {
  if (sessionLoading) {
    return (
      <div role="status" aria-live="polite" className="px-3 py-1 text-xs text-center text-gray-400">
        Conectando…
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" aria-live="assertive" className="px-3 py-1 text-xs text-center text-red-600">
        {error.message}
      </div>
    );
  }
  return null;
}
