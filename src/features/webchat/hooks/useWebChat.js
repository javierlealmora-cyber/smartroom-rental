import { useState, useCallback, useRef } from 'react';
import { useWebChatSession }  from './useWebChatSession.js';
import { useWebChatMessages } from './useWebChatMessages.js';
import { useWebChatPolling }  from './useWebChatPolling.js';
import { useWebChatRealtime } from './useWebChatRealtime.js';
import { sendWebChatMessage } from '../services/webchat-api.js';
import { toSafeError, logDebug } from '../utils/webchat-errors.js';

export function useWebChat({ config, realtimeAdapter } = {}) {
  const [isOpen, setIsOpen]       = useState(false);
  const [sendError, setSendError] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const sendAbortRef = useRef(null);

  const {
    session, sessionError, sessionLoading, createSession, clearCurrentSession,
  } = useWebChatSession(config);

  const {
    messages, cursor, addOptimistic, confirmOptimistic, removeOptimistic, mergeMessages,
  } = useWebChatMessages();

  const handleMessages = useCallback((incoming, nextCursor) => {
    mergeMessages(incoming, nextCursor);
  }, [mergeMessages]);

  const handlePollError = useCallback((err) => {
    const safe = toSafeError(err);
    if (safe.status === 401 || safe.status === 403) clearCurrentSession();
  }, [clearCurrentSession]);

  const { poll } = useWebChatPolling({
    session,
    config,
    cursor,
    onMessages: handleMessages,
    onError:    handlePollError,
    enabled:    isOpen && !!session,
  });

  useWebChatRealtime({
    session,
    config,
    onNotification: () => poll(),
    adapter:        realtimeAdapter,
  });

  const open = useCallback(async () => {
    setIsOpen(true);
    if (!session) await createSession();
  }, [session, createSession]);

  const close = useCallback(() => {
    setIsOpen(false);
    setSendError(null);
  }, []);

  const send = useCallback(async (text) => {
    const trimmed = text?.trim() ?? '';
    if (!trimmed || isSending || retryAfter > 0 || !session) return;
    if (trimmed.length > (config?.maxMessageLength ?? 2000)) return;

    setSendError(null);
    setIsSending(true);
    const tempId = addOptimistic(trimmed);
    sendAbortRef.current?.abort();
    const abort = new AbortController();
    sendAbortRef.current = abort;

    try {
      const res = await sendWebChatMessage({
        apiBaseUrl:      config.apiBaseUrl,
        clientAccountId: config.clientAccountId,
        sessionId:       session.session_id,
        senderRef:       session.sender_ref,
        messageText:     trimmed,
        token:           session.webchat_session_token,
      }, abort.signal);
      const msgId = res?.data?.message_id ?? tempId;
      confirmOptimistic(tempId, msgId);
      logDebug('webchat_message_accepted', config);
      poll();
    } catch (err) {
      if (err?.name === 'AbortError') return;
      removeOptimistic(tempId);
      const safe = toSafeError(err);
      setSendError(safe);
      if (safe.status === 401 || safe.status === 403) {
        clearCurrentSession();
        createSession();
      }
      if (safe.status === 429 && safe.retryAfter > 0) {
        setRetryAfter(safe.retryAfter);
        setTimeout(() => setRetryAfter(0), safe.retryAfter * 1000);
      }
    } finally {
      setIsSending(false);
    }
  }, [session, config, isSending, retryAfter, addOptimistic, confirmOptimistic, removeOptimistic, poll, clearCurrentSession, createSession]);

  return {
    isOpen, open, close,
    session, sessionError, sessionLoading,
    messages, cursor,
    send, sendError, isSending, retryAfter,
  };
}
