import { useState, useCallback } from 'react';
import { dedupeMessages, reconcileOptimistic } from '../utils/webchat-dedupe.js';

let _tempCounter = 0;
function makeTempId() { return `temp_${Date.now()}_${++_tempCounter}`; }

export function useWebChatMessages() {
  const [messages, setMessages] = useState([]);
  const [cursor, setCursor]     = useState({});

  const addOptimistic = useCallback((text) => {
    const tempId = makeTempId();
    setMessages(prev => [...prev, {
      message_id:   tempId,
      direction:    'inbound',
      sender_type:  'user',
      message_text: text,
      created_at:   new Date().toISOString(),
      temp:         true,
      status:       'received',
    }]);
    return tempId;
  }, []);

  const confirmOptimistic = useCallback((tempId, confirmedId) => {
    setMessages(prev => reconcileOptimistic(prev, confirmedId, tempId));
  }, []);

  const removeOptimistic = useCallback((tempId) => {
    setMessages(prev => prev.filter(m => m.message_id !== tempId));
  }, []);

  const mergeMessages = useCallback((incoming, nextCursor) => {
    setMessages(prev => dedupeMessages(prev, incoming ?? []));
    if (nextCursor) setCursor(nextCursor);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCursor({});
  }, []);

  return { messages, cursor, addOptimistic, confirmOptimistic, removeOptimistic, mergeMessages, clearMessages };
}
