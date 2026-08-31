export const SAFE_MESSAGES = {
  session_create_failed: 'No se pudo iniciar el chat. Inténtalo de nuevo.',
  message_send_failed:   'No se pudo enviar el mensaje.',
  poll_failed:           'No se pudieron cargar los mensajes.',
  rate_limited:          'Demasiados mensajes. Espera un momento.',
  session_expired:       'La sesión ha expirado. Se creará una nueva.',
  session_forbidden:     'Error de sesión. Se creará una nueva.',
  network_offline:       'Sin conexión a internet.',
  server_error:          'Error del servidor. Inténtalo de nuevo.',
  default:               'Ha ocurrido un error. Inténtalo de nuevo.',
};

export function toSafeError(error) {
  const status = error?.status ?? 0;
  if (status === 401) return { code: 'session_expired',   message: SAFE_MESSAGES.session_expired,   status };
  if (status === 403) return { code: 'session_forbidden', message: SAFE_MESSAGES.session_forbidden, status };
  if (status === 429) {
    const retryAfter = error?.data?.error?.detail?.retry_after_seconds ?? 60;
    return { code: 'rate_limited', message: SAFE_MESSAGES.rate_limited, status, retryAfter };
  }
  if (status >= 500) return { code: 'server_error', message: SAFE_MESSAGES.server_error, status };
  const code = error?.message ?? 'default';
  return { code, message: SAFE_MESSAGES[code] ?? SAFE_MESSAGES.default, status };
}

export function logDebug(event, config) {
  if (!config?.debug) return;
  console.log(`[webchat] ${event}`);
}
