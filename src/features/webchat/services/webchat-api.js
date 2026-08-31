export async function createWebChatSession(config, signal) {
  const { apiBaseUrl, clientAccountId, widgetPublicKey } = config ?? {};
  const body = { client_account_id: clientAccountId };
  if (widgetPublicKey) body.widget_public_key = widgetPublicKey;
  const res = await fetch(`${apiBaseUrl}/functions/v1/conv-web-session`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw Object.assign(new Error('session_create_failed'), { status: res.status, data: errBody });
  }
  const { data } = await res.json();
  return data;
}

export async function sendWebChatMessage({ apiBaseUrl, clientAccountId, sessionId, senderRef, messageText, token }, signal) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${apiBaseUrl}/functions/v1/conv-web-message`, {
    method:  'POST',
    headers,
    body:    JSON.stringify({
      client_account_id: clientAccountId,
      session_id:        sessionId,
      sender_ref:        senderRef,
      message_text:      messageText,
    }),
    signal,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw Object.assign(new Error('message_send_failed'), { status: res.status, data: errBody });
  }
  return res.json();
}

export async function pollWebChatMessages({ apiBaseUrl, clientAccountId, sessionId, senderRef, cursor, limit, token }, signal) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${apiBaseUrl}/functions/v1/conv-web-poll`, {
    method:  'POST',
    headers,
    body:    JSON.stringify({
      client_account_id: clientAccountId,
      session_id:        sessionId,
      sender_ref:        senderRef,
      ...(cursor ?? {}),
      limit:             limit ?? 20,
    }),
    signal,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw Object.assign(new Error('poll_failed'), { status: res.status, data: errBody });
  }
  return res.json();
}
