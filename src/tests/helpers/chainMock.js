/**
 * chainMock.js — Helper para mockear las queries encadenadas de Supabase
 *
 * Supabase usa un patrón de chaining:
 *   supabase.from('table').select('*').eq('id', 1).single()
 *
 * buildChain(result) crea un objeto que:
 *   - Es awaitable (tiene .then/.catch) → resuelve a `result`
 *   - Tiene métodos encadenables que devuelven el mismo chain
 *   - Esto permite mockear cualquier cadena sin importar cuál sea el último método
 */
import { vi } from 'vitest'

export function buildChain(resolveWith) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolveWith),
    maybeSingle: vi.fn().mockResolvedValue(resolveWith),
    // Hace el chain awaitable: await chain === resolveWith
    then(resolve, reject) {
      return Promise.resolve(resolveWith).then(resolve, reject)
    },
    catch(onRejected) {
      return Promise.resolve(resolveWith).catch(onRejected)
    },
    finally(onFinally) {
      return Promise.resolve(resolveWith).finally(onFinally)
    },
  }
  return chain
}
