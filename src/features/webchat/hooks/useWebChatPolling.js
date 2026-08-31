import { useEffect, useRef, useCallback } from 'react';
import { pollWebChatMessages } from '../services/webchat-api.js';
import { logDebug } from '../utils/webchat-errors.js';

export function useWebChatPolling({ session, config, cursor, onMessages, onError, enabled = true }) {
  const abortRef   = useRef(null);
  const busyRef    = useRef(false);
  const timerRef   = useRef(null);
  const cursorRef  = useRef(cursor);
  const sessionRef = useRef(session);

  useEffect(() => { cursorRef.current  = cursor;  }, [cursor]);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const poll = useCallback(async () => {
    const s = sessionRef.current;
    if (busyRef.current || !s?.session_id || !s?.sender_ref) return;
    busyRef.current = true;
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    try {
      const res = await pollWebChatMessages({
        apiBaseUrl:      config.apiBaseUrl,
        clientAccountId: config.clientAccountId,
        sessionId:       s.session_id,
        senderRef:       s.sender_ref,
        cursor:          cursorRef.current,
        limit:           20,
        token:           s.webchat_session_token,
      }, abort.signal);
      const { messages = [], next_cursor } = res?.data ?? {};
      if (messages.length > 0 || next_cursor) {
        logDebug('webchat_poll_messages', config);
        onMessages?.(messages, next_cursor);
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      onError?.(err);
    } finally {
      busyRef.current = false;
    }
  }, [config, onMessages, onError]);

  useEffect(() => {
    if (!enabled || !session) return;
    poll();
    const interval = config?.pollIntervalMs ?? 5000;
    timerRef.current = setInterval(() => { if (!document.hidden) poll(); }, interval);
    const onVisible = () => { if (!document.hidden) poll(); };
    const onOnline  = () => poll();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      clearInterval(timerRef.current);
      abortRef.current?.abort();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [enabled, session, poll, config?.pollIntervalMs]);

  return { poll };
}
