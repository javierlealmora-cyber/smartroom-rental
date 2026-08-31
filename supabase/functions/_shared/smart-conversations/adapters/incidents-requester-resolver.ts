/**
 * incidents-requester-resolver.ts — Resolución server-side del contexto del solicitante (Fase 11C5E).
 *
 * Responsabilidad: cargar datos de identidad desde conv_sessions en el EF (server-side),
 * verificar STRONG_MATCH_ACTIVE y devolver el contexto completo para construir
 * ProviderCreateIncidentRequestV1.
 *
 * PROHIBICIÓN ABSOLUTA: WF-20 / n8n NUNCA envían profile_id al EF.
 *                       El EF carga esta información directamente desde conv_sessions.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constante de identity level requerido
// ─────────────────────────────────────────────────────────────────────────────

export const REQUIRED_IDENTITY_LEVEL = 'STRONG_MATCH_ACTIVE';

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface IncidentRequesterContext {
  profile_id: string;
  accommodation_id: string;
  room_id: string | null;
  source_channel: 'whatsapp' | 'webchat';
  identity_level: string;
}

/**
 * Loader inyectable — la implementación real usa SupabaseClient,
 * la implementación de test usa un mock.
 */
export interface RequesterContextLoader {
  loadSessionContext(
    conv_case_id: string,
    client_account_id: string,
  ): Promise<{
    identity_level: string;
    profile_id: string | null;
    accommodation_id: string | null;
    room_id: string | null;
    source_channel: string;
  } | null>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error explícito — fail-closed
// ─────────────────────────────────────────────────────────────────────────────

export class RequesterIdentityError extends Error {
  public readonly code = 'REQUESTER_IDENTITY_REQUIRED';
  constructor(public readonly reason: string) {
    super(`REQUESTER_IDENTITY_REQUIRED: ${reason}`);
    this.name = 'RequesterIdentityError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Función principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resuelve el contexto del solicitante server-side desde datos confiables.
 *
 * Fail-closed en todos los casos de duda:
 *   - session no encontrada → throws
 *   - identity_level ≠ STRONG_MATCH_ACTIVE → throws
 *   - profile_id null → throws
 *   - accommodation_id null → throws
 *   - source_channel inválido → throws
 */
export async function resolveIncidentRequesterContext(
  conv_case_id: string,
  client_account_id: string,
  loader: RequesterContextLoader,
): Promise<IncidentRequesterContext> {
  const ctx = await loader.loadSessionContext(conv_case_id, client_account_id);

  if (!ctx) {
    throw new RequesterIdentityError('session context not found for conv_case_id');
  }

  if (ctx.identity_level !== REQUIRED_IDENTITY_LEVEL) {
    throw new RequesterIdentityError(
      `identity_level "${ctx.identity_level}" is not ${REQUIRED_IDENTITY_LEVEL}`,
    );
  }

  if (!ctx.profile_id) {
    throw new RequesterIdentityError('profile_id is null or empty — cannot create incident');
  }

  if (!ctx.accommodation_id) {
    throw new RequesterIdentityError('accommodation_id is null or empty — cannot create incident');
  }

  const ch = ctx.source_channel;
  if (ch !== 'whatsapp' && ch !== 'webchat') {
    throw new RequesterIdentityError(`invalid source_channel: "${ch}"`);
  }

  return {
    profile_id: ctx.profile_id,
    accommodation_id: ctx.accommodation_id,
    room_id: ctx.room_id,
    source_channel: ch,
    identity_level: ctx.identity_level,
  };
}
