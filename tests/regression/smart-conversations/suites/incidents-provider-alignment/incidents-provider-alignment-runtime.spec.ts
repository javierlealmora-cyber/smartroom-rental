/**
 * incidents-provider-alignment-runtime.spec.ts — Fase 11C5E-IMPLEMENTATION (Suite 2/4)
 * Tests de comportamiento runtime importando funciones reales.
 *
 * OFFLINE ONLY: Importa y ejecuta funciones puras (sin Deno.env, sin fetch, sin DB).
 * Cubre: mapUrgencyToPriority, generateIncidentTitle, mapCanonicalActorToSmartIncidentsActor,
 *         normalizeTitle, resolveIncidentRequesterContext (con mock loader).
 *
 * Total: 42 tests activos (sin it.todo).
 */

import { describe, it, expect } from 'vitest';

import {
  mapUrgencyToPriority,
  UrgencyMappingError,
} from '../../../../../supabase/functions/_shared/smart-conversations/adapters/incidents-priority-mapper.ts';

import {
  generateIncidentTitle,
  normalizeTitle,
  TITLE_MIN_LENGTH,
  TITLE_MAX_LENGTH,
  FORBIDDEN_TITLE,
  TitleValidationError,
} from '../../../../../supabase/functions/_shared/smart-conversations/adapters/incidents-title-generator.ts';

import {
  mapCanonicalActorToSmartIncidentsActor,
  ActorMappingError,
} from '../../../../../supabase/functions/_shared/smart-conversations/adapters/incidents-actor-mapper.ts';

import {
  resolveIncidentRequesterContext,
  RequesterIdentityError,
  REQUIRED_IDENTITY_LEVEL,
} from '../../../../../supabase/functions/_shared/smart-conversations/adapters/incidents-requester-resolver.ts';

import {
  mapProviderError,
} from '../../../../../supabase/functions/_shared/smart-conversations/adapters/incidents-addon-adapter.ts';

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-PRIO — mapUrgencyToPriority
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-PRIO — mapUrgencyToPriority: comportamiento runtime', () => {
  it('N11C5E-PRIO-01: null → normal', () => {
    expect(mapUrgencyToPriority(null)).toBe('normal');
  });

  it('N11C5E-PRIO-02: undefined → normal', () => {
    expect(mapUrgencyToPriority(undefined)).toBe('normal');
  });

  it('N11C5E-PRIO-03: empty string → normal', () => {
    expect(mapUrgencyToPriority('')).toBe('normal');
  });

  it('N11C5E-PRIO-04: low → normal', () => {
    expect(mapUrgencyToPriority('low')).toBe('normal');
  });

  it('N11C5E-PRIO-05: medium → normal', () => {
    expect(mapUrgencyToPriority('medium')).toBe('normal');
  });

  it('N11C5E-PRIO-06: high → urgent', () => {
    expect(mapUrgencyToPriority('high')).toBe('urgent');
  });

  it('N11C5E-PRIO-07: critical → throws UrgencyMappingError (no invocar)', () => {
    expect(() => mapUrgencyToPriority('critical')).toThrow(UrgencyMappingError);
  });

  it('N11C5E-PRIO-08: unknown → throws UrgencyMappingError (no invocar)', () => {
    expect(() => mapUrgencyToPriority('unknown')).toThrow(UrgencyMappingError);
  });

  it('N11C5E-PRIO-09: HIGH (uppercase) → throws UrgencyMappingError', () => {
    expect(() => mapUrgencyToPriority('HIGH')).toThrow(UrgencyMappingError);
  });

  it('N11C5E-PRIO-10: URGENT → throws UrgencyMappingError (no es un valor SC)', () => {
    expect(() => mapUrgencyToPriority('urgent')).toThrow(UrgencyMappingError);
  });

  it('N11C5E-PRIO-11: emergency → throws UrgencyMappingError', () => {
    expect(() => mapUrgencyToPriority('emergency')).toThrow(UrgencyMappingError);
  });

  it('N11C5E-PRIO-12: UrgencyMappingError tiene code UNKNOWN_URGENCY', () => {
    try {
      mapUrgencyToPriority('critical');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(UrgencyMappingError);
      expect((e as UrgencyMappingError).code).toBe('UNKNOWN_URGENCY');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-TITLE — generateIncidentTitle / normalizeTitle
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-TITLE — generateIncidentTitle: comportamiento runtime', () => {
  it('N11C5E-TITLE-01: TITLE_MAX_LENGTH = 120', () => {
    expect(TITLE_MAX_LENGTH).toBe(120);
  });

  it('N11C5E-TITLE-02: TITLE_MIN_LENGTH = 5', () => {
    expect(TITLE_MIN_LENGTH).toBe(5);
  });

  it('N11C5E-TITLE-03: FORBIDDEN_TITLE = Incidencia registrada', () => {
    expect(FORBIDDEN_TITLE).toBe('Incidencia registrada');
  });

  it('N11C5E-TITLE-04: categoría maintenance genera título con Mantenimiento', () => {
    const t = generateIncidentTitle('maintenance', 'La caldera no funciona');
    expect(t).toContain('Mantenimiento');
  });

  it('N11C5E-TITLE-05: categoría noise genera título con Ruido', () => {
    const t = generateIncidentTitle('noise', 'Vecinos hacen ruido');
    expect(t).toContain('Ruido');
  });

  it('N11C5E-TITLE-06: categoría security genera título con Seguridad', () => {
    const t = generateIncidentTitle('security', 'La cerradura está rota');
    expect(t).toContain('Seguridad');
  });

  it('N11C5E-TITLE-07: categoría billing genera título con Facturación', () => {
    const t = generateIncidentTitle('billing', 'Cobro incorrecto');
    expect(t).toContain('Facturación');
  });

  it('N11C5E-TITLE-08: categoría other genera título con Incidencia (no el fallback prohibido)', () => {
    const t = generateIncidentTitle('other', 'Problema general');
    expect(t).toContain('Incidencia');
    expect(t).not.toBe(FORBIDDEN_TITLE);
  });

  it('N11C5E-TITLE-09: título nunca supera 120 chars con descripción larga', () => {
    const longDesc = 'A'.repeat(500);
    const t = generateIncidentTitle('maintenance', longDesc);
    expect(t.length).toBeLessThanOrEqual(120);
  });

  it('N11C5E-TITLE-10: propuesta explícita válida tiene prioridad sobre determinista', () => {
    const proposal = 'Propuesta de título explícito';
    const t = generateIncidentTitle('maintenance', 'descripción', proposal);
    expect(t).toBe(proposal);
  });

  it('N11C5E-TITLE-11: propuesta explícita prohibida (FORBIDDEN_TITLE) no se usa', () => {
    const t = generateIncidentTitle('maintenance', 'descripción válida', FORBIDDEN_TITLE);
    expect(t).not.toBe(FORBIDDEN_TITLE);
    expect(t.length).toBeGreaterThanOrEqual(TITLE_MIN_LENGTH);
  });

  it('N11C5E-TITLE-12: propuesta explícita vacía usa fallback determinista', () => {
    const t = generateIncidentTitle('maintenance', 'La caldera no funciona', '');
    expect(t).toContain('Mantenimiento');
  });

  it('N11C5E-TITLE-13: resultado siempre ≥ 5 chars con descripción válida', () => {
    const t = generateIncidentTitle('noise', 'Ruido excesivo');
    expect(t.length).toBeGreaterThanOrEqual(TITLE_MIN_LENGTH);
  });
});

describe('N11C5E-NORMALIZE — normalizeTitle: comportamiento runtime', () => {
  it('N11C5E-NORMALIZE-01: elimina etiquetas HTML', () => {
    expect(normalizeTitle('<b>bold</b> texto')).toBe('bold texto');
  });

  it('N11C5E-NORMALIZE-02: elimina script tag', () => {
    expect(normalizeTitle('<script>alert(1)</script>normal')).toBe('normal');
  });

  it('N11C5E-NORMALIZE-03: elimina caracteres de control \x00', () => {
    expect(normalizeTitle('hola\x00mundo')).toBe('hola mundo');
  });

  it('N11C5E-NORMALIZE-04: normaliza múltiples espacios', () => {
    expect(normalizeTitle('hola    mundo')).toBe('hola mundo');
  });

  it('N11C5E-NORMALIZE-05: hace trim de inicio y fin', () => {
    expect(normalizeTitle('  hola  ')).toBe('hola');
  });

  it('N11C5E-NORMALIZE-06: retorno de carro y salto de línea se convierten a espacio', () => {
    const result = normalizeTitle('hola\nworld');
    expect(result).toBe('hola world');
  });

  it('N11C5E-NORMALIZE-07: Unicode NFC — ñ stays ñ', () => {
    const result = normalizeTitle('España');
    expect(result).toBe('España');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-ACTOR — mapCanonicalActorToSmartIncidentsActor
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-ACTOR — mapCanonicalActorToSmartIncidentsActor: comportamiento runtime', () => {
  it('N11C5E-ACTOR-01: system_service → { type: system }', () => {
    const actor = { type: 'system_service' as const, service_name: 'conv-wf20' };
    const result = mapCanonicalActorToSmartIncidentsActor(actor);
    expect(result).toEqual({ type: 'system' });
  });

  it('N11C5E-ACTOR-02: result tiene SOLO type (sin profile_id)', () => {
    const actor = { type: 'system_service' as const, service_name: 'conv-wf20' };
    const result = mapCanonicalActorToSmartIncidentsActor(actor);
    expect(result).not.toHaveProperty('profile_id');
  });

  it('N11C5E-ACTOR-03: result tiene SOLO type (sin identity_verified)', () => {
    const actor = { type: 'system_service' as const, service_name: 'conv-wf20' };
    const result = mapCanonicalActorToSmartIncidentsActor(actor);
    expect(result).not.toHaveProperty('identity_verified');
  });

  it('N11C5E-ACTOR-04: result tiene SOLO type (sin service_name)', () => {
    const actor = { type: 'system_service' as const, service_name: 'conv-wf20' };
    const result = mapCanonicalActorToSmartIncidentsActor(actor);
    expect(Object.keys(result)).toEqual(['type']);
  });

  it('N11C5E-ACTOR-05: tenant_profile → throws ActorMappingError', () => {
    const actor = { type: 'tenant_profile' as const, profile_id: 'p-123' };
    expect(() => mapCanonicalActorToSmartIncidentsActor(actor)).toThrow(ActorMappingError);
  });

  it('N11C5E-ACTOR-06: unverified_lead → throws ActorMappingError', () => {
    const actor = { type: 'unverified_lead' as const };
    expect(() => mapCanonicalActorToSmartIncidentsActor(actor)).toThrow(ActorMappingError);
  });

  it('N11C5E-ACTOR-07: ActorMappingError tiene code UNSUPPORTED_ACTOR_TYPE', () => {
    try {
      const actor = { type: 'tenant_profile' as const, profile_id: 'p-123' };
      mapCanonicalActorToSmartIncidentsActor(actor);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ActorMappingError);
      expect((e as ActorMappingError).code).toBe('UNSUPPORTED_ACTOR_TYPE');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-RESOLVER — resolveIncidentRequesterContext con mock loader
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-RESOLVER — resolveIncidentRequesterContext: comportamiento runtime', () => {
  it('N11C5E-RESOLVER-01: REQUIRED_IDENTITY_LEVEL = STRONG_MATCH_ACTIVE', () => {
    expect(REQUIRED_IDENTITY_LEVEL).toBe('STRONG_MATCH_ACTIVE');
  });

  it('N11C5E-RESOLVER-02: STRONG_MATCH_ACTIVE con profile_id válido → devuelve contexto', async () => {
    const loader = {
      loadSessionContext: async () => ({
        identity_level: 'STRONG_MATCH_ACTIVE',
        profile_id: 'profile-abc',
        accommodation_id: 'acc-xyz',
        room_id: 'room-001',
        source_channel: 'whatsapp',
      }),
    };
    const ctx = await resolveIncidentRequesterContext('case-1', 'tenant-1', loader);
    expect(ctx.profile_id).toBe('profile-abc');
    expect(ctx.accommodation_id).toBe('acc-xyz');
    expect(ctx.room_id).toBe('room-001');
    expect(ctx.source_channel).toBe('whatsapp');
  });

  it('N11C5E-RESOLVER-03: room_id null es válido (nullable)', async () => {
    const loader = {
      loadSessionContext: async () => ({
        identity_level: 'STRONG_MATCH_ACTIVE',
        profile_id: 'profile-abc',
        accommodation_id: 'acc-xyz',
        room_id: null,
        source_channel: 'webchat',
      }),
    };
    const ctx = await resolveIncidentRequesterContext('case-1', 'tenant-1', loader);
    expect(ctx.room_id).toBeNull();
  });

  it('N11C5E-RESOLVER-04: identity_level ≠ STRONG_MATCH_ACTIVE → throws RequesterIdentityError', async () => {
    const loader = {
      loadSessionContext: async () => ({
        identity_level: 'PARTIAL_MATCH_ACTIVE',
        profile_id: 'profile-abc',
        accommodation_id: 'acc-xyz',
        room_id: null,
        source_channel: 'whatsapp',
      }),
    };
    await expect(
      resolveIncidentRequesterContext('case-1', 'tenant-1', loader)
    ).rejects.toThrow(RequesterIdentityError);
  });

  it('N11C5E-RESOLVER-05: profile_id null → throws RequesterIdentityError', async () => {
    const loader = {
      loadSessionContext: async () => ({
        identity_level: 'STRONG_MATCH_ACTIVE',
        profile_id: null,
        accommodation_id: 'acc-xyz',
        room_id: null,
        source_channel: 'whatsapp',
      }),
    };
    await expect(
      resolveIncidentRequesterContext('case-1', 'tenant-1', loader)
    ).rejects.toThrow(RequesterIdentityError);
  });

  it('N11C5E-RESOLVER-06: accommodation_id null → throws RequesterIdentityError', async () => {
    const loader = {
      loadSessionContext: async () => ({
        identity_level: 'STRONG_MATCH_ACTIVE',
        profile_id: 'profile-abc',
        accommodation_id: null,
        room_id: null,
        source_channel: 'whatsapp',
      }),
    };
    await expect(
      resolveIncidentRequesterContext('case-1', 'tenant-1', loader)
    ).rejects.toThrow(RequesterIdentityError);
  });

  it('N11C5E-RESOLVER-07: session no encontrada (null) → throws RequesterIdentityError', async () => {
    const loader = {
      loadSessionContext: async () => null,
    };
    await expect(
      resolveIncidentRequesterContext('case-1', 'tenant-1', loader)
    ).rejects.toThrow(RequesterIdentityError);
  });

  it('N11C5E-RESOLVER-08: source_channel inválido → throws RequesterIdentityError', async () => {
    const loader = {
      loadSessionContext: async () => ({
        identity_level: 'STRONG_MATCH_ACTIVE',
        profile_id: 'profile-abc',
        accommodation_id: 'acc-xyz',
        room_id: null,
        source_channel: 'telegram', // no válido
      }),
    };
    await expect(
      resolveIncidentRequesterContext('case-1', 'tenant-1', loader)
    ).rejects.toThrow(RequesterIdentityError);
  });

  it('N11C5E-RESOLVER-09: RequesterIdentityError tiene code REQUESTER_IDENTITY_REQUIRED', async () => {
    const loader = { loadSessionContext: async () => null };
    try {
      await resolveIncidentRequesterContext('case-1', 'tenant-1', loader);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(RequesterIdentityError);
      expect((e as RequesterIdentityError).code).toBe('REQUESTER_IDENTITY_REQUIRED');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-PROVIDER-ERROR — mapProviderError: comportamiento runtime
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-PROVIDER-ERROR — mapProviderError: comportamiento runtime', () => {
  it('N11C5E-PROVIDER-ERROR-01: null → INTERNAL_ERROR', () => {
    expect(mapProviderError(null)).toBe('INTERNAL_ERROR');
  });

  it('N11C5E-PROVIDER-ERROR-02: string (no object) → INTERNAL_ERROR', () => {
    expect(mapProviderError('some error string')).toBe('INTERNAL_ERROR');
  });

  it('N11C5E-PROVIDER-ERROR-03: {} sin error_code → INTERNAL_ERROR', () => {
    expect(mapProviderError({})).toBe('INTERNAL_ERROR');
  });

  it('N11C5E-PROVIDER-ERROR-04: error_code null → INTERNAL_ERROR', () => {
    expect(mapProviderError({ error_code: null })).toBe('INTERNAL_ERROR');
  });

  it('N11C5E-PROVIDER-ERROR-05: código desconocido → INTERNAL_ERROR', () => {
    expect(mapProviderError({ error_code: 'MADE_UP_ATTACK_CODE' })).toBe('INTERNAL_ERROR');
  });

  it('N11C5E-PROVIDER-ERROR-06: VALIDATION_ERROR canónico → VALIDATION_ERROR', () => {
    expect(mapProviderError({ error_code: 'VALIDATION_ERROR' })).toBe('VALIDATION_ERROR');
  });

  it('N11C5E-PROVIDER-ERROR-07: IDEMPOTENCY_CONFLICT canónico → IDEMPOTENCY_CONFLICT', () => {
    expect(mapProviderError({ error_code: 'IDEMPOTENCY_CONFLICT' })).toBe('IDEMPOTENCY_CONFLICT');
  });

  // ── Códigos canónicos provider (los 13 restantes de los 15 totales) ──────────

  it('N11C5E-PROVIDER-ERROR-08: UNSUPPORTED_CONTRACT_VERSION canónico → UNSUPPORTED_CONTRACT_VERSION', () => {
    expect(mapProviderError({ error_code: 'UNSUPPORTED_CONTRACT_VERSION' })).toBe('UNSUPPORTED_CONTRACT_VERSION');
  });

  it('N11C5E-PROVIDER-ERROR-09: AUTHENTICATION_REQUIRED canónico → AUTHENTICATION_REQUIRED', () => {
    expect(mapProviderError({ error_code: 'AUTHENTICATION_REQUIRED' })).toBe('AUTHENTICATION_REQUIRED');
  });

  it('N11C5E-PROVIDER-ERROR-10: CALLER_NOT_AUTHORIZED canónico → CALLER_NOT_AUTHORIZED', () => {
    expect(mapProviderError({ error_code: 'CALLER_NOT_AUTHORIZED' })).toBe('CALLER_NOT_AUTHORIZED');
  });

  it('N11C5E-PROVIDER-ERROR-11: FEATURE_DISABLED canónico → FEATURE_DISABLED', () => {
    expect(mapProviderError({ error_code: 'FEATURE_DISABLED' })).toBe('FEATURE_DISABLED');
  });

  it('N11C5E-PROVIDER-ERROR-12: RESOURCE_NOT_FOUND canónico → RESOURCE_NOT_FOUND', () => {
    expect(mapProviderError({ error_code: 'RESOURCE_NOT_FOUND' })).toBe('RESOURCE_NOT_FOUND');
  });

  it('N11C5E-PROVIDER-ERROR-13: REQUESTER_NOT_ALLOWED canónico → REQUESTER_NOT_ALLOWED', () => {
    expect(mapProviderError({ error_code: 'REQUESTER_NOT_ALLOWED' })).toBe('REQUESTER_NOT_ALLOWED');
  });

  it('N11C5E-PROVIDER-ERROR-14: INVALID_CATEGORY canónico → INVALID_CATEGORY', () => {
    expect(mapProviderError({ error_code: 'INVALID_CATEGORY' })).toBe('INVALID_CATEGORY');
  });

  it('N11C5E-PROVIDER-ERROR-15: INVALID_PRIORITY canónico → INVALID_PRIORITY', () => {
    expect(mapProviderError({ error_code: 'INVALID_PRIORITY' })).toBe('INVALID_PRIORITY');
  });

  it('N11C5E-PROVIDER-ERROR-16: ATTACHMENTS_NOT_SUPPORTED canónico → ATTACHMENTS_NOT_SUPPORTED', () => {
    expect(mapProviderError({ error_code: 'ATTACHMENTS_NOT_SUPPORTED' })).toBe('ATTACHMENTS_NOT_SUPPORTED');
  });

  it('N11C5E-PROVIDER-ERROR-17: RATE_LIMITED canónico → RATE_LIMITED', () => {
    expect(mapProviderError({ error_code: 'RATE_LIMITED' })).toBe('RATE_LIMITED');
  });

  it('N11C5E-PROVIDER-ERROR-18: DEPENDENCY_UNAVAILABLE canónico → DEPENDENCY_UNAVAILABLE', () => {
    expect(mapProviderError({ error_code: 'DEPENDENCY_UNAVAILABLE' })).toBe('DEPENDENCY_UNAVAILABLE');
  });

  it('N11C5E-PROVIDER-ERROR-19: PROVIDER_TIMEOUT canónico → PROVIDER_TIMEOUT', () => {
    expect(mapProviderError({ error_code: 'PROVIDER_TIMEOUT' })).toBe('PROVIDER_TIMEOUT');
  });

  it('N11C5E-PROVIDER-ERROR-20: INTERNAL_ERROR canónico → INTERNAL_ERROR', () => {
    expect(mapProviderError({ error_code: 'INTERNAL_ERROR' })).toBe('INTERNAL_ERROR');
  });

  // ── Tests adversariales adicionales ──────────────────────────────────────────

  it('N11C5E-PROVIDER-ERROR-21: undefined explícito → INTERNAL_ERROR', () => {
    expect(mapProviderError(undefined)).toBe('INTERNAL_ERROR');
  });

  it('N11C5E-PROVIDER-ERROR-22: Error nativo → INTERNAL_ERROR (no propagar stack)', () => {
    expect(mapProviderError(new Error('network error'))).toBe('INTERNAL_ERROR');
  });

  it('N11C5E-PROVIDER-ERROR-23: token en message — código canónico pasa, message ignorado', () => {
    const result = mapProviderError({ error_code: 'VALIDATION_ERROR', message: 'Bearer sk-test-abc123' });
    expect(result).toBe('VALIDATION_ERROR');
    expect(typeof result).toBe('string');
  });

  it('N11C5E-PROVIDER-ERROR-24: stack presente — código canónico pasa, stack ignorado', () => {
    const result = mapProviderError({ error_code: 'INTERNAL_ERROR', stack: 'at Error (handler.ts:42)' });
    expect(result).toBe('INTERNAL_ERROR');
  });

  it('N11C5E-PROVIDER-ERROR-25: objeto raw response-like con código desconocido → INTERNAL_ERROR', () => {
    const rawResponse = { status: 500, body: 'Internal Server Error', error_code: 'UNEXPECTED_RUNTIME_ERROR' };
    expect(mapProviderError(rawResponse)).toBe('INTERNAL_ERROR');
  });
});
