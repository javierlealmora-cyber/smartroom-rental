/**
 * canonical-actor.ts — Modelo de actor canónico para add-ons (Fase 11C5).
 *
 * Variantes permitidas:
 *   tenant_profile  — inquilino identificado y verificado
 *   unverified_lead — prospecto no verificado (NO el enum interno UNVERIFIED_LEAD)
 *   system_service  — operación técnica autorizada (no representa a un usuario)
 *
 * Campos prohibidos en actor:
 *   identity_level, STRONG_MATCH_ACTIVE, PARTIAL_MATCH_ACTIVE, MATCH_INACTIVE,
 *   NO_MATCH, UNVERIFIED_LEAD, sender_ref, phone, email, jid, wa_jid.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export type CanonicalActorType = 'tenant_profile' | 'unverified_lead' | 'system_service';

export interface TenantProfileActor {
  type: 'tenant_profile';
  profile_id: string;
  verified: boolean;
  verified_at: string; // ISO-8601
}

export interface UnverifiedLeadActor {
  type: 'unverified_lead';
  // Sin profile_id obligatorio — prospecto no verificado
}

export interface SystemServiceActor {
  type: 'system_service';
  service_name: string;
}

export type CanonicalActor = TenantProfileActor | UnverifiedLeadActor | SystemServiceActor;

// ─────────────────────────────────────────────────────────────────────────────
// Campos prohibidos en el actor
// ─────────────────────────────────────────────────────────────────────────────

export const CANONICAL_ACTOR_FORBIDDEN_FIELDS = new Set([
  'identity_level',
  'STRONG_MATCH_ACTIVE',
  'PARTIAL_MATCH_ACTIVE',
  'MATCH_INACTIVE',
  'NO_MATCH',
  'UNVERIFIED_LEAD',  // NO enviar el enum interno
  'sender_ref',
  'phone',
  'email',
  'jid',
  'wa_jid',
  'webchat_token',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Validación
// ─────────────────────────────────────────────────────────────────────────────

export function validateCanonicalActor(actor: unknown): { valid: boolean; reason?: string } {
  if (!actor || typeof actor !== 'object') return { valid: false, reason: 'ACTOR_NOT_OBJECT' };
  const a = actor as Record<string, unknown>;

  if (!a['type']) return { valid: false, reason: 'ACTOR_TYPE_MISSING' };
  if (!(['tenant_profile', 'unverified_lead', 'system_service'] as string[]).includes(a['type'] as string)) {
    return { valid: false, reason: `INVALID_ACTOR_TYPE: ${a['type']}` };
  }

  for (const key of Object.keys(a)) {
    if (CANONICAL_ACTOR_FORBIDDEN_FIELDS.has(key)) {
      return { valid: false, reason: `FORBIDDEN_ACTOR_FIELD: ${key}` };
    }
  }

  if (a['type'] === 'tenant_profile') {
    if (!a['profile_id']) return { valid: false, reason: 'PROFILE_ID_REQUIRED_FOR_TENANT_PROFILE' };
    if (typeof a['verified'] !== 'boolean') return { valid: false, reason: 'VERIFIED_BOOLEAN_REQUIRED' };
    if (!a['verified_at']) return { valid: false, reason: 'VERIFIED_AT_REQUIRED' };
  }

  if (a['type'] === 'system_service') {
    if (!a['service_name']) return { valid: false, reason: 'SERVICE_NAME_REQUIRED_FOR_SYSTEM_SERVICE' };
  }

  return { valid: true };
}

export function isTenantProfileActor(actor: CanonicalActor): actor is TenantProfileActor {
  return actor.type === 'tenant_profile';
}

export function isUnverifiedLeadActor(actor: CanonicalActor): actor is UnverifiedLeadActor {
  return actor.type === 'unverified_lead';
}
