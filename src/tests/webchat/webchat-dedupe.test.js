import { describe, it, expect } from 'vitest';
import { dedupeMessages, sortMessages, reconcileOptimistic } from '../../features/webchat/utils/webchat-dedupe.js';

function msg(id, at, temp = false) {
  return { message_id: id, created_at: at, temp };
}

describe('WebChat Deduplicate', () => {
  it('54. dedupeMessages elimina duplicados por message_id', () => {
    const existing = [msg('a', '2024-01-01T00:00:00Z')];
    const incoming = [msg('a', '2024-01-01T00:00:00Z'), msg('b', '2024-01-01T00:00:01Z')];
    const result = dedupeMessages(existing, incoming);
    expect(result.map(m => m.message_id)).toEqual(['a', 'b']);
  });

  it('55. confirmado reemplaza optimista cuando llega el mensaje real', () => {
    const existing = [msg('temp_1', '2024-01-01T00:00:00Z', true)];
    const incoming = [msg('real_1', '2024-01-01T00:00:00Z', false)];
    const result = dedupeMessages(existing, incoming);
    const ids = result.map(m => m.message_id);
    expect(ids).toContain('real_1');
  });

  it('56. sortMessages ordena por created_at ascendente', () => {
    const messages = [
      msg('b', '2024-01-01T00:00:02Z'),
      msg('a', '2024-01-01T00:00:01Z'),
    ];
    const sorted = sortMessages(messages);
    expect(sorted[0].message_id).toBe('a');
    expect(sorted[1].message_id).toBe('b');
  });

  it('57. dedupeMessages ignora entradas sin message_id', () => {
    const result = dedupeMessages(
      [{ created_at: '2024-01-01T00:00:00Z' }],
      [msg('a', '2024-01-01T00:00:01Z')],
    );
    expect(result.every(m => m.message_id)).toBe(true);
  });

  it('58. reconcileOptimistic actualiza tempId al confirmedId', () => {
    const messages = [msg('temp_1', '2024-01-01T00:00:00Z', true)];
    const result = reconcileOptimistic(messages, 'real_1', 'temp_1');
    expect(result[0].message_id).toBe('real_1');
    expect(result[0].temp).toBe(false);
  });

  it('59. reconcileOptimistic no modifica mensajes no coincidentes', () => {
    const messages = [msg('real_x', '2024-01-01T00:00:00Z', false)];
    const result = reconcileOptimistic(messages, 'real_1', 'temp_1');
    expect(result[0].message_id).toBe('real_x');
  });
});
