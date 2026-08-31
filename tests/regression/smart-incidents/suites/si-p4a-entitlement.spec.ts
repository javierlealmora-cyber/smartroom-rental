/**
 * si-p4a-entitlement.spec.ts — Suite de regresión SI-P4A.
 *
 * Frontera offline de entitlement del provider Smart Incidents.
 *
 * Cubre:
 *   Suite 1 — evaluateIncidentEntitlement: Matriz completa de 8 combinaciones de gates (8 tests)
 *   Suite 2 — evaluateIncidentEntitlement: Propiedades del evaluador puro (4 tests)
 *   Suite 3 — checkIncidentEntitlement: Comportamiento del puerto (7 tests)
 *   Suite 4 — checkIncidentEntitlement: Validación de inputs adversariales (10 tests)
 *   Suite 5 — checkIncidentEntitlement: Opacidad del resultado (6 tests)
 *   Suite 6 — Separación conceptual y ausencia de conv_* (7 tests)
 *
 * Total: 42 tests
 *
 * Restricciones verificadas:
 *   - Sin Supabase, service_role, tablas, persistencia ni despliegues.
 *   - Sin adaptadores concretos ni imports de SmartConversations.
 *   - Sin referencias a conv_* en los ficheros de entitlement.
 *   - DEPENDENCY_UNAVAILABLE y INTERNAL_ERROR del port nunca se convierten en FEATURE_DISABLED.
 *
 * (Fuente: SI-P4A §7 §8 §9 §10 §11)
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  checkIncidentEntitlement,
  evaluateIncidentEntitlement,
} from '../../../../supabase/functions/_shared/smart-incidents/entitlement-policy.ts';
import type { IncidentEntitlementPort } from '../../../../supabase/functions/_shared/smart-incidents/entitlement-port.ts';
import type {
  IncidentEntitlementCheckRequest,
  IncidentEntitlementPortResult,
  IncidentEntitlementSnapshot,
} from '../../../../supabase/functions/_shared/smart-incidents/entitlement-types.ts';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_ACCOUNT_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

const VALID_REQUEST: IncidentEntitlementCheckRequest = {
  client_account_id: VALID_ACCOUNT_ID,
  operation: 'create_incident',
  source_channel: 'whatsapp',
};

const ALL_GATES_ACTIVE: IncidentEntitlementSnapshot = {
  smart_incidents_subscription_active: true,
  incident_creation_capability_active: true,
  source_channel_active: true,
};

const ALL_GATES_INACTIVE: IncidentEntitlementSnapshot = {
  smart_incidents_subscription_active: false,
  incident_creation_capability_active: false,
  source_channel_active: false,
};

// ─── Factories ────────────────────────────────────────────────────────────────

type SpyPort = IncidentEntitlementPort & { calls: IncidentEntitlementCheckRequest[] };

function makePort(result: IncidentEntitlementPortResult): SpyPort {
  const calls: IncidentEntitlementCheckRequest[] = [];
  return {
    calls,
    async getEntitlementSnapshot(req) {
      calls.push(req);
      return result;
    },
  };
}

function makeSuccessPort(snapshot: IncidentEntitlementSnapshot = ALL_GATES_ACTIVE): SpyPort {
  return makePort({ ok: true, snapshot });
}

function makeThrowingPort(message: string): SpyPort {
  const calls: IncidentEntitlementCheckRequest[] = [];
  return {
    calls,
    async getEntitlementSnapshot(req) {
      calls.push(req);
      throw new Error(message);
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1 — evaluateIncidentEntitlement: Matriz de 8 combinaciones de gates
// ─────────────────────────────────────────────────────────────────────────────

describe('SI-P4A — evaluateIncidentEntitlement: Matriz de 8 combinaciones de gates', () => {
  const T = true;
  const F = false;

  it('[TTT] subscription=T capability=T channel=T → ok: true', () => {
    const result = evaluateIncidentEntitlement({
      smart_incidents_subscription_active: T,
      incident_creation_capability_active: T,
      source_channel_active: T,
    });
    expect(result.ok).toBe(true);
  });

  it('[TTF] subscription=T capability=T channel=F → FEATURE_DISABLED', () => {
    const result = evaluateIncidentEntitlement({
      smart_incidents_subscription_active: T,
      incident_creation_capability_active: T,
      source_channel_active: F,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('FEATURE_DISABLED');
  });

  it('[TFT] subscription=T capability=F channel=T → FEATURE_DISABLED', () => {
    const result = evaluateIncidentEntitlement({
      smart_incidents_subscription_active: T,
      incident_creation_capability_active: F,
      source_channel_active: T,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('FEATURE_DISABLED');
  });

  it('[TFF] subscription=T capability=F channel=F → FEATURE_DISABLED', () => {
    const result = evaluateIncidentEntitlement({
      smart_incidents_subscription_active: T,
      incident_creation_capability_active: F,
      source_channel_active: F,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('FEATURE_DISABLED');
  });

  it('[FTT] subscription=F capability=T channel=T → FEATURE_DISABLED', () => {
    const result = evaluateIncidentEntitlement({
      smart_incidents_subscription_active: F,
      incident_creation_capability_active: T,
      source_channel_active: T,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('FEATURE_DISABLED');
  });

  it('[FTF] subscription=F capability=T channel=F → FEATURE_DISABLED', () => {
    const result = evaluateIncidentEntitlement({
      smart_incidents_subscription_active: F,
      incident_creation_capability_active: T,
      source_channel_active: F,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('FEATURE_DISABLED');
  });

  it('[FFT] subscription=F capability=F channel=T → FEATURE_DISABLED', () => {
    const result = evaluateIncidentEntitlement({
      smart_incidents_subscription_active: F,
      incident_creation_capability_active: F,
      source_channel_active: T,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('FEATURE_DISABLED');
  });

  it('[FFF] subscription=F capability=F channel=F → FEATURE_DISABLED', () => {
    const result = evaluateIncidentEntitlement({
      smart_incidents_subscription_active: F,
      incident_creation_capability_active: F,
      source_channel_active: F,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('FEATURE_DISABLED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2 — evaluateIncidentEntitlement: Propiedades del evaluador puro
// ─────────────────────────────────────────────────────────────────────────────

describe('SI-P4A — evaluateIncidentEntitlement: Propiedades del evaluador puro', () => {
  it('es determinista: mismo input → mismo output (pureza)', () => {
    const snap: IncidentEntitlementSnapshot = {
      smart_incidents_subscription_active: true,
      incident_creation_capability_active: false,
      source_channel_active: true,
    };
    const r1 = evaluateIncidentEntitlement(snap);
    const r2 = evaluateIncidentEntitlement(snap);
    expect(r1).toEqual(r2);
  });

  it('resultado ok:true no contiene error_code', () => {
    const result = evaluateIncidentEntitlement(ALL_GATES_ACTIVE);
    expect(result.ok).toBe(true);
    expect(result).not.toHaveProperty('error_code');
  });

  it('resultado ok:false contiene exactamente error_code FEATURE_DISABLED (no otros campos)', () => {
    const result = evaluateIncidentEntitlement(ALL_GATES_INACTIVE);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('FEATURE_DISABLED');
      // El resultado opaco solo tiene ok y error_code; sin campos de diagnóstico.
      expect(Object.keys(result)).toHaveLength(2);
    }
  });

  it('resultado ok:false no expone ningún valor del snapshot', () => {
    const result = evaluateIncidentEntitlement(ALL_GATES_INACTIVE);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('smart_incidents_subscription_active');
    expect(serialized).not.toContain('incident_creation_capability_active');
    expect(serialized).not.toContain('source_channel_active');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3 — checkIncidentEntitlement: Comportamiento del puerto
// ─────────────────────────────────────────────────────────────────────────────

describe('SI-P4A — checkIncidentEntitlement: Comportamiento del puerto', () => {
  it('port invocado exactamente una vez por llamada', async () => {
    const port = makeSuccessPort();
    await checkIncidentEntitlement(VALID_REQUEST, port);
    expect(port.calls).toHaveLength(1);
  });

  it('port recibe el request exacto (misma referencia)', async () => {
    const port = makeSuccessPort();
    await checkIncidentEntitlement(VALID_REQUEST, port);
    expect(port.calls[0]).toBe(VALID_REQUEST);
  });

  it('snapshot con todos los gates activos → resultado ok: true', async () => {
    const port = makeSuccessPort(ALL_GATES_ACTIVE);
    const result = await checkIncidentEntitlement(VALID_REQUEST, port);
    expect(result.ok).toBe(true);
  });

  it('port devuelve DEPENDENCY_UNAVAILABLE → resultado DEPENDENCY_UNAVAILABLE', async () => {
    const port = makePort({ ok: false, error_code: 'DEPENDENCY_UNAVAILABLE' });
    const result = await checkIncidentEntitlement(VALID_REQUEST, port);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('DEPENDENCY_UNAVAILABLE');
  });

  it('port devuelve INTERNAL_ERROR → resultado INTERNAL_ERROR', async () => {
    const port = makePort({ ok: false, error_code: 'INTERNAL_ERROR' });
    const result = await checkIncidentEntitlement(VALID_REQUEST, port);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('INTERNAL_ERROR');
  });

  it('excepción inesperada del port → resultado INTERNAL_ERROR sin propagar excepción', async () => {
    const port = makeThrowingPort('Database connection refused: pg_pool timeout');
    const result = await checkIncidentEntitlement(VALID_REQUEST, port);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('INTERNAL_ERROR');
  });

  it('mensaje de excepción del port no aparece en el resultado', async () => {
    const SECRET = 'PORT_SECRET_CRASH_XQZ7_INTERNAL_MESSAGE';
    const port = makeThrowingPort(SECRET);
    const result = await checkIncidentEntitlement(VALID_REQUEST, port);
    expect(JSON.stringify(result)).not.toContain(SECRET);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4 — checkIncidentEntitlement: Validación de inputs adversariales
// ─────────────────────────────────────────────────────────────────────────────

describe('SI-P4A — checkIncidentEntitlement: Validación de inputs adversariales', () => {
  it('UUID válido en client_account_id → port es invocado', async () => {
    const port = makeSuccessPort();
    await checkIncidentEntitlement(
      { ...VALID_REQUEST, client_account_id: 'f1e2d3c4-0001-4002-8003-000000000010' },
      port,
    );
    expect(port.calls).toHaveLength(1);
  });

  it('UUID inválido en client_account_id → INTERNAL_ERROR, port no invocado', async () => {
    const port = makeSuccessPort();
    const result = await checkIncidentEntitlement(
      { ...VALID_REQUEST, client_account_id: 'not-a-uuid' },
      port,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('INTERNAL_ERROR');
    expect(port.calls).toHaveLength(0);
  });

  it('client_account_id vacío → INTERNAL_ERROR, port no invocado', async () => {
    const port = makeSuccessPort();
    const result = await checkIncidentEntitlement(
      { ...VALID_REQUEST, client_account_id: '' },
      port,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('INTERNAL_ERROR');
    expect(port.calls).toHaveLength(0);
  });

  it('operation === "create_incident" → port es invocado', async () => {
    const port = makeSuccessPort();
    await checkIncidentEntitlement(VALID_REQUEST, port);
    expect(port.calls).toHaveLength(1);
  });

  it('operation desconocida → INTERNAL_ERROR, port no invocado', async () => {
    const port = makeSuccessPort();
    const result = await checkIncidentEntitlement(
      { ...VALID_REQUEST, operation: 'delete_incident' } as unknown as IncidentEntitlementCheckRequest,
      port,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('INTERNAL_ERROR');
    expect(port.calls).toHaveLength(0);
  });

  it('source_channel "whatsapp" → port invocado', async () => {
    const port = makeSuccessPort();
    await checkIncidentEntitlement({ ...VALID_REQUEST, source_channel: 'whatsapp' }, port);
    expect(port.calls).toHaveLength(1);
  });

  it('source_channel "webchat" → port invocado', async () => {
    const port = makeSuccessPort();
    await checkIncidentEntitlement({ ...VALID_REQUEST, source_channel: 'webchat' }, port);
    expect(port.calls).toHaveLength(1);
  });

  it('canal desconocido → INTERNAL_ERROR, port no invocado', async () => {
    const port = makeSuccessPort();
    const result = await checkIncidentEntitlement(
      { ...VALID_REQUEST, source_channel: 'sms' } as unknown as IncidentEntitlementCheckRequest,
      port,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('INTERNAL_ERROR');
    expect(port.calls).toHaveLength(0);
  });

  it('input null → INTERNAL_ERROR sin lanzar excepción al caller', async () => {
    const port = makeSuccessPort();
    const result = await checkIncidentEntitlement(
      null as unknown as IncidentEntitlementCheckRequest,
      port,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('INTERNAL_ERROR');
  });

  it('input undefined → INTERNAL_ERROR sin lanzar excepción al caller', async () => {
    const port = makeSuccessPort();
    const result = await checkIncidentEntitlement(
      undefined as unknown as IncidentEntitlementCheckRequest,
      port,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('INTERNAL_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 5 — checkIncidentEntitlement: Opacidad del resultado
// ─────────────────────────────────────────────────────────────────────────────

describe('SI-P4A — checkIncidentEntitlement: Opacidad del resultado', () => {
  it('FEATURE_DISABLED no contiene valores del snapshot en el resultado', async () => {
    const port = makeSuccessPort(ALL_GATES_INACTIVE);
    const result = await checkIncidentEntitlement(VALID_REQUEST, port);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('smart_incidents_subscription_active');
    expect(serialized).not.toContain('incident_creation_capability_active');
    expect(serialized).not.toContain('source_channel_active');
  });

  it('FEATURE_DISABLED no contiene nombres de los gates en el resultado', async () => {
    const port = makeSuccessPort(ALL_GATES_INACTIVE);
    const result = await checkIncidentEntitlement(VALID_REQUEST, port);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('subscription');
    expect(serialized).not.toContain('capability');
    expect(serialized).not.toContain('channel_active');
  });

  it('FEATURE_DISABLED no contiene el valor de client_account_id', async () => {
    const port = makeSuccessPort(ALL_GATES_INACTIVE);
    const result = await checkIncidentEntitlement(VALID_REQUEST, port);
    expect(JSON.stringify(result)).not.toContain(VALID_ACCOUNT_ID);
  });

  it('FEATURE_DISABLED no contiene el canal solicitado', async () => {
    const port = makeSuccessPort(ALL_GATES_INACTIVE);
    const result = await checkIncidentEntitlement({ ...VALID_REQUEST, source_channel: 'webchat' }, port);
    expect(JSON.stringify(result)).not.toContain('webchat');
  });

  it('fallo técnico DEPENDENCY_UNAVAILABLE no se convierte en FEATURE_DISABLED', async () => {
    const port = makePort({ ok: false, error_code: 'DEPENDENCY_UNAVAILABLE' });
    const result = await checkIncidentEntitlement(VALID_REQUEST, port);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).not.toBe('FEATURE_DISABLED');
      expect(result.error_code).toBe('DEPENDENCY_UNAVAILABLE');
    }
  });

  it('excepción del port → INTERNAL_ERROR (nunca FEATURE_DISABLED)', async () => {
    const port = makeThrowingPort('Unexpected crash at infrastructure level');
    const result = await checkIncidentEntitlement(VALID_REQUEST, port);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('INTERNAL_ERROR');
      expect(result.error_code).not.toBe('FEATURE_DISABLED');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 6 — Separación conceptual y ausencia de conv_*
// ─────────────────────────────────────────────────────────────────────────────

describe('SI-P4A — Separación conceptual y ausencia de conv_*', () => {
  // Runtime: el request no requiere campos de identidad de dominio

  it('IncidentEntitlementCheckRequest no requiere requester_profile_id', async () => {
    const port = makeSuccessPort();
    // Construcción sin requester_profile_id: TypeScript valida que el tipo no lo necesita.
    const req: IncidentEntitlementCheckRequest = {
      client_account_id: VALID_ACCOUNT_ID,
      operation: 'create_incident',
      source_channel: 'whatsapp',
    };
    const result = await checkIncidentEntitlement(req, port);
    expect(result.ok).toBe(true);
  });

  it('IncidentEntitlementCheckRequest no requiere accommodation_id', async () => {
    const port = makeSuccessPort();
    const req: IncidentEntitlementCheckRequest = {
      client_account_id: VALID_ACCOUNT_ID,
      operation: 'create_incident',
      source_channel: 'webchat',
    };
    const result = await checkIncidentEntitlement(req, port);
    expect(result.ok).toBe(true);
  });

  it('IncidentEntitlementCheckRequest no requiere room_id', async () => {
    const port = makeSuccessPort();
    // El tipo no tiene room_id; el test verifica que la función opera sin él.
    const req: IncidentEntitlementCheckRequest = {
      client_account_id: VALID_ACCOUNT_ID,
      operation: 'create_incident',
      source_channel: 'whatsapp',
    };
    const result = await checkIncidentEntitlement(req, port);
    expect(result.ok).toBe(true);
  });

  it('IncidentEntitlementCheckRequest no incluye Authorization ni headers HTTP', () => {
    const req: IncidentEntitlementCheckRequest = {
      client_account_id: VALID_ACCOUNT_ID,
      operation: 'create_incident',
      source_channel: 'whatsapp',
    };
    const keys = Object.keys(req);
    // Solo tres campos; sin auth headers ni campos HTTP.
    expect(keys).toHaveLength(3);
    expect(keys).not.toContain('Authorization');
    expect(keys).not.toContain('authorizationHeader');
    expect(keys).not.toContain('headers');
  });

  it('port solo recibe los tres campos del request (sin auth ni dominio)', async () => {
    const port = makeSuccessPort();
    await checkIncidentEntitlement(VALID_REQUEST, port);
    const received = port.calls[0];
    expect(Object.keys(received).sort()).toEqual(
      ['client_account_id', 'operation', 'source_channel'].sort(),
    );
    expect(received).not.toHaveProperty('authorizationHeader');
    expect(received).not.toHaveProperty('requester_profile_id');
    expect(received).not.toHaveProperty('accommodation_id');
    expect(received).not.toHaveProperty('room_id');
  });

  // Structural: los ficheros de entitlement no importan SmartConversations ni usan conv_*

  const ENTITLEMENT_FILES = [
    'supabase/functions/_shared/smart-incidents/entitlement-types.ts',
    'supabase/functions/_shared/smart-incidents/entitlement-port.ts',
    'supabase/functions/_shared/smart-incidents/entitlement-policy.ts',
  ];

  it('ninguna importación desde SmartConversations en ficheros de entitlement (test estructural)', () => {
    for (const file of ENTITLEMENT_FILES) {
      const source = readFileSync(join(process.cwd(), file), 'utf-8');
      expect(source, `${file} — no debe importar smart-conversations`).not.toContain(
        'smart-conversations',
      );
      expect(source, `${file} — no debe importar smart_conversations`).not.toContain(
        'smart_conversations',
      );
    }
  });

  it('ninguna referencia a conv_* en ficheros de entitlement (test estructural)', () => {
    for (const file of ENTITLEMENT_FILES) {
      const source = readFileSync(join(process.cwd(), file), 'utf-8');
      expect(source, `${file} — no debe referenciar conv_`).not.toMatch(/conv_/);
    }
  });
});
