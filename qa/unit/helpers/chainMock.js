// qa/unit/helpers/chainMock.js
// Mock del patrón de chaining de Supabase
//
// Supabase usa: supabase.from('table').select('*').eq('id', 1).single()
// buildChain(result) crea un objeto awaitable con todos los métodos encadenables.

import { vi } from 'vitest';

export function buildChain(resolveWith) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolveWith),
    maybeSingle: vi.fn().mockResolvedValue(resolveWith),
    then(resolve, reject) {
      return Promise.resolve(resolveWith).then(resolve, reject);
    },
    catch(onRejected) {
      return Promise.resolve(resolveWith).catch(onRejected);
    },
    finally(onFinally) {
      return Promise.resolve(resolveWith).finally(onFinally);
    },
  };
  return chain;
}
