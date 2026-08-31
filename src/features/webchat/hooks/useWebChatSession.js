import { useState, useCallback, useRef } from 'react';
import { createWebChatSession } from '../services/webchat-api.js';
import { saveSession, loadSession, clearSession } from '../services/webchat-storage.js';
import { toSafeError, logDebug } from '../utils/webchat-errors.js';

export function useWebChatSession(config) {
  const [session, setSession]             = useState(() => loadSession(config?.sessionStorageMode));
  const [sessionError, setSessionError]   = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const abortRef = useRef(null);

  const createSession = useCallback(async () => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setSessionLoading(true);
    setSessionError(null);
    try {
      const data = await createWebChatSession(config, abort.signal);
      saveSession(data, config?.sessionStorageMode);
      setSession(data);
      logDebug('webchat_session_created', config);
      return data;
    } catch (err) {
      if (err?.name === 'AbortError') return null;
      setSessionError(toSafeError(err));
      return null;
    } finally {
      setSessionLoading(false);
    }
  }, [config]);

  const clearCurrentSession = useCallback(() => {
    clearSession(config?.sessionStorageMode);
    setSession(null);
    setSessionError(null);
  }, [config]);

  return { session, sessionError, sessionLoading, createSession, clearCurrentSession };
}
