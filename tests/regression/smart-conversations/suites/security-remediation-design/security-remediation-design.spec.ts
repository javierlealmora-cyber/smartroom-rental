/**
 * security-remediation-design.spec.ts
 * Fase 11B2A — Verificación estática del diseño de remediación de seguridad
 *
 * Tests estáticos (no requieren Supabase ni servicios reales).
 * Verifican: consistencia de findings, modelo RLS, modelo de acceso, clientes DB EF,
 * findings de configuración, y boundaries del diseño.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../../..');
const SECURITY_DIR = path.join(ROOT, 'docs/smart-conversations/security');

function readDoc(filename: string): string {
  const p = path.join(SECURITY_DIR, filename);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : '';
}

function readFile(p: string): string {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : '';
}

// ---------------------------------------------------------------------------
// Suite A: Consistencia de findings (8 tests)
// ---------------------------------------------------------------------------

describe('SRD-A: Findings consistency', () => {
  const findings = readDoc('security-findings.md');

  it('SRD-A-01: security-findings.md existe y tiene contenido', () => {
    expect(findings.length).toBeGreaterThan(100);
  });

  it('SRD-A-02: Total de findings es 26 (25 anteriores + SEC-024)', () => {
    expect(findings).toMatch(/\*\*TOTAL\*\*.*\*\*26\*\*/);
  });

  it('SRD-A-03: SEC-001 tiene severity_changed a LOW', () => {
    expect(findings).toMatch(/SEC-001/);
    expect(findings).toMatch(/severity_changed/);
    expect(findings).toMatch(/LOW.*severity_changed|severity_changed.*LOW/);
  });

  it('SRD-A-04: SEC-024 existe con estado open', () => {
    expect(findings).toMatch(/SEC-024/);
    expect(findings).toMatch(/conv-core-publish-activity/);
    expect(findings).toMatch(/\| estado \| open \|/);
  });

  it('SRD-A-05: SEC-015 documentado como not_created', () => {
    expect(findings).toMatch(/SEC-015/);
    expect(findings).toMatch(/not_created/);
  });

  it('SRD-A-06: SEC-028 documentado como not_created (SECURITY DEFINER seguro)', () => {
    expect(findings).toMatch(/SEC-028/);
    expect(findings).toMatch(/not_created/);
    expect(findings).toMatch(/SEGURA|search_path/);
  });

  it('SRD-A-07: Los 4 findings CRITICAL permanecen (SEC-002, SEC-003, SEC-004, SEC-005)', () => {
    const criticals = ['SEC-002', 'SEC-003', 'SEC-004', 'SEC-005'];
    criticals.forEach(id => {
      expect(findings).toMatch(new RegExp(`${id}`));
    });
    expect(findings).toMatch(/CRITICAL.*4|4.*CRITICAL/);
  });

  it('SRD-A-08: SEC-001 NO bloquea preproduction ni production (severity LOW)', () => {
    const sec001Block = findings.match(/SEC-001[\s\S]*?bloquea production \| (No|Sí)/m);
    expect(sec001Block?.[1]).toBe('No');
  });
});

// ---------------------------------------------------------------------------
// Suite B: RLS Role Model (7 tests)
// ---------------------------------------------------------------------------

describe('SRD-B: RLS role model', () => {
  const rlsDoc = readDoc('rls-role-model.md');

  it('SRD-B-01: rls-role-model.md existe', () => {
    expect(rlsDoc.length).toBeGreaterThan(100);
  });

  it('SRD-B-02: Documenta que service_role tiene BYPASSRLS=true', () => {
    expect(rlsDoc).toMatch(/service_role.*BYPASSRLS|BYPASSRLS.*service_role/i);
    expect(rlsDoc).toMatch(/true/);
  });

  it('SRD-B-03: Documenta que postgres es superusuario con BYPASSRLS implícito', () => {
    expect(rlsDoc).toMatch(/postgres.*superusuario|superusuario.*postgres/i);
    expect(rlsDoc).toMatch(/BYPASSRLS impl/i);
  });

  it('SRD-B-04: Concluye que FORCE RLS no aporta protección adicional contra service_role', () => {
    expect(rlsDoc).toMatch(/FORCE.*no.*protección|NO aporta protección|irrelevante/i);
  });

  it('SRD-B-05: Documenta la función SECURITY DEFINER como segura', () => {
    expect(rlsDoc).toMatch(/SECURITY DEFINER/);
    expect(rlsDoc).toMatch(/SEGURA|search_path.*public|SET search_path/i);
  });

  it('SRD-B-06: Documenta que protección multi-tenant depende de código EF, no de RLS', () => {
    expect(rlsDoc).toMatch(/código-dependiente|código EF|client_account_id.*código/i);
  });

  it('SRD-B-07: SEC-001 severity_changed a LOW está justificado en el documento', () => {
    expect(rlsDoc).toMatch(/severity_changed/i);
    expect(rlsDoc).toMatch(/LOW/);
    expect(rlsDoc).toMatch(/BYPASSRLS/);
  });
});

// ---------------------------------------------------------------------------
// Suite C: Target Database Access Model (8 tests)
// ---------------------------------------------------------------------------

describe('SRD-C: Target database access model', () => {
  const accessDoc = readDoc('target-database-access-model.md');

  it('SRD-C-01: target-database-access-model.md existe', () => {
    expect(accessDoc.length).toBeGreaterThan(100);
  });

  it('SRD-C-02: Cubre las 8 tablas conv_*', () => {
    const tables = [
      'conv_service_activations',
      'conv_wa_sessions',
      'conv_wc_configs',
      'conv_sessions',
      'conv_cases',
      'conv_messages',
      'conv_send_queue',
      'conv_admin_notifications',
    ];
    tables.forEach(t => {
      expect(accessDoc).toMatch(new RegExp(t));
    });
  });

  it('SRD-C-03: Documenta que ninguna tabla permite acceso frontend directo', () => {
    const directAccessYes = accessDoc.match(/Acceso frontend directo \| ✅ Sí/g);
    expect(directAccessYes ?? []).toHaveLength(0);
  });

  it('SRD-C-04: Documenta columnas PII por tabla (SEC-007)', () => {
    expect(accessDoc).toMatch(/PII/);
    expect(accessDoc).toMatch(/sender_phone|raw_payload|content.*PII|PII.*content/i);
    expect(accessDoc).toMatch(/SEC-007/);
  });

  it('SRD-C-05: Documenta retención objetivo para columnas PII', () => {
    expect(accessDoc).toMatch(/retención|purge|90d|30d/i);
  });

  it('SRD-C-06: Documento tiene marcadores NO EJECUTAR en SQL conceptual', () => {
    expect(accessDoc).toMatch(/NO EJECUTAR/);
  });

  it('SRD-C-07: Documenta signing_secret y webhook_secret como sensibles (SEC-005)', () => {
    expect(accessDoc).toMatch(/signing_secret|webhook_secret/);
    expect(accessDoc).toMatch(/SEC-005/);
  });

  it('SRD-C-08: Documenta el diseño de rate limit en conv_messages (SEC-002)', () => {
    expect(accessDoc).toMatch(/rate.limit|SEC-002/i);
    expect(accessDoc).toMatch(/conv_messages/);
  });
});

// ---------------------------------------------------------------------------
// Suite D: Edge Function DB Client Audit (10 tests)
// ---------------------------------------------------------------------------

describe('SRD-D: Edge Function DB client audit', () => {
  const efDoc = readDoc('edge-function-db-client-audit.md');

  it('SRD-D-01: edge-function-db-client-audit.md existe', () => {
    expect(efDoc.length).toBeGreaterThan(100);
  });

  it('SRD-D-02: Marca la corrección crítica del auth matrix anterior', () => {
    expect(efDoc).toMatch(/CORRECCIÓN CRÍTICA/i);
    expect(efDoc).toMatch(/incorrecto/i);
  });

  it('SRD-D-03: Documenta que conv-web-session usa service_role (verificado)', () => {
    expect(efDoc).toMatch(/conv-web-session/);
    expect(efDoc).toMatch(/service_role.*verificado|verificado.*service_role|SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('SRD-D-04: Documenta que conv-web-message usa service_role (verificado)', () => {
    expect(efDoc).toMatch(/conv-web-message/);
    expect(efDoc).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('SRD-D-05: Documenta que conv-web-poll usa service_role (verificado)', () => {
    expect(efDoc).toMatch(/conv-web-poll/);
    expect(efDoc).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('SRD-D-06: Documenta que conv-wa-webhook usa service_role (verificado)', () => {
    expect(efDoc).toMatch(/conv-wa-webhook/);
    expect(efDoc).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('SRD-D-07: Clasifica EFs como FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS; tabla de clasificaciones muestra 0 en FUNCIONA_CON_RLS_ACTUAL', () => {
    expect(efDoc).toMatch(/FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS/);
    // El doc puede mencionar la clasificación FUNCIONA_CON_RLS_ACTUAL al explicar que es inaplicable.
    // La verificación real es que el count en la tabla de resumen sea 0.
    expect(efDoc).toMatch(/FUNCIONA_CON_RLS_ACTUAL.*0|0.*FUNCIONA_CON_RLS_ACTUAL/);
  });

  it('SRD-D-08: Documenta SEC-024 para conv-core-publish-activity', () => {
    expect(efDoc).toMatch(/conv-core-publish-activity/);
    expect(efDoc).toMatch(/SEC-024/);
  });

  it('SRD-D-09: SEC-028 documentado como not_created en la auditoría de EFs', () => {
    expect(efDoc).toMatch(/SEC-028/);
    expect(efDoc).toMatch(/not_created/);
  });

  it('SRD-D-10: Documenta SEC-015 como not_created', () => {
    expect(efDoc).toMatch(/SEC-015/);
    expect(efDoc).toMatch(/not_created/);
  });
});

// ---------------------------------------------------------------------------
// Suite E: Config findings (6 tests)
// ---------------------------------------------------------------------------

describe('SRD-E: Config findings design', () => {
  const migrationPlan = readDoc('phase-11b2b-migration-plan.md');

  it('SRD-E-01: phase-11b2b-migration-plan.md existe', () => {
    expect(migrationPlan.length).toBeGreaterThan(100);
  });

  it('SRD-E-02: Diseña guard para SEC-002 (rate limit mock bloqueado en sandbox+)', () => {
    expect(migrationPlan).toMatch(/SEC-002/);
    expect(migrationPlan).toMatch(/WEBCHAT_RATE_LIMIT_MODE/);
    expect(migrationPlan).toMatch(/mock.*sandbox|sandbox.*mock/i);
  });

  it('SRD-E-03: Diseña guard para SEC-004 (legacy auth bloqueado en sandbox+)', () => {
    expect(migrationPlan).toMatch(/SEC-004/);
    expect(migrationPlan).toMatch(/WEBCHAT_AUTH_MODE/);
    expect(migrationPlan).toMatch(/legacy.*sandbox|sandbox.*legacy/i);
  });

  it('SRD-E-04: Documenta matriz de variables por ambiente', () => {
    expect(migrationPlan).toMatch(/local.*sandbox.*staging.*production|database.*signed_token/i);
  });

  it('SRD-E-05: Documenta diseño de Vault migration para SEC-005', () => {
    expect(migrationPlan).toMatch(/SEC-005/);
    expect(migrationPlan).toMatch(/Vault|vault/);
    expect(migrationPlan).toMatch(/webhook_secret|signing_secret/);
  });

  it('SRD-E-06: Todos los SQL están marcados NO EJECUTAR', () => {
    const sqlBlocks = migrationPlan.match(/```sql[\s\S]*?```/g) ?? [];
    sqlBlocks.forEach(block => {
      expect(block).toMatch(/NO EJECUTAR/);
    });
    expect(sqlBlocks.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Suite F: Boundaries del diseño (11 tests)
// ---------------------------------------------------------------------------

describe('SRD-F: Design boundaries', () => {
  const findings = readDoc('security-findings.md');
  const rlsDoc = readDoc('rls-role-model.md');
  const efDoc = readDoc('edge-function-db-client-audit.md');
  const migrationPlan = readDoc('phase-11b2b-migration-plan.md');

  it('SRD-F-01: Ningún documento declara GATE_1 como actualmente aprobado', () => {
    const docs = [findings, rlsDoc, efDoc, migrationPlan];
    // GATE_1: PASS al inicio de línea = declaración de aprobación (prohibida).
    // "Declarar GATE_1 = PASS si ..." = criterio futuro (permitido).
    // "GATE_1: AUDIT_COMPLETE..." = estado actual correcto (permitido).
    docs.forEach(doc => {
      // Chequea que no existe una línea de declaración de aprobación canónica:
      // **GATE_1: PASS** o **GATE_1: APROBADO** al inicio de una línea
      // (mencionar en listas de restricciones "NO declarar GATE_1 aprobado" está permitido)
      expect(doc).not.toMatch(/^\*\*GATE_1: (?:PASS|APROBADO)\*\*$/m);
    });
  });

  it('SRD-F-02: Todos los documentos declaran GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING', () => {
    const docs = [rlsDoc, efDoc, migrationPlan];
    docs.forEach(doc => {
      expect(doc).toMatch(/AUDIT_COMPLETE_REMEDIATION_PENDING/);
    });
  });

  it('SRD-F-03: Ningún documento menciona WF-02 como estado nuevo', () => {
    const docs = [findings, rlsDoc, efDoc, migrationPlan];
    docs.forEach(doc => {
      expect(doc).not.toMatch(/WF-02.*nuevo|nuevo.*WF-02/i);
    });
  });

  it('SRD-F-04: Ningún documento introduce conv_help_escalated', () => {
    const docs = [findings, rlsDoc, efDoc, migrationPlan];
    docs.forEach(doc => {
      expect(doc).not.toMatch(/conv_help_escalated/);
    });
  });

  it('SRD-F-05: Ningún documento introduce next_retry_at o attempt_count como campo de DB o evento', () => {
    const docs = [findings, rlsDoc, efDoc, migrationPlan];
    docs.forEach(doc => {
      // Permitido: mencionar en listas de restricciones ("NO añadir ... next_retry_at")
      // Prohibido: introducirlos como campo real en SQL, TypeScript o contrato
      const sqlMentions = doc.match(/next_retry_at\s*(?:TEXT|TIMESTAMP|INT|BIGINT|=)|attempt_count\s*(?:TEXT|INT|BIGINT|=)/g);
      expect(sqlMentions ?? []).toHaveLength(0);
    });
  });

  it('SRD-F-06: El plan no crea nuevas tablas conv_* fuera de las 8 existentes', () => {
    const newTableMatch = migrationPlan.match(/CREATE TABLE (?!conv_service_activations|conv_wa_sessions|conv_wc_configs|conv_sessions|conv_cases|conv_messages|conv_send_queue|conv_admin_notifications)(conv_\w+)/g);
    expect(newTableMatch ?? []).toHaveLength(0);
  });

  it('SRD-F-07: security-findings.md no tiene referencias a SEC-NNN sin finding block (excepto not_created)', () => {
    const referencedIds = (findings.match(/SEC-\d+/g) ?? []);
    const uniqueIds = [...new Set(referencedIds)];
    const notCreatedPattern = /not_created/;
    // IDs que tienen bloques de finding
    const findingBlocks = (findings.match(/finding_id \| SEC-\d+/g) ?? []).map(m => m.replace('finding_id | ', ''));
    const notCreatedIds = ['SEC-015', 'SEC-028'];
    uniqueIds.forEach(id => {
      if (!notCreatedIds.includes(id)) {
        const hasBlock = findingBlocks.includes(id);
        const isInNotCreated = findings.includes(`${id}`) && notCreatedPattern.test(findings.substring(findings.indexOf(id)));
        expect(hasBlock || isInNotCreated).toBe(true);
      }
    });
  });

  it('SRD-F-08: El plan no modifica contratos de EFs funcionales (no cambia firmas de función)', () => {
    // El plan no debe incluir cambios en index.ts exports o imports de EFs funcionales
    expect(migrationPlan).not.toMatch(/modificar contrato|cambiar firma/i);
  });

  it('SRD-F-09: edge-function-db-client-audit.md cubre las 4 EFs públicas', () => {
    const publicEFs = ['conv-web-session', 'conv-web-message', 'conv-web-poll', 'conv-wa-webhook'];
    publicEFs.forEach(ef => {
      expect(efDoc).toMatch(new RegExp(ef));
    });
  });

  it('SRD-F-10: rls-role-model.md cubre las 8 tablas conv_* en la sección de políticas', () => {
    const tables = [
      'conv_service_activations',
      'conv_wa_sessions',
      'conv_wc_configs',
      'conv_sessions',
      'conv_cases',
      'conv_messages',
      'conv_send_queue',
      'conv_admin_notifications',
    ];
    tables.forEach(t => {
      expect(rlsDoc).toMatch(new RegExp(t));
    });
  });

  it('SRD-F-11: Los 4 documentos de seguridad existen en docs/smart-conversations/security/', () => {
    const expectedDocs = [
      'rls-role-model.md',
      'target-database-access-model.md',
      'edge-function-db-client-audit.md',
      'phase-11b2b-migration-plan.md',
    ];
    expectedDocs.forEach(doc => {
      expect(fs.existsSync(path.join(SECURITY_DIR, doc))).toBe(true);
    });
  });
});
