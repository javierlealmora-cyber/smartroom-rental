import { useEffect, useRef } from 'react';
import { logDebug } from '../utils/webchat-errors.js';

export function useWebChatRealtime({ session, config, onNotification, adapter }) {
  const unsubRef = useRef(null);

  useEffect(() => {
    if (!config?.realtimeEnabled || !session?.session_id || !adapter) return;
    const unsubscribe = adapter.subscribe(
      session.session_id,
      (notification) => {
        if (notification?.session_id && notification.session_id !== session.session_id) return;
        logDebug('webchat_realtime_notification', config);
        onNotification?.(notification);
      },
      () => logDebug('webchat_realtime_disconnected', config),
    );
    unsubRef.current = unsubscribe;
    return () => { unsubRef.current?.(); unsubRef.current = null; };
  }, [session?.session_id, config?.realtimeEnabled, adapter, onNotification, config]);
}
