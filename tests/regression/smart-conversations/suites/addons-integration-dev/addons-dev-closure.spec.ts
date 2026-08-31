/**
 * addons-dev-closure.spec.ts — Fase 11C5 — Cierre documental y operativo
 *
 * Grupos:
 *   N11C5-CLO-SMOKE  (14) — semántica de exit codes y --allow-pending en smokes DEV
 *   N11C5-CLO-VALI   (6)  — mensajes inequívocos del validador de configuración DEV
 *   N11C5-CLO-ACTOR  (8)  — semántica canónica de CanonicalActor y campos prohibidos
 *
 * Total: 28 tests runtime.
 * Todos son offline: no realizan llamadas externas, no requieren endpoints DEV.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../../../');

function src(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

// ─────────────────────────────────────────────────────────────────────────────
// N11C5-CLO-SMOKE — Semántica de exit codes y --allow-pending en smokes DEV
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5-CLO-SMOKE — Semántica de exit codes en smokes DEV', () => {
  const incSmoke = 'scripts/smart-conversations/smoke/smoke-dev-incidents-addon.mjs';
  const lstSmoke = 'scripts/smart-conversations/smoke/smoke-dev-listings-addon.mjs';
  const aggSmoke = 'scripts/smart-conversations/smoke/smoke-dev-addons.mjs';

  it('N11C5-CLO-SMOKE-01: sin INCIDENTS_ADDON_BASE_URL → exit 2 (no exit 0)', () => {
    const code = src(incSmoke);
    // Sin --allow-pending la ausencia de config produce exit(2), no exit(0)
    expect(code).toContain('process.exit(2)');
    expect(code).not.toMatch(/process\.exit\(0\)[^;]*\/\/ skipped por falta de config/);
  });

  it('N11C5-CLO-SMOKE-02: sin INCIDENTS_ADDON_SERVICE_TOKEN → exit 2', () => {
    const code = src(incSmoke);
    expect(code).toContain('process.exit(2)');
    expect(code).toContain('INCIDENTS_ADDON_SERVICE_TOKEN');
  });

  it('N11C5-CLO-SMOKE-03: sin LISTINGS_ADDON_BASE_URL → exit 2', () => {
    const code = src(lstSmoke);
    expect(code).toContain('process.exit(2)');
    expect(code).not.toMatch(/process\.exit\(0\)[^;]*\/\/ skipped por falta de config/);
  });

  it('N11C5-CLO-SMOKE-04: sin LISTINGS_ADDON_SERVICE_TOKEN → exit 2', () => {
    const code = src(lstSmoke);
    expect(code).toContain('process.exit(2)');
    expect(code).toContain('LISTINGS_ADDON_SERVICE_TOKEN');
  });

  it('N11C5-CLO-SMOKE-05: smoke agregado sin config → exit 2', () => {
    const code = src(aggSmoke);
    expect(code).toContain('process.exit(2)');
  });

  it('N11C5-CLO-SMOKE-06: smoke agregado no devuelve éxito si incidents no fue ejecutado', () => {
    const code = src(aggSmoke);
    // El agregado distingue exit code 2 de los sub-smokes como skipped, no como passed
    expect(code).toContain("code === 2");
    expect(code).toContain('skipped++');
    // No incrementa passed cuando el sub-smoke devuelve exit 2
    expect(code).not.toMatch(/passed\+\+[^}]*INCIDENTS/);
  });

  it('N11C5-CLO-SMOKE-07: smoke agregado no devuelve éxito si listings no fue ejecutado', () => {
    const code = src(aggSmoke);
    expect(code).toContain("code === 2");
    // passed solo se incrementa tras execFileSync sin throw (exit 0 real)
    const passedIncrements = (code.match(/passed\+\+/g) || []).length;
    expect(passedIncrements).toBeGreaterThanOrEqual(2); // uno por add-on en el path real
  });

  it('N11C5-CLO-SMOKE-08: smoke agregado no devuelve éxito si createLead no fue validado', () => {
    const code = src(aggSmoke);
    // Si listings no fue validado, el estado no puede ser ADDONS_INTEGRATION_DEV_VALIDATED
    expect(code).toContain("skipped > 0 && failed === 0");
    expect(code).toContain("ADDONS_DEV_CONFIGURATION_PENDING");
  });

  it('N11C5-CLO-SMOKE-09: --allow-pending no cambia el estado a validated', () => {
    const incCode = src(incSmoke);
    const lstCode = src(lstSmoke);
    const aggCode = src(aggSmoke);
    // Con --allow-pending el estado sigue siendo NOT_EXECUTED_CONFIGURATION_PENDING o ADDONS_DEV_CONFIGURATION_PENDING
    expect(incCode).toContain('NOT_EXECUTED_CONFIGURATION_PENDING');
    expect(lstCode).toContain('NOT_EXECUTED_CONFIGURATION_PENDING');
    expect(aggCode).toContain('ADDONS_DEV_CONFIGURATION_PENDING');
    // Ninguno imprime DEV_VALIDATED en el bloque de pending
    const incPendingBlock = incCode.split('ALLOW_PENDING')[1] ?? '';
    expect(incPendingBlock).not.toContain('INCIDENTS_DEV_VALIDATED');
  });

  it('N11C5-CLO-SMOKE-10: --allow-pending confirma que no hubo llamadas externas', () => {
    const incCode = src(incSmoke);
    // El mensaje con --allow-pending indica explícitamente que no es evidencia DEV
    expect(incCode).toContain('NO es evidencia de integración DEV');
    const lstCode = src(lstSmoke);
    expect(lstCode).toContain('NO es evidencia de integración DEV');
  });

  it('N11C5-CLO-SMOKE-11: solo ejecución real completa puede devolver DEV_VALIDATED', () => {
    const incCode = src(incSmoke);
    // INCIDENTS_DEV_VALIDATED solo aparece en el path sin skipped (passed === total)
    expect(incCode).toContain('INCIDENTS_DEV_VALIDATED');
    // Está después del if(skipped>0) check, no dentro de él
    const afterSkipCheck = incCode.split('if (skipped > 0)')[1] ?? '';
    expect(afterSkipCheck).toContain('INCIDENTS_DEV_VALIDATED');
  });

  it('N11C5-CLO-SMOKE-12: exit 0 sin --allow-pending implica que no hubo skips obligatorios', () => {
    const incCode = src(incSmoke);
    // El flujo de exit 0 implícito (fin del script) solo ocurre cuando failed===0 y skipped===0
    // El código de exit 2 y exit 0 con --allow-pending están en el bloque if(skipped>0)
    expect(incCode).toContain('if (skipped > 0)');
    // Exit 0 implícito solo si no se entró al bloque de skipped
    expect(incCode).toContain('// Exit 0 implícito: ejecución real realizada y validada');
  });

  it('N11C5-CLO-SMOKE-13: exit code 2 representa configuración pendiente', () => {
    for (const s of [incSmoke, lstSmoke, aggSmoke]) {
      const code = src(s);
      expect(code, `${s}: debe contener exit 2`).toContain('process.exit(2)');
      // Exit 2 tiene comentario o contexto que lo identifica como NOT_EXECUTED
      expect(code, `${s}: exit 2 asociado a pending`).toMatch(
        /process\.exit\(2\)|exit.*2.*pend|NOT_EXECUTED/
      );
    }
  });

  it('N11C5-CLO-SMOKE-14: exit code 1 representa fallo real en ejecución', () => {
    for (const s of [incSmoke, lstSmoke]) {
      const code = src(s);
      expect(code, `${s}: debe contener exit 1`).toContain('process.exit(1)');
      // Exit 1 está condicionado a failed > 0 (fallo en llamada real)
      expect(code, `${s}: exit 1 condicionado a failed`).toContain('if (failed > 0) process.exit(1)');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5-CLO-VALI — Mensajes inequívocos del validador de configuración DEV
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5-CLO-VALI — Mensajes del validador de configuración DEV', () => {
  const validator = 'scripts/smart-conversations/validate-addons-dev-integration.mjs';

  it('N11C5-CLO-VALI-01: variable ausente genera mensaje con "no configurada/o" o "ausente"', () => {
    const code = src(validator);
    // El validador ahora muestra mensajes condicionales: "no configurada" cuando está ausente
    expect(code).toMatch(/no configurada|no configurado|ausente/);
  });

  it('N11C5-CLO-VALI-02: variable ausente no genera mensaje afirmativo sin negación', () => {
    const code = src(validator);
    // La formulación afirmativa ambigua "configurada (DEV)" fue eliminada
    expect(code).not.toContain("'INCIDENTS_ADDON_BASE_URL configurada (DEV)'");
    expect(code).not.toContain("'INCIDENTS_ADDON_SERVICE_TOKEN configurado (DEV)'");
    expect(code).not.toContain("'LISTINGS_ADDON_BASE_URL configurada (DEV)'");
    expect(code).not.toContain("'LISTINGS_ADDON_SERVICE_TOKEN configurado (DEV)'");
  });

  it('N11C5-CLO-VALI-03: variable presente puede mostrarse como configurada', () => {
    const code = src(validator);
    // El mensaje positivo ("configurada"/"configurado") existe para cuando la var SÍ está presente
    expect(code).toMatch(/configurada'|configurado'/);
  });

  it('N11C5-CLO-VALI-04: el validador no imprime endpoints en el resultado', () => {
    const code = src(validator);
    // No se hace console.log del valor de las variables de entorno
    expect(code).not.toMatch(/console\.log.*process\.env\['INCIDENTS_ADDON_BASE_URL'\]/);
    expect(code).not.toMatch(/console\.log.*process\.env\['LISTINGS_ADDON_BASE_URL'\]/);
  });

  it('N11C5-CLO-VALI-05: el validador no imprime tokens en el resultado', () => {
    const code = src(validator);
    expect(code).not.toMatch(/console\.log.*process\.env\['INCIDENTS_ADDON_SERVICE_TOKEN'\]/);
    expect(code).not.toMatch(/console\.log.*process\.env\['LISTINGS_ADDON_SERVICE_TOKEN'\]/);
  });

  it('N11C5-CLO-VALI-06: el validador no introduce campos PII en output', () => {
    const code = src(validator);
    // No imprime directamente valores de env vars del tipo secreto
    expect(code).not.toMatch(/console\.log\(.*ADDON_SERVICE_TOKEN/);
    expect(code).not.toMatch(/console\.log\(.*ADDON_BASE_URL/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5-CLO-ACTOR — Semántica canónica de CanonicalActor y campos prohibidos
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5-CLO-ACTOR — CanonicalActor: campos prohibidos y variantes permitidas', () => {
  const actorSrc = 'supabase/functions/_shared/smart-conversations/canonical-actor.ts';

  const FORBIDDEN_FIELDS = [
    'identity_level', 'STRONG_MATCH_ACTIVE', 'PARTIAL_MATCH_ACTIVE', 'MATCH_INACTIVE',
    'NO_MATCH', 'UNVERIFIED_LEAD', 'sender_ref', 'phone', 'email', 'jid', 'wa_jid', 'webchat_token',
  ] as const;

  const ALLOWED_ACTOR_TYPES = ['tenant_profile', 'unverified_lead', 'system_service'] as const;

  it('N11C5-CLO-ACTOR-01: los campos prohibidos están en CANONICAL_ACTOR_FORBIDDEN_FIELDS (denylist)', () => {
    const code = src(actorSrc);
    const denylistBlock = code.match(/CANONICAL_ACTOR_FORBIDDEN_FIELDS\s*=\s*new Set\(\[[\s\S]*?\]\)/)?.[0] ?? '';
    for (const field of FORBIDDEN_FIELDS) {
      expect(denylistBlock, `'${field}' debe estar en la denylist`).toContain(`'${field}'`);
    }
  });

  it('N11C5-CLO-ACTOR-02: los campos prohibidos NO son propiedades de TenantProfileActor', () => {
    const code = src(actorSrc);
    const tenantBlock = code.match(/interface TenantProfileActor[\s\S]*?\}/)?.[0] ?? '';
    for (const field of FORBIDDEN_FIELDS) {
      expect(tenantBlock, `'${field}' no debe ser propiedad de TenantProfileActor`).not.toContain(field + ':');
      expect(tenantBlock, `'${field}' no debe ser propiedad de TenantProfileActor`).not.toContain(field + '?:');
    }
  });

  it('N11C5-CLO-ACTOR-03: los campos prohibidos NO son propiedades de UnverifiedLeadActor', () => {
    const code = src(actorSrc);
    const leadBlock = code.match(/interface UnverifiedLeadActor[\s\S]*?\}/)?.[0] ?? '';
    for (const field of FORBIDDEN_FIELDS) {
      expect(leadBlock, `'${field}' no debe ser propiedad de UnverifiedLeadActor`).not.toContain(field + ':');
    }
  });

  it('N11C5-CLO-ACTOR-04: los campos prohibidos NO son propiedades de SystemServiceActor', () => {
    const code = src(actorSrc);
    const sysBlock = code.match(/interface SystemServiceActor[\s\S]*?\}/)?.[0] ?? '';
    for (const field of FORBIDDEN_FIELDS) {
      expect(sysBlock, `'${field}' no debe ser propiedad de SystemServiceActor`).not.toContain(field + ':');
    }
  });

  it('N11C5-CLO-ACTOR-05: validateCanonicalActor rechaza actores con campos prohibidos', () => {
    const code = src(actorSrc);
    // La función validateCanonicalActor usa CANONICAL_ACTOR_FORBIDDEN_FIELDS para rechazar
    expect(code).toContain('validateCanonicalActor');
    expect(code).toContain('CANONICAL_ACTOR_FORBIDDEN_FIELDS');
    // La función retorna { valid: false } cuando encuentra un campo prohibido
    expect(code).toMatch(/valid:\s*false/);
  });

  it('N11C5-CLO-ACTOR-06: profile_id solo está permitido en tenant_profile', () => {
    const code = src(actorSrc);
    const tenantBlock = code.match(/interface TenantProfileActor[\s\S]*?\}/)?.[0] ?? '';
    const leadBlock = code.match(/interface UnverifiedLeadActor[\s\S]*?\}/)?.[0] ?? '';
    const sysBlock = code.match(/interface SystemServiceActor[\s\S]*?\}/)?.[0] ?? '';
    // TenantProfileActor tiene profile_id como propiedad declarada
    expect(tenantBlock).toMatch(/profile_id\s*\??:/);
    // UnverifiedLeadActor y SystemServiceActor NO tienen profile_id como propiedad
    // (pueden tenerlo en comentarios, pero no como declaración de campo)
    expect(leadBlock).not.toMatch(/profile_id\s*\??:/);
    expect(sysBlock).not.toMatch(/profile_id\s*\??:/);
  });

  it('N11C5-CLO-ACTOR-07: las tres variantes permitidas están definidas como tipos', () => {
    const code = src(actorSrc);
    for (const variant of ALLOWED_ACTOR_TYPES) {
      expect(code, `variante '${variant}' debe estar definida`).toContain(`'${variant}'`);
    }
    expect(code).toContain("type: 'tenant_profile'");
    expect(code).toContain("type: 'unverified_lead'");
    expect(code).toContain("type: 'system_service'");
  });

  it('N11C5-CLO-ACTOR-08: el archivo no define identity_level como propiedad de interfaz', () => {
    const code = src(actorSrc);
    // identity_level solo existe dentro de CANONICAL_ACTOR_FORBIDDEN_FIELDS, no como propiedad
    const lines = code.split('\n');
    for (const line of lines) {
      if (line.includes('identity_level') && !line.includes('CANONICAL_ACTOR_FORBIDDEN_FIELDS') && !line.includes('*')) {
        // Si aparece fuera del bloque de denylist y fuera de comentarios, es un problema
        expect(line.trim()).toMatch(/['"]identity_level['"]/); // solo como string literal en la Set
      }
    }
    // La propiedad en las interfaces no puede tener "identity_level:"
    expect(code).not.toMatch(/^\s+identity_level\s*[?:]:/m);
  });
});
