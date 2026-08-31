/**
 * core-identity-client — Adapter para validación de identidad contra Core.
 *
 * Mode=mock (default): heurística local sin fetch externo.
 * Mode=real: llama a Core vía core-http-client con operación allowlisted.
 *
 * Niveles válidos: NO_MATCH, MATCH_INACTIVE, PARTIAL_MATCH_ACTIVE, STRONG_MATCH_ACTIVE.
 * Nunca devuelve niveles no definidos en el contrato de identidad.
 * Si Core devuelve nivel desconocido → error controlado, se devuelve NO_MATCH.
 *
 * Privacidad: phone, profile_id, identity_data — NUNCA loguear.
 * Fuente: rules-80 §4.5, SmartConversations identity contract.
 */

import type { ValidatedIdentityLevel } from "./identity-level.ts";
import { coreHttpCall, getCoreIntegrationMode } from "./core-http-client.ts";
import type { CoreIntegrationMode } from "./core-http-client.ts";

export interface CoreIdentityInput {
  client_account_id: string;
  /** Sensible — no loguear. */
  phone?: string;
  /** Sensible — no loguear. */
  profile_id?: string;
  /** Sensible — no loguear. */
  identity_data?: {
    full_name?: string;
    residence_name?: string;
    room_label?: string;
  };
}

export interface CoreIdentityResult {
  identity_level:  ValidatedIdentityLevel;
  profile_id?:     string;
  assignment_id?:  string;
  room_id?:        string;
  room_label?:     string;
  full_name?:      string;
}

export type CoreIdentityClient = {
  validateIdentity(input: CoreIdentityInput): Promise<CoreIdentityResult>;
};

// ---------------------------------------------------------------------------
// Conjunto de niveles válidos — solo los definidos en el contrato de identidad
// ---------------------------------------------------------------------------

const VALID_IDENTITY_LEVELS = new Set<string>([
  'NO_MATCH',
  'MATCH_INACTIVE',
  'PARTIAL_MATCH_ACTIVE',
  'STRONG_MATCH_ACTIVE',
]);

// ---------------------------------------------------------------------------
// Mock client — heurística sin fetch externo
// ---------------------------------------------------------------------------

const mockCoreIdentityClient: CoreIdentityClient = {
  async validateIdentity(input: CoreIdentityInput): Promise<CoreIdentityResult> {
    // Nunca loguear input.phone, input.profile_id, input.identity_data

    if (input.profile_id) {
      return {
        identity_level: 'STRONG_MATCH_ACTIVE',
        profile_id:     input.profile_id,
        assignment_id:  `mock_assign_${input.profile_id.slice(0, 8)}`,
        room_id:        `mock_room_${input.profile_id.slice(0, 8)}`,
      };
    }

    if (input.phone && input.phone.startsWith('+') && input.phone.length >= 9) {
      return {
        identity_level: 'PARTIAL_MATCH_ACTIVE',
        profile_id:     `mock_prof_${input.phone.slice(1, 9)}`,
      };
    }

    if (input.identity_data?.full_name && input.identity_data?.room_label) {
      return {
        identity_level: 'PARTIAL_MATCH_ACTIVE',
        profile_id:     `mock_prof_progressive`,
        room_label:     input.identity_data.room_label,
      };
    }

    return { identity_level: 'NO_MATCH' };
  },
};

// ---------------------------------------------------------------------------
// Real client — usa core-http-client con operación allowlisted
// ---------------------------------------------------------------------------

const realCoreIdentityClient: CoreIdentityClient = {
  async validateIdentity(input: CoreIdentityInput): Promise<CoreIdentityResult> {
    // No loguear input.phone, input.profile_id, input.identity_data
    const resp = await coreHttpCall<{ identity_level: string; profile_id?: string; assignment_id?: string; room_id?: string; room_label?: string }>({
      method:            'POST',
      operation:         'core.identity.validate',
      client_account_id: input.client_account_id,
      body: {
        // phone puede enviarse solo desde EF interna, nunca a orquestadores externos o logs
        phone:         input.phone,
        profile_id:    input.profile_id,
        identity_data: input.identity_data,
      },
    });

    if (!resp.ok || !resp.data) {
      return { identity_level: 'NO_MATCH' };
    }

    const level = resp.data.identity_level;

    // Validar nivel contra allowlist — solo se aceptan los niveles del contrato de identidad
    if (!VALID_IDENTITY_LEVELS.has(level)) {
      // Error controlado — no exponer level desconocido en respuesta al usuario
      return { identity_level: 'NO_MATCH' };
    }

    return {
      identity_level: level as ValidatedIdentityLevel,
      profile_id:     resp.data.profile_id,
      assignment_id:  resp.data.assignment_id,
      room_id:        resp.data.room_id,
      room_label:     resp.data.room_label,
    };
  },
};

// ---------------------------------------------------------------------------
// Factory — selecciona implementación según modo
// ---------------------------------------------------------------------------

export function buildCoreIdentityClient(mode?: CoreIntegrationMode): CoreIdentityClient {
  const resolved = mode ?? getCoreIntegrationMode();
  return resolved === 'real' ? realCoreIdentityClient : mockCoreIdentityClient;
}

/** Default export: siempre mock para backward compatibility */
export const defaultCoreIdentityClient: CoreIdentityClient = mockCoreIdentityClient;
