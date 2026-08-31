/**
 * incidents-provider-alignment-adversarial.spec.ts — Fase 11C5E-IMPLEMENTATION (Suite 4/4)
 * Tests de seguridad y casos adversariales.
 *
 * OFFLINE ONLY: Importa funciones reales y verifica que rechazan entradas maliciosas.
 * Cubre: HTML injection, attacker urgency, attacker actor, PII leaks, identity bypass.
 *
 * Total: 28 tests activos (sin it.todo).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../../../');
const SHARED = 'supabase/functions/_shared/smart-conversations';
const ADAPTERS = `${SHARED}/adapters`;

function src(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function strip(s: string): string {
  return s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
}

import {
  mapUrgencyToPriority,
  UrgencyMappingError,
} from '../../../../../supabase/functions/_shared/smart-conversations/adapters/incidents-priority-mapper.ts';

import {
  generateIncidentTitle,
  normalizeTitle,
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
} from '../../../../../supabase/functions/_shared/smart-conversations/adapters/incidents-requester-resolver.ts';

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-ADV-URGENCY — Attacker intenta inyectar urgencia no contractual
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-ADV-URGENCY — Urgencia adversarial', () => {
  it('N11C5E-ADV-URGENCY-01: critical → rechazado (no invocar provider)', () => {
    expect(() => mapUrgencyToPriority('critical')).toThrow(UrgencyMappingError);
  });

  it('N11C5E-ADV-URGENCY-02: CRITICAL (uppercase) → rechazado', () => {
    expect(() => mapUrgencyToPriority('CRITICAL')).toThrow(UrgencyMappingError);
  });

  it('N11C5E-ADV-URGENCY-03: emergency → rechazado', () => {
    expect(() => mapUrgencyToPriority('emergency')).toThrow(UrgencyMappingError);
  });

  it('N11C5E-ADV-URGENCY-04: URGENT (no es valor SC, es valor provider) → rechazado', () => {
    // 'urgent' NO es un valor urgency_proposal válido (es un valor priority del provider)
    expect(() => mapUrgencyToPriority('urgent')).toThrow(UrgencyMappingError);
  });

  it('N11C5E-ADV-URGENCY-05: HIGH (wrong case) → rechazado', () => {
    expect(() => mapUrgencyToPriority('HIGH')).toThrow(UrgencyMappingError);
  });

  it('N11C5E-ADV-URGENCY-06: string SQL injection → rechazado', () => {
    expect(() => mapUrgencyToPriority("high'; DROP TABLE incidents--")).toThrow(UrgencyMappingError);
  });

  it('N11C5E-ADV-URGENCY-07: priority-mapper no define critical en su tabla', () => {
    expect(src(`${ADAPTERS}/incidents-priority-mapper.ts`)).not.toMatch(/critical\s*:/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-ADV-TITLE — Attacker intenta inyectar contenido malicioso en título
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-ADV-TITLE — Título adversarial', () => {
  it('N11C5E-ADV-TITLE-01: script injection eliminado en normalizeTitle', () => {
    const result = normalizeTitle('<script>alert("xss")</script>Mantenimiento');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
    expect(result).toContain('Mantenimiento');
  });

  it('N11C5E-ADV-TITLE-02: img tag con onerror eliminado', () => {
    const result = normalizeTitle('<img src=x onerror=alert(1)>Ruido');
    expect(result).not.toContain('<img');
    expect(result).not.toContain('onerror');
  });

  it('N11C5E-ADV-TITLE-03: href injection eliminado', () => {
    const result = normalizeTitle('<a href="javascript:void">texto</a>');
    expect(result).not.toContain('<a');
    expect(result).not.toContain('href');
  });

  it('N11C5E-ADV-TITLE-04: null byte eliminado', () => {
    const result = normalizeTitle('hola\x00mundo');
    expect(result).not.toContain('\x00');
  });

  it('N11C5E-ADV-TITLE-05: salto de línea normalizado (no en título final)', () => {
    const result = normalizeTitle('línea1\nlínea2');
    expect(result).not.toContain('\n');
    expect(result).toBe('línea1 línea2');
  });

  it('N11C5E-ADV-TITLE-06: propuesta con FORBIDDEN_TITLE → fallback determinista', () => {
    const t = generateIncidentTitle('maintenance', 'descripción real', FORBIDDEN_TITLE);
    expect(t).not.toBe(FORBIDDEN_TITLE);
    expect(t.length).toBeGreaterThanOrEqual(5);
  });

  it('N11C5E-ADV-TITLE-07: output nunca supera 120 chars con input adversarial', () => {
    const evilTitle = 'A'.repeat(1000);
    const t = generateIncidentTitle('noise', 'desc', evilTitle);
    expect(t.length).toBeLessThanOrEqual(120);
  });

  it('N11C5E-ADV-TITLE-08: output nunca es vacío — siempre ≥ 5 chars', () => {
    const t = generateIncidentTitle('maintenance', 'caldera rota');
    expect(t.length).toBeGreaterThanOrEqual(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-ADV-ACTOR — Attacker intenta usar actor no autorizado para incidencias
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-ADV-ACTOR — Actor adversarial', () => {
  it('N11C5E-ADV-ACTOR-01: tenant_profile rechazado por mapper', () => {
    const actor = { type: 'tenant_profile' as const, profile_id: 'attacker-profile' };
    expect(() => mapCanonicalActorToSmartIncidentsActor(actor)).toThrow(ActorMappingError);
  });

  it('N11C5E-ADV-ACTOR-02: unverified_lead rechazado por mapper', () => {
    const actor = { type: 'unverified_lead' as const };
    expect(() => mapCanonicalActorToSmartIncidentsActor(actor)).toThrow(ActorMappingError);
  });

  it('N11C5E-ADV-ACTOR-03: tipo desconocido rechazado por mapper', () => {
    const actor = { type: 'admin' as unknown } as Parameters<typeof mapCanonicalActorToSmartIncidentsActor>[0];
    expect(() => mapCanonicalActorToSmartIncidentsActor(actor)).toThrow(ActorMappingError);
  });

  it('N11C5E-ADV-ACTOR-04: resultado no contiene profile_id del actor', () => {
    const actor = { type: 'system_service' as const, service_name: 'conv-wf20' };
    const result = mapCanonicalActorToSmartIncidentsActor(actor);
    expect(JSON.stringify(result)).not.toContain('profile_id');
  });

  it('N11C5E-ADV-ACTOR-05: resultado no contiene identity_level', () => {
    const actor = { type: 'system_service' as const, service_name: 'conv-wf20' };
    const result = mapCanonicalActorToSmartIncidentsActor(actor);
    expect(JSON.stringify(result)).not.toContain('identity_level');
  });

  it('N11C5E-ADV-ACTOR-06: resultado no contiene STRONG_MATCH_ACTIVE', () => {
    const actor = { type: 'system_service' as const, service_name: 'conv-wf20' };
    const result = mapCanonicalActorToSmartIncidentsActor(actor);
    expect(JSON.stringify(result)).not.toContain('STRONG_MATCH_ACTIVE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-ADV-IDENTITY — Attacker intenta bypassear verificación de identidad
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-ADV-IDENTITY — Identity bypass adversarial', () => {
  it('N11C5E-ADV-IDENTITY-01: PARTIAL_MATCH_ACTIVE rechazado', async () => {
    const loader = {
      loadSessionContext: async () => ({
        identity_level: 'PARTIAL_MATCH_ACTIVE',
        profile_id: 'profile-attacker',
        accommodation_id: 'acc-xyz',
        room_id: null,
        source_channel: 'whatsapp',
      }),
    };
    await expect(
      resolveIncidentRequesterContext('case-1', 'tenant-1', loader)
    ).rejects.toThrow(RequesterIdentityError);
  });

  it('N11C5E-ADV-IDENTITY-02: NO_MATCH rechazado', async () => {
    const loader = {
      loadSessionContext: async () => ({
        identity_level: 'NO_MATCH',
        profile_id: 'profile-attacker',
        accommodation_id: 'acc-xyz',
        room_id: null,
        source_channel: 'whatsapp',
      }),
    };
    await expect(
      resolveIncidentRequesterContext('case-1', 'tenant-1', loader)
    ).rejects.toThrow(RequesterIdentityError);
  });

  it('N11C5E-ADV-IDENTITY-03: MATCH_INACTIVE rechazado', async () => {
    const loader = {
      loadSessionContext: async () => ({
        identity_level: 'MATCH_INACTIVE',
        profile_id: 'profile-valid',
        accommodation_id: 'acc-xyz',
        room_id: null,
        source_channel: 'whatsapp',
      }),
    };
    await expect(
      resolveIncidentRequesterContext('case-1', 'tenant-1', loader)
    ).rejects.toThrow(RequesterIdentityError);
  });

  it('N11C5E-ADV-IDENTITY-04: identity_level vacío rechazado', async () => {
    const loader = {
      loadSessionContext: async () => ({
        identity_level: '',
        profile_id: 'profile-valid',
        accommodation_id: 'acc-xyz',
        room_id: null,
        source_channel: 'whatsapp',
      }),
    };
    await expect(
      resolveIncidentRequesterContext('case-1', 'tenant-1', loader)
    ).rejects.toThrow(RequesterIdentityError);
  });

  it('N11C5E-ADV-IDENTITY-05: adapters/incidents-requester-resolver no consulta DB directamente', () => {
    const code = src(`${ADAPTERS}/incidents-requester-resolver.ts`);
    // El resolver NO importa supabase directamente — usa loader inyectable
    expect(code).not.toContain('createClient');
    expect(code).not.toContain('supabaseInvoke');
    expect(code).not.toContain('SUPABASE_SERVICE_ROLE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-ADV-PRIVACY — Campos PII prohibidos
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-ADV-PRIVACY — PII no sale al provider', () => {
  it('N11C5E-ADV-PRIVACY-01: INCIDENT_FORBIDDEN_OUTPUT_FIELDS incluye phone', () => {
    expect(src(`${SHARED}/incidents-integration-port.ts`)).toContain("'phone'");
  });

  it('N11C5E-ADV-PRIVACY-02: INCIDENT_FORBIDDEN_OUTPUT_FIELDS incluye email', () => {
    expect(src(`${SHARED}/incidents-integration-port.ts`)).toContain("'email'");
  });

  it('N11C5E-ADV-PRIVACY-03: INCIDENT_FORBIDDEN_OUTPUT_FIELDS incluye wa_jid', () => {
    expect(src(`${SHARED}/incidents-integration-port.ts`)).toContain("'wa_jid'");
  });

  it('N11C5E-ADV-PRIVACY-04: adapter no serializa identity_data en el outgoing payload', () => {
    const code = strip(src(`${ADAPTERS}/incidents-addon-adapter.ts`));
    expect(code).not.toMatch(/identity_data\s*:/);
  });

  it('N11C5E-ADV-PRIVACY-05: adapter no serializa raw_payload en outgoing', () => {
    const code = strip(src(`${ADAPTERS}/incidents-addon-adapter.ts`));
    expect(code).not.toMatch(/raw_payload\s*:/);
  });

  it('N11C5E-ADV-PRIVACY-06: external_request_reference siempre es null (no conv_case_id expuesto)', () => {
    const adapter = src(`${ADAPTERS}/incidents-addon-adapter.ts`);
    expect(adapter).toContain('external_request_reference: null');
  });
});
