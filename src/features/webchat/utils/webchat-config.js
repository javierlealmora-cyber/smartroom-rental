export function getWebchatConfig() {
  const env = import.meta.env;
  return {
    enabled:            env.VITE_WEBCHAT_WIDGET_ENABLED === 'true',
    apiBaseUrl:         env.VITE_WEBCHAT_API_BASE_URL ?? '',
    clientAccountId:    env.VITE_WEBCHAT_CLIENT_ACCOUNT_ID ?? '',
    widgetPublicKey:    env.VITE_WEBCHAT_WIDGET_PUBLIC_KEY ?? '',
    realtimeEnabled:    env.VITE_WEBCHAT_REALTIME_ENABLED === 'true',
    pollIntervalMs:     Number(env.VITE_WEBCHAT_POLL_INTERVAL_MS ?? 5000),
    sessionStorageMode: env.VITE_WEBCHAT_SESSION_STORAGE_MODE ?? 'memory',
    defaultLocale:      env.VITE_WEBCHAT_DEFAULT_LOCALE ?? 'es',
    debug:              env.VITE_WEBCHAT_DEBUG === 'true',
    maxMessageLength:   2000,
  };
}
