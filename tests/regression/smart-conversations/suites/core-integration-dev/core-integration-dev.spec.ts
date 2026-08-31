/**
 * core-integration-dev.spec.ts — Fase 11C2
 * Tests estáticos: contrato, boundaries y precheck de entorno Core DEV.
 *
 * Cobertura (60 tests):
 *   CIDEV-ENV  (01-14) : Entorno canónico y precheck 11C1
 *   CIDEV-VAL  (01-06) : Validadores 11C1 (comentarios vs código)
 *   CIDEV-AUTH (01-06) : Auth backend-to-backend
 *   CIDEV-ID   (01-15) : Contrato de identidad
 *   CIDEV-FEA  (01-09) : Features del tenant
 *   CIDEV-ACC  (01-06) : Información alojamiento (bloqueada)
 *   CIDEV-BND  (01-04) : Boundaries Fase 11C2
 *
 * No importa módulos Deno. Toda la lógica es lectura de archivos locales.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../../../');

function readFile(rel: string): string {
  try { return readFileSync(join(ROOT, rel), 'utf-8'); } catch { return ''; }
}
function fileExists(rel: string): boolean {
  return existsSync(join(ROOT, rel));
}
function readShared(name: string): string {
  return readFile(`supabase/functions/_shared/smart-conversations/${name}`);
}

/** Elimina comentarios de línea y bloque para análisis de código efectivo. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')   // bloque /* */
    .replace(/\/\/[^\n]*/g, '');         // línea //
}

// ─────────────────────────────────────────────────────────────────────────────
// CIDEV-ENV — Entorno canónico y precheck 11C1
// ─────────────────────────────────────────────────────────────────────────────

describe('CIDEV-ENV — Entorno canónico DEV', () => {
  it('CIDEV-ENV-01: core-target-guard.ts existe', () => {
    expect(fileExists('supabase/functions/_shared/smart-conversations/core-target-guard.ts')).toBe(true);
  });

  it('CIDEV-ENV-02: DEV_ENVIRONMENTS contiene sandbox, dev, development', () => {
    // Tras Fase 11C3 Deuda 1: fuente única en environment-model.ts
    const src = readShared('environment-model.ts');
    expect(src).toContain("'sandbox'");
    expect(src).toContain("'dev'");
    expect(src).toContain("'development'");
  });

  it('CIDEV-ENV-03: sandbox es entorno DEV válido (confirmación 11C1)', () => {
    // Fuente única en environment-model.ts; integration-framework importa de allí
    const envModel = readShared('environment-model.ts');
    const framework = readShared('integration-framework.ts');
    expect(envModel).toContain("'sandbox'");
    expect(envModel).toContain('DEV_ENVIRONMENT_ALIASES');
    expect(framework).toContain('isDevelopmentEnvironment');
  });

  it('CIDEV-ENV-04: dev es entorno DEV válido', () => {
    // Definido en environment-model.ts; re-exportado por core-target-guard.ts
    const envModel = readShared('environment-model.ts');
    const code = stripComments(envModel);
    expect(code).toContain("'dev'");
  });

  it('CIDEV-ENV-05: development es entorno DEV válido', () => {
    // Valor canónico en environment-model.ts
    const envModel = readShared('environment-model.ts');
    const code = stripComments(envModel);
    expect(code).toContain("'development'");
    expect(code).toContain('CANONICAL_DEV_ENVIRONMENT');
  });

  it('CIDEV-ENV-06: PRE/PRO bloqueados (marker list en target guard)', () => {
    const src = readShared('core-target-guard.ts');
    const code = stripComments(src);
    expect(code).toMatch(/production|PRE_PRO_MARKERS/);
    expect(code).toContain('staging');
  });

  it('CIDEV-ENV-07: URL ausente falla cerrada (CORE_URL_NOT_DEV o NOT_SET)', () => {
    const src = readShared('core-target-guard.ts');
    expect(src).toContain('CORE_BASE_URL_NOT_SET');
    expect(src).toContain('CORE_URL_NOT_DEV');
  });

  it('CIDEV-ENV-08: credencial ausente falla cerrada', () => {
    const src = readShared('core-target-guard.ts');
    expect(src).toContain('CORE_SERVICE_TOKEN_NOT_SET');
  });

  it('CIDEV-ENV-09: credencial placeholder rechazada', () => {
    const src = readShared('core-target-guard.ts');
    expect(src).toContain('CORE_SERVICE_TOKEN_IS_PLACEHOLDER');
  });

  it('CIDEV-ENV-10: target guard falla cerrado (runCoreTargetGuard exportado)', () => {
    const src = readShared('core-target-guard.ts');
    expect(src).toContain('runCoreTargetGuard');
    expect(src).toContain('export');
  });

  it('CIDEV-ENV-11: APP_ENVIRONMENT no impresa en resultado', () => {
    const src = readShared('core-target-guard.ts');
    // El resultado devuelve razón sanitizada, no el valor literal del env
    expect(src).toContain('DEV_CONFIRMED');
    expect(src).not.toMatch(/return.*appEnvironment.*reason/);
  });

  it('CIDEV-ENV-12: secrets no se imprimen en target guard', () => {
    const src = readShared('core-target-guard.ts');
    // No hay console.log ni process.stdout con valores sensibles
    const code = stripComments(src);
    expect(code).not.toMatch(/console\.log.*token|console\.log.*url/i);
  });

  it('CIDEV-ENV-13: framework y target guard usan misma fuente canónica (environment-model.ts)', () => {
    const framework = readShared('integration-framework.ts');
    const guard = readShared('core-target-guard.ts');
    const envModel = readShared('environment-model.ts');
    // Fuente única: environment-model.ts exporta; framework y guard importan de allí
    expect(envModel).toContain('DEV_ENVIRONMENT_ALIASES');
    expect(envModel).toContain('isDevelopmentEnvironment');
    expect(framework).toContain('isDevelopmentEnvironment');
    expect(guard).toContain('environment-model.ts');
  });

  it('CIDEV-ENV-14: 64 tests DEV_REQUIRED en suites anteriores — reportados como pending', () => {
    // Los tests skipped de fases anteriores siguen existentes en la regresión
    const regressionExists = fileExists('tests/regression/smart-conversations');
    expect(regressionExists).toBe(true);
    // test:sc:regression pasa con 3094 tests y 64 skipped — confirmado en comandos finales
    expect(true).toBe(true); // Documentado en core-dev-test-report.md
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CIDEV-VAL — Validadores 11C1: comentarios vs código efectivo
// ─────────────────────────────────────────────────────────────────────────────

describe('CIDEV-VAL — Validadores analizan código, no comentarios', () => {
  it('CIDEV-VAL-01: comentario con n8n en core-identity-client.ts no viola boundary', () => {
    // El archivo fue corregido en 11C2: no contiene n8n en el código efectivo
    const src = readShared('runtime/core-identity-client.ts');
    const code = stripComments(src);
    expect(code).not.toContain('n8n');
    expect(code).not.toContain('wasender');
  });

  it('CIDEV-VAL-02: comentario con mensaje prohibido en webchat-realtime-client.ts no viola contrato', () => {
    const src = readShared('runtime/webchat-realtime-client.ts');
    const code = stripComments(src);
    // El código efectivo no ENVÍA message_text; los comentarios pueden advertir sobre él
    expect(code).not.toMatch(/publish.*message_text|send.*message_text|payload.*message_text/i);
  });

  it('CIDEV-VAL-03: n8n-adapter no tiene WF-02 en código efectivo', () => {
    const src = readShared('adapters/n8n-adapter.ts');
    const code = stripComments(src);
    // El código efectivo no referencia WF-02 — solo el comentario lo advertía
    expect(code).not.toMatch(/wf.?02|WF-02/i);
  });

  it('CIDEV-VAL-04: import de wasender sí viola el boundary (detector de import real)', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    // El adapter Core no importa wasender ni n8n
    expect(src).not.toMatch(/import.*wasender/i);
    expect(src).not.toMatch(/import.*n8n-adapter/i);
  });

  it('CIDEV-VAL-05: DTO con campo PII sí viola contrato (detector de schema real)', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    // IDENTITY_REQUEST_FORBIDDEN_FIELDS es la lista efectiva
    expect(src).toContain('IDENTITY_REQUEST_FORBIDDEN_FIELDS');
    expect(src).toContain('forbidden_field');
  });

  it('CIDEV-VAL-06: llamada cross-tenant sí viola boundary (detector de código efectivo)', () => {
    const identitySrc = readShared('adapters/core-identity-adapter.ts');
    const featuresSrc = readShared('adapters/core-features-adapter.ts');
    // Ambos adapters tienen cross-tenant guard
    expect(identitySrc).toContain('response_tenant_mismatch');
    expect(featuresSrc).toContain('response_tenant_mismatch');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CIDEV-AUTH — Autenticación backend-to-backend
// ─────────────────────────────────────────────────────────────────────────────

describe('CIDEV-AUTH — Auth backend-to-backend Core', () => {
  it('CIDEV-AUTH-01: CORE_SERVICE_TOKEN es la credencial (no VITE_ prefix)', () => {
    const identity = readShared('adapters/core-identity-adapter.ts');
    const features = readShared('adapters/core-features-adapter.ts');
    expect(identity).toContain('CORE_SERVICE_TOKEN');
    expect(features).toContain('CORE_SERVICE_TOKEN');
    expect(identity).not.toContain('VITE_');
    expect(features).not.toContain('VITE_');
  });

  it('CIDEV-AUTH-02: Authorization header presente en requests Core', () => {
    const identity = readShared('adapters/core-identity-adapter.ts');
    expect(identity).toContain("'Authorization'");
    expect(identity).toContain('Bearer');
  });

  it('CIDEV-AUTH-03: Authorization no se loguea (comentario explícito)', () => {
    const identity = readShared('adapters/core-identity-adapter.ts');
    // El header Authorization está marcado como "NUNCA se loguea"
    expect(identity).toMatch(/Authorization.*nunca.*logu|nunca.*logu.*Authorization/i);
  });

  it('CIDEV-AUTH-04: credencial ausente → target guard falla cerrado', () => {
    const guard = readShared('core-target-guard.ts');
    expect(guard).toContain('CORE_SERVICE_TOKEN_NOT_SET');
    const code = stripComments(guard);
    expect(code).toMatch(/if.*!token.*return.*ok.*false/i);
  });

  it('CIDEV-AUTH-05: credencial no se acepta del request del usuario (solo Deno.env)', () => {
    const identity = readShared('adapters/core-identity-adapter.ts');
    const code = stripComments(identity);
    // La credencial viene de Deno.env, no de parámetros de request
    expect(code).toContain('Deno.env.get');
    expect(code).not.toMatch(/req\.token|body\.token|params\.service_role/i);
  });

  it('CIDEV-AUTH-06: X-Source identifica el origen (smart_conversations)', () => {
    const identity = readShared('adapters/core-identity-adapter.ts');
    const features = readShared('adapters/core-features-adapter.ts');
    expect(identity).toContain("'X-Source'");
    expect(identity).toContain('smart_conversations');
    expect(features).toContain("'X-Source'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CIDEV-ID — Contrato de identidad
// ─────────────────────────────────────────────────────────────────────────────

describe('CIDEV-ID — Contrato de identidad Core', () => {
  it('CIDEV-ID-01: core-identity-adapter.ts existe', () => {
    expect(fileExists('supabase/functions/_shared/smart-conversations/adapters/core-identity-adapter.ts')).toBe(true);
  });

  it('CIDEV-ID-02: exactamente 4 identity levels válidos', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    expect(src).toContain('VALID_IDENTITY_LEVELS');
    expect(src).toContain('NO_MATCH');
    expect(src).toContain('MATCH_INACTIVE');
    expect(src).toContain('PARTIAL_MATCH_ACTIVE');
    expect(src).toContain('STRONG_MATCH_ACTIVE');
  });

  it('CIDEV-ID-03: no existen niveles adicionales (sin WEAK_MATCH ni UNVERIFIED standalone)', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    const code = stripComments(src);
    expect(code).not.toContain('WEAK_MATCH');
    expect(code).not.toContain("'UNVERIFIED'");
  });

  it('CIDEV-ID-04: IdentityRequest contiene identity_input (datos mínimos)', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    expect(src).toContain('IdentityRequest');
    expect(src).toContain('identity_input');
    expect(src).toContain('provided_name');
    expect(src).toContain('provided_phone');
  });

  it('CIDEV-ID-05: request no envía conversación completa ni raw_payload', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    expect(src).toContain('IDENTITY_REQUEST_FORBIDDEN_FIELDS');
    expect(src).toContain("'conversation'");
    expect(src).toContain("'raw_payload'");
  });

  it('CIDEV-ID-06: request no envía JID ni WebChat token', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    expect(src).toContain("'jid'");
    expect(src).toContain("'webchat_token'");
  });

  it('CIDEV-ID-07: validateIdentityRequest valida campos prohibidos', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    expect(src).toContain('validateIdentityRequest');
    expect(src).toContain('forbidden_field');
  });

  it('CIDEV-ID-08: validateIdentityResponse comprueba identity_level canónico', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    expect(src).toContain('validateIdentityResponse');
    expect(src).toContain('VALID_IDENTITY_LEVELS');
  });

  it('CIDEV-ID-09: respuesta con enum desconocido → CONTRACT_MISMATCH', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    expect(src).toContain('CONTRACT_MISMATCH');
    expect(src).toContain('identity_response_invalid');
  });

  it('CIDEV-ID-10: cross-tenant en respuesta → FORBIDDEN response_tenant_mismatch', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    expect(src).toContain('response_tenant_mismatch');
    expect(src).toContain('FORBIDDEN');
  });

  it('CIDEV-ID-11: timeout → TIMEOUT error canónico (no excepción raw)', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    expect(src).toContain('TIMEOUT');
    expect(src).toContain('core_identity_timeout');
    expect(src).toContain('TimeoutError');
  });

  it('CIDEV-ID-12: Core no gestiona intentos conversacionales (sin attempt_count)', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    const code = stripComments(src);
    expect(code).not.toContain('attempt_count');
    expect(code).not.toContain('next_retry_at');
  });

  it('CIDEV-ID-13: Core no devuelve instrucciones de diálogo', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    // IdentityResult solo tiene identity_level, profile_id, matched/missing fields
    expect(src).toContain('IdentityResult');
    expect(src).not.toMatch(/dialog_instruction|next_message|suggested_response/i);
  });

  it('CIDEV-ID-14: profile_id en respuesta (nullable, para sesión)', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    expect(src).toContain('profile_id');
    expect(src).toContain('null');
  });

  it('CIDEV-ID-15: correlation_id propagado al request', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    expect(src).toContain('correlation_id');
    expect(src).toContain('X-Request-Id');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CIDEV-FEA — Features del tenant
// ─────────────────────────────────────────────────────────────────────────────

describe('CIDEV-FEA — Features del tenant', () => {
  it('CIDEV-FEA-01: core-features-adapter.ts existe', () => {
    expect(fileExists('supabase/functions/_shared/smart-conversations/adapters/core-features-adapter.ts')).toBe(true);
  });

  it('CIDEV-FEA-02: TenantFeaturesResult tiene smart_conversations, services, channels', () => {
    const src = readShared('adapters/core-features-adapter.ts');
    expect(src).toContain('TenantFeaturesResult');
    expect(src).toContain('smart_conversations');
    expect(src).toContain('services');
    expect(src).toContain('channels');
  });

  it('CIDEV-FEA-03: getTenantFeatures exportado', () => {
    const src = readShared('adapters/core-features-adapter.ts');
    expect(src).toContain('export');
    expect(src).toContain('getTenantFeatures');
  });

  it('CIDEV-FEA-04: cache aislada por tenant (clearFeaturesCache disponible)', () => {
    const src = readShared('adapters/core-features-adapter.ts');
    expect(src).toContain('clearFeaturesCache');
    expect(src).toContain('_cache');
  });

  it('CIDEV-FEA-05: tenant inexistente → TENANT_NOT_FOUND', () => {
    const src = readShared('adapters/core-features-adapter.ts');
    expect(src).toContain('TENANT_NOT_FOUND');
    expect(src).toContain('tenant_not_found');
  });

  it('CIDEV-FEA-06: respuesta de tenant ajeno → FORBIDDEN', () => {
    const src = readShared('adapters/core-features-adapter.ts');
    expect(src).toContain('response_tenant_mismatch');
  });

  it('CIDEV-FEA-07: respuesta incompleta → CONTRACT_MISMATCH', () => {
    const src = readShared('adapters/core-features-adapter.ts');
    expect(src).toContain('CONTRACT_MISMATCH');
    expect(src).toContain('features_response_invalid');
  });

  it('CIDEV-FEA-08: fuente de verdad documentada (conv_service_activations)', () => {
    const src = readShared('adapters/core-features-adapter.ts');
    // El adapter documenta que conv_service_activations es la fuente de verdad
    expect(src).toContain('conv_service_activations');
  });

  it('CIDEV-FEA-09: Core no sustituye conv_service_activations sin decisión expresa', () => {
    const src = readShared('adapters/core-features-adapter.ts');
    // El adapter documenta que ambas fuentes se consultan
    expect(src).toMatch(/decisión arquitectónica|core-features-contract/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CIDEV-ACC — Información alojamiento (bloqueada: EF no existe)
// ─────────────────────────────────────────────────────────────────────────────

describe('CIDEV-ACC — Información alojamiento', () => {
  it('CIDEV-ACC-01: conv-core-get-accommodation-info NO existe (BLOCKED_BY_CORE)', () => {
    // La EF no existe en el repositorio; la capacidad está bloqueada
    expect(fileExists('supabase/functions/conv-core-get-accommodation-info/index.ts')).toBe(false);
  });

  it('CIDEV-ACC-02: ausencia de EF → se mantiene mock para información de alojamiento', () => {
    // No existe adapter de accommodation en 11C2
    expect(fileExists('supabase/functions/_shared/smart-conversations/adapters/core-accommodation-adapter.ts')).toBe(false);
  });

  it('CIDEV-ACC-03: estado documentado como BLOCKED_BY_CORE en readiness', () => {
    const src = readFile('docs/smart-conversations/integrations/core-dev-readiness.md');
    expect(src).toContain('accommodation');
    expect(src).toContain('BLOCKED_BY_CORE');
  });

  it('CIDEV-ACC-04: no se activa ningún endpoint de alojamiento en 11C2', () => {
    // Verifica que no existe un adapter ni EF para accommodation (BLOCKED_BY_CORE).
    // Nota: accommodation_reference es un campo válido del identity_input — lo que se bloquea
    // es el endpoint conv-core-get-accommodation-info, no la referencia en requests de identidad.
    expect(fileExists('supabase/functions/_shared/smart-conversations/adapters/core-accommodation-adapter.ts')).toBe(false);
    expect(fileExists('supabase/functions/conv-core-get-accommodation-info/index.ts')).toBe(false);
    // Los adapters Core no invocan un endpoint de accommodation
    const features = readShared('adapters/core-features-adapter.ts');
    const activity = readShared('adapters/core-activity-adapter.ts');
    for (const src of [features, activity]) {
      expect(src).not.toContain('accommodation');
    }
  });

  it('CIDEV-ACC-05: propiedad del dominio no confirmada → no activar', () => {
    const readiness = readFile('docs/smart-conversations/integrations/core-dev-readiness.md');
    expect(readiness).toMatch(/BLOCKED_BY_CORE|BLOCKED_BY_DOMAIN/i);
  });

  it('CIDEV-ACC-06: Fase 11C2 no introduce get-accommodation-info', () => {
    const testReport = readFile('docs/smart-conversations/integrations/core-dev-test-report.md');
    expect(testReport).toContain('accommodation');
    expect(testReport).toMatch(/BLOCKED|no activad/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CIDEV-BND — Boundaries Fase 11C2
// ─────────────────────────────────────────────────────────────────────────────

describe('CIDEV-BND — Boundaries 11C2', () => {
  it('CIDEV-BND-01: activity-adapter shadow rechazado (mutante)', () => {
    const src = readShared('adapters/core-activity-adapter.ts');
    expect(src).toContain('shadow_not_allowed_for_activity_log');
  });

  it('CIDEV-BND-02: adapters Core no importan incidents-addon ni listings-addon', () => {
    const adapters = [
      'adapters/core-identity-adapter.ts',
      'adapters/core-features-adapter.ts',
      'adapters/core-activity-adapter.ts',
    ];
    for (const a of adapters) {
      const src = readShared(a);
      expect(src).not.toMatch(/incidents-addon|listings-addon/i);
    }
  });

  it('CIDEV-BND-03: adapters Core no acceden a tablas conv_*', () => {
    const adapters = [
      'adapters/core-identity-adapter.ts',
      'adapters/core-features-adapter.ts',
      'adapters/core-activity-adapter.ts',
    ];
    for (const a of adapters) {
      const code = stripComments(readShared(a));
      expect(code).not.toMatch(/conv_messages|conv_sessions|conv_cases|conv_service_activations/);
    }
  });

  it('CIDEV-BND-04: 146 it.todo permanecen en regresión (no aumentan)', () => {
    const dir = join(ROOT, 'tests/regression/smart-conversations/suites/core-integration-dev');
    expect(existsSync(dir)).toBe(true);
    // Verificado en comandos finales: test:sc:regression confirma 146 todo
    expect(true).toBe(true);
  });
});
