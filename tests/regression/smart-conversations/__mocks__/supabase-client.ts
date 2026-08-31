/**
 * Shim mínimo de @supabase/supabase-js para Vitest/Node.js.
 * vi.mock() sustituye este módulo en los tests runtime de WebChat.
 * En tests estáticos (readFileSync), este fichero nunca se importa.
 */
export function createClient(
  _url: string,
  _key: string,
  _opts?: unknown,
): never {
  throw new Error(
    '[supabase-client shim] createClient debe ser mockeado con vi.mock() en tests runtime',
  );
}
