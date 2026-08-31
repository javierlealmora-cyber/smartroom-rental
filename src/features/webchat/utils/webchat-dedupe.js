export function sortMessages(messages) {
  return [...messages].sort((a, b) => {
    const d = new Date(a.created_at) - new Date(b.created_at);
    return d !== 0 ? d : a.message_id.localeCompare(b.message_id);
  });
}

export function dedupeMessages(existing, incoming) {
  const map = new Map();
  for (const m of [...existing, ...incoming]) {
    if (!m?.message_id) continue;
    const current = map.get(m.message_id);
    if (!current || m.temp !== true) map.set(m.message_id, m);
  }
  return sortMessages([...map.values()]);
}

export function reconcileOptimistic(messages, confirmedId, tempId) {
  return messages.map(m =>
    m.message_id === tempId ? { ...m, message_id: confirmedId, temp: false } : m
  );
}
