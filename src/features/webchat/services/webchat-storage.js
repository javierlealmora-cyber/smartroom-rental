const SESSION_KEY = 'wc_session';
const CURSOR_KEY  = 'wc_cursor';

function isSessionValid(session) {
  if (!session?.session_id || !session?.sender_ref || !session?.expires_at) return false;
  return new Date(session.expires_at) > new Date();
}

let _memSession = null;
let _memCursor  = {};

export function saveSession(session, mode = 'memory') {
  _memSession = session;
  if (mode === 'sessionStorage') {
    try {
      const safe = {
        session_id:            session.session_id,
        sender_ref:            session.sender_ref,
        client_account_id:     session.client_account_id,
        expires_at:            session.expires_at,
        webchat_session_token: session.webchat_session_token,
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(safe));
    } catch { /* ignore QuotaExceededError or SecurityError */ }
  }
}

export function loadSession(mode = 'memory') {
  if (mode === 'sessionStorage') {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!isSessionValid(parsed)) { sessionStorage.removeItem(SESSION_KEY); return null; }
      return parsed;
    } catch { return null; }
  }
  return isSessionValid(_memSession) ? _memSession : null;
}

export function clearSession(mode = 'memory') {
  _memSession = null;
  _memCursor  = {};
  if (mode === 'sessionStorage') {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(CURSOR_KEY);
    } catch { /* ignore */ }
  }
}

export function saveCursor(cursor, mode = 'memory') {
  _memCursor = cursor ?? {};
  if (mode === 'sessionStorage') {
    try { sessionStorage.setItem(CURSOR_KEY, JSON.stringify(_memCursor)); } catch { /* ignore */ }
  }
}

export function loadCursor(mode = 'memory') {
  if (mode === 'sessionStorage') {
    try {
      const raw = sessionStorage.getItem(CURSOR_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }
  return _memCursor ?? {};
}

export function _resetMemoryForTests() {
  _memSession = null;
  _memCursor  = {};
}
