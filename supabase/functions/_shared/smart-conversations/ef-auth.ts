/**
 * Autenticación service_role para EFs internas de SmartConversations.
 * Las EFs internas solo aceptan llamadas server-to-server con la service_role key.
 * No hay dual-auth. Solo service_role: sin validación de sesión de usuario.
 *
 * SEC-012: comparación constant-time para evitar timing attacks.
 */

import { timingSafeEqual } from './runtime/constant-time.ts';

export function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get('Authorization') ?? req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

/**
 * Compara el Bearer token con la service_role key de forma constant-time.
 * Devuelve una Promise para permitir el uso de crypto.subtle.timingSafeEqual.
 *
 * NOTA: La mayoría de las EFs llaman isServiceRoleRequest en un contexto async,
 * por lo que la versión async es segura. Para compatibilidad con código sync
 * que ya usa esta función, se mantiene la versión sync (isServiceRoleRequestSync)
 * que usa comparación estándar — solo para entornos locales/test donde el
 * riesgo de timing attack es despreciable.
 */
export async function isServiceRoleRequest(req: Request, serviceRoleKey: string): Promise<boolean> {
  const token = extractBearerToken(req);
  if (!token) return false;
  return timingSafeEqual(token, serviceRoleKey);
}

/**
 * Versión sync para compatibilidad con código legacy.
 * Solo usar en contextos donde async no es viable.
 * SEC-012: prefer isServiceRoleRequest (async, constant-time).
 */
export function isServiceRoleRequestSync(req: Request, serviceRoleKey: string): boolean {
  const token = extractBearerToken(req);
  return !!token && token === serviceRoleKey;
}

export class ServiceRoleError extends Error {
  readonly status = 401;
  readonly code = 'UNAUTHORIZED';

  constructor() {
    super('Se requiere service_role key para llamar a esta EF interna');
    this.name = 'ServiceRoleError';
  }
}

/**
 * Lanza ServiceRoleError si el bearer token no coincide con la service_role key.
 * Versión async con constant-time comparison (preferida).
 */
export async function requireServiceRole(req: Request, serviceRoleKey: string): Promise<void> {
  if (!(await isServiceRoleRequest(req, serviceRoleKey))) {
    throw new ServiceRoleError();
  }
}

/**
 * Versión sync de requireServiceRole para compatibilidad con EFs que no son async.
 * SEC-012: preferir requireServiceRole cuando el contexto es async.
 */
export function requireServiceRoleSync(req: Request, serviceRoleKey: string): void {
  if (!isServiceRoleRequestSync(req, serviceRoleKey)) {
    throw new ServiceRoleError();
  }
}
