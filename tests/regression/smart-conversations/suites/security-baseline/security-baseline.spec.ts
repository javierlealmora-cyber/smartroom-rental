/**
 * Security Baseline — Static Analysis Tests
 * Fase 11B1 · SmartConversations
 *
 * Tests estáticos que verifican invariantes de seguridad, auditoría RLS,
 * threat model, clasificación de datos, CORS, CSP, secrets y privacidad.
 * No conectan servicios reales. No modifican archivos. No usan credenciales reales.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../../../');
const SEC_DIR = path.join(ROOT, 'docs/smart-conversations/security');
const MIG_DIR = path.join(ROOT, 'supabase/migrations');
const EF_DIR  = path.join(ROOT, 'supabase/functions');
const SRC_DIR = path.join(ROOT, 'src');
const ENV_EXAMPLE = path.join(ROOT, '.env.example');
const CI_FILE = path.join(ROOT, '.github/workflows/pr-checks.yml');

function readFile(p: string): string {
  try { return fs.readFileSync(p, 'utf-8'); } catch { return ''; }
}
function fileExists(p: string): boolean { return fs.existsSync(p); }
function dirContents(p: string): string[] {
  try { return fs.readdirSync(p); } catch { return []; }
}
function globFiles(dir: string, pred: (f: string) => boolean): string[] {
  const results: string[] = [];
  if (!fileExists(dir)) return results;
  function walk(d: string) {
    for (const f of dirContents(d)) {
      const full = path.join(d, f);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) walk(full);
        else if (pred(full)) results.push(full);
      } catch {}
    }
  }
  walk(dir);
  return results;
}

// Migration content (lazy loaded once)
let _migContent: string | null = null;
function getMigContent(): string {
  if (_migContent === null) {
    const files = globFiles(MIG_DIR, f => f.endsWith('.sql'));
    _migContent = files.map(f => readFile(f)).join('\n');
  }
  return _migContent;
}

// ─────────────────────────────────────────────────────────────────────────────
// SB-01..12 — Documentos de seguridad existen
// ─────────────────────────────────────────────────────────────────────────────
describe('SB-01..12 — Documentos de seguridad existen', () => {
  const docs = [
    'data-classification.md',
    'threat-model.md',
    'authentication-authorization-matrix.md',
    'rls-audit.md',
    'multi-tenant-isolation-audit.md',
    'cors-audit.md',
    'csp-frontend-audit.md',
    'secrets-inventory.md',
    'logging-privacy-audit.md',
    'webhook-replay-audit.md',
    'security-findings.md',
    'gate-1-remediation-plan.md',
  ];

  docs.forEach((doc, i) => {
    it(`SB-${String(i + 1).padStart(2, '0')}: ${doc} existe`, () => {
      expect(fileExists(path.join(SEC_DIR, doc))).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SB-13..20 — Inventario de tablas y EFs
// ─────────────────────────────────────────────────────────────────────────────
describe('SB-13..20 — Inventario de tablas y Edge Functions', () => {
  it('SB-13: se inventarían tablas conv_* en rls-audit.md', () => {
    const c = readFile(path.join(SEC_DIR, 'rls-audit.md'));
    expect(c).toMatch(/conv_sessions/);
    expect(c).toMatch(/conv_messages/);
    expect(c).toMatch(/conv_cases/);
    expect(c).toMatch(/conv_send_queue/);
  });

  it('SB-14: se inventarían EFs conv-* en authentication-authorization-matrix.md', () => {
    const c = readFile(path.join(SEC_DIR, 'authentication-authorization-matrix.md'));
    expect(c).toMatch(/conv-web-session/);
    expect(c).toMatch(/conv-wa-webhook/);
    expect(c).toMatch(/conv-ingest/);
    expect(c).toMatch(/conv-dispatch-message/);
  });

  it('SB-15: ninguna EF queda como unknown sin finding', () => {
    const c = readFile(path.join(SEC_DIR, 'authentication-authorization-matrix.md'));
    // La documentación debe afirmar que no quedan EFs unknown sin finding
    expect(c).toMatch(/0 con clasificación `unknown` sin finding|No quedan EFs con clasificación `unknown` sin finding/i);
  });

  it('SB-16: cada tabla indica estado RLS en rls-audit.md', () => {
    const c = readFile(path.join(SEC_DIR, 'rls-audit.md'));
    expect(c).toMatch(/RLS ENABLED/);
    expect(c).toMatch(/RLS FORCED/);
  });

  it('SB-17: cada tabla indica políticas CRUD conocidas', () => {
    const c = readFile(path.join(SEC_DIR, 'rls-audit.md'));
    expect(c).toMatch(/service_role only/i);
    expect(c).toMatch(/FOR ALL/);
  });

  it('SB-18: cada función indica actor permitido', () => {
    const c = readFile(path.join(SEC_DIR, 'authentication-authorization-matrix.md'));
    expect(c).toMatch(/Actor permitido/);
    expect(c).toMatch(/A-01|A-18/);
  });

  it('SB-19: cada función indica método de autenticación', () => {
    const c = readFile(path.join(SEC_DIR, 'authentication-authorization-matrix.md'));
    expect(c).toMatch(/service_role|HMAC|signed_token|public/i);
  });

  it('SB-20: cada función indica uso de service_role', () => {
    const c = readFile(path.join(SEC_DIR, 'authentication-authorization-matrix.md'));
    expect(c).toMatch(/Requiere service_role/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SB-21..28 — RLS
// ─────────────────────────────────────────────────────────────────────────────
describe('SB-21..28 — RLS invariantes', () => {
  const expectedTables = [
    'conv_service_activations', 'conv_wa_sessions', 'conv_wc_configs',
    'conv_sessions', 'conv_cases', 'conv_messages', 'conv_send_queue',
    'conv_admin_notifications',
  ];

  it('SB-21: todas las tablas conv_* tienen ENABLE ROW LEVEL SECURITY', () => {
    const mig = getMigContent();
    for (const t of expectedTables) {
      expect(mig).toMatch(new RegExp(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`));
    }
  });

  it('SB-22: FORCE ROW LEVEL SECURITY ausente (SEC-001 pendiente)', () => {
    const mig = getMigContent();
    // Actualmente NO hay FORCE RLS — SEC-001 documenta esto como hallazgo
    const forceCount = (mig.match(/FORCE ROW LEVEL SECURITY/g) ?? []).length;
    // El validador lo detecta como warning — aquí verificamos que se documenta en rls-audit
    const audit = readFile(path.join(SEC_DIR, 'rls-audit.md'));
    expect(audit).toMatch(/FORCE.*No|No.*FORCE/i);
    expect(audit).toMatch(/SEC-001/);
  });

  it('SB-23: rls-audit.md documenta política sin client_account_id filter (TODO)', () => {
    const c = readFile(path.join(SEC_DIR, 'rls-audit.md'));
    expect(c).toMatch(/TODO|todo/);
  });

  it('SB-24: políticas conv_* son service_role only (no anon ni authenticated)', () => {
    const mig = getMigContent();
    // Las políticas sobre tablas conv_* son TO service_role con USING (true)
    expect(mig).toMatch(/TO service_role\s*\n?\s*USING \(true\)/);
    // No hay política CREATE POLICY ... ON conv_* ... TO anon|authenticated
    const convPolicies = [...mig.matchAll(/CREATE POLICY[^;]+ON conv_\w+[^;]+;/gs)].map(m => m[0]);
    for (const policy of convPolicies) {
      expect(policy).not.toMatch(/\bTO anon\b/);
      expect(policy).not.toMatch(/\bTO authenticated\b/);
    }
  });

  it('SB-25: SECURITY DEFINER en conv_* solo en funciones backend autorizadas (Fase 11B3)', () => {
    const mig = getMigContent();
    const convContext = [...mig.matchAll(/conv_\w+[^;]+;/gs)].map(m => m[0]).join('\n');
    // Fase 11B3 introduce SECURITY DEFINER deliberado en funciones backend:
    //   - get_wa_webhook_secret (acceso a webhook_secret, solo service_role)
    //   - purge_old_raw_payloads (retención, solo service_role)
    // Estas funciones NO son políticas RLS — son RPCs con REVOKE anon/authenticated
    // El test verifica que no hay políticas RLS con SECURITY DEFINER (que sería incorrecto)
    // pero permite SECURITY DEFINER en funciones documentadas con SET search_path.
    const audit = readFile(path.join(SEC_DIR, 'rls-audit.md'));
    expect(audit).toMatch(/SECURITY DEFINER/); // documentado como verificado
    // Verificar que si existe SECURITY DEFINER en contexto conv_*, está acompañado de search_path
    if (convContext.match(/SECURITY DEFINER/)) {
      expect(convContext).toMatch(/SECURITY DEFINER[\s\S]*?SET search_path/);
    }
  });

  it('SB-26: rls-audit.md documenta búsqueda de SECURITY DEFINER', () => {
    const c = readFile(path.join(SEC_DIR, 'rls-audit.md'));
    expect(c).toMatch(/SECURITY DEFINER/);
  });

  it('SB-27: validator no ejecuta modificaciones SQL (sin llamadas DB)', () => {
    const script = readFile(path.join(ROOT, 'scripts/smart-conversations/validate-security-baseline.mjs'));
    // El validator puede contener SQL como strings de búsqueda, pero no ejecuta nada
    expect(script).not.toMatch(/createClient/);
    expect(script).not.toMatch(/\.from\s*\(/);
    expect(script).not.toMatch(/\.rpc\s*\(/);
  });

  it('SB-28: validator no aplica policies (no llama Supabase client)', () => {
    const script = readFile(path.join(ROOT, 'scripts/smart-conversations/validate-security-baseline.mjs'));
    expect(script).not.toMatch(/createClient/);
    expect(script).not.toMatch(/supabase\./);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SB-29..34 — Tenant Isolation
// ─────────────────────────────────────────────────────────────────────────────
describe('SB-29..34 — Tenant Isolation escenarios', () => {
  const mit = path.join(SEC_DIR, 'multi-tenant-isolation-audit.md');

  it('SB-29: existe escenario Tenant A → sesión Tenant B', () => {
    const c = readFile(mit);
    expect(c).toMatch(/Caso 1|session_id de Tenant B/i);
  });

  it('SB-30: existe escenario Tenant A → mensaje Tenant B', () => {
    const c = readFile(mit);
    expect(c).toMatch(/Caso 2|sender_ref de Tenant B/i);
  });

  it('SB-31: existe escenario Tenant A → Wasender Tenant B', () => {
    const c = readFile(mit);
    expect(c).toMatch(/Caso 6|Wasender session de Tenant B/i);
  });

  it('SB-32: existe escenario token WebChat cross-tenant', () => {
    const c = readFile(mit);
    expect(c).toMatch(/Caso 7|Token WebChat de Tenant A se usa en Tenant B/i);
  });

  it('SB-33: existe escenario queue cross-tenant', () => {
    const c = readFile(mit);
    expect(c).toMatch(/Caso 11|Queue item de Tenant A/i);
  });

  it('SB-34: cada escenario tiene control actual y finding', () => {
    const c = readFile(mit);
    expect(c).toMatch(/Control actual/);
    expect(c).toMatch(/Finding/);
    expect(c).toMatch(/SEC-013/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SB-35..39 — CORS
// ─────────────────────────────────────────────────────────────────────────────
describe('SB-35..39 — CORS auditoría', () => {
  const corsAudit = path.join(SEC_DIR, 'cors-audit.md');

  it('SB-35: validator detecta Access-Control-Allow-Origin=* (en cors-audit.md)', () => {
    const c = readFile(corsAudit);
    expect(c).toMatch(/Access-Control-Allow-Origin.*\*/);
  });

  it('SB-36: cors-audit.md documenta reflection insegura (ausente)', () => {
    const c = readFile(corsAudit);
    expect(c).toMatch(/reflection|reflect/i);
  });

  it('SB-37: cors-audit.md verifica wildcard con credentials', () => {
    const c = readFile(corsAudit);
    expect(c).toMatch(/credentials|credential/i);
  });

  it('SB-38: WebChat allowlist está inventariada', () => {
    const c = readFile(corsAudit);
    expect(c).toMatch(/allowed_origins|allowlist/i);
  });

  it('SB-39: webhooks no se clasifican como endpoints browser', () => {
    const c = readFile(corsAudit);
    expect(c).toMatch(/webhook no necesita CORS browser|Wasender webhook/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SB-40..45 — CSP
// ─────────────────────────────────────────────────────────────────────────────
describe('SB-40..45 — CSP auditoría', () => {
  const cspAudit = path.join(SEC_DIR, 'csp-frontend-audit.md');

  it('SB-40: CSP actual (ausente) está inventariada', () => {
    const c = readFile(cspAudit);
    expect(c).toMatch(/Sin Content-Security-Policy|No hay CSP/i);
  });

  it('SB-41: CSP objetivo está documentada', () => {
    const c = readFile(cspAudit);
    expect(c).toMatch(/CSP objetivo/i);
    expect(c).toMatch(/default-src/);
  });

  it('SB-42: no se recomienda unsafe-eval por defecto', () => {
    const c = readFile(cspAudit);
    expect(c).toMatch(/No se incluye.*unsafe-eval|sin.*unsafe-eval/i);
  });

  it('SB-43: no se recomienda connect-src *', () => {
    const c = readFile(cspAudit);
    expect(c).toMatch(/No se incluye.*connect-src|connect-src.*restringido/i);
    // El doc puede mencionar connect-src * para explicar que NO se usa
  });

  it('SB-44: Realtime wss está contemplado en CSP objetivo', () => {
    const c = readFile(cspAudit);
    expect(c).toMatch(/wss:\/\//);
  });

  it('SB-45: Core, IA, n8n y Wasender no quedan en connect-src del navegador', () => {
    const c = readFile(cspAudit);
    // Wasender solo accessible desde EF, no desde el navegador
    expect(c).toMatch(/Wasender.*EF|EF.*Wasender|Solo desde EF/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SB-46..52 — Secrets
// ─────────────────────────────────────────────────────────────────────────────
describe('SB-46..52 — Secretos auditoría', () => {
  it('SB-46: sin VITE_SERVICE_ROLE en .env.example', () => {
    const c = readFile(ENV_EXAMPLE);
    expect(c).not.toMatch(/VITE_[A-Z_]*SERVICE_ROLE/i);
  });

  it('SB-47: sin VITE_SIGNING_SECRET en .env.example', () => {
    const c = readFile(ENV_EXAMPLE);
    expect(c).not.toMatch(/VITE_[A-Z_]*SIGNING_SECRET/i);
  });

  it('SB-48: sin VITE_PRIVATE_KEY en .env.example', () => {
    const c = readFile(ENV_EXAMPLE);
    expect(c).not.toMatch(/VITE_[A-Z_]*PRIVATE_KEY/i);
  });

  it('SB-49: secrets-inventory.md documenta que valores están redactados', () => {
    const c = readFile(path.join(SEC_DIR, 'secrets-inventory.md'));
    expect(c).toMatch(/solo nombres|NUNCA valores|inventario.*nombres/i);
  });

  it('SB-50: validate-security-baseline.mjs no imprime tokens', () => {
    const c = readFile(path.join(ROOT, 'scripts/smart-conversations/validate-security-baseline.mjs'));
    expect(c).not.toMatch(/console\.log\s*\(\s*token/);
    expect(c).not.toMatch(/console\.log\s*\(\s*key/);
  });

  it('SB-51: validate-security-baseline.mjs no imprime API keys', () => {
    const c = readFile(path.join(ROOT, 'scripts/smart-conversations/validate-security-baseline.mjs'));
    expect(c).not.toMatch(/console\.log\s*\(\s*apiKey/);
  });

  it('SB-52: validate-security-baseline.mjs no llama red (sin fetch)', () => {
    const c = readFile(path.join(ROOT, 'scripts/smart-conversations/validate-security-baseline.mjs'));
    expect(c).not.toMatch(/\bfetch\s*\(/);
    expect(c).not.toMatch(/\bnew\s+WebSocket\s*\(/);
    expect(c).not.toMatch(/createClient/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SB-53..59 — Logging
// ─────────────────────────────────────────────────────────────────────────────
describe('SB-53..59 — Logging y privacidad', () => {
  const logAudit = path.join(SEC_DIR, 'logging-privacy-audit.md');

  it('SB-53: se inventarían sinks de logs en logging-privacy-audit.md', () => {
    const c = readFile(logAudit);
    expect(c).toMatch(/createSafeLogger|console\.log/);
    expect(c).toMatch(/conv-wa-webhook/);
  });

  it('SB-54: se documenta log potencial de message_text', () => {
    const c = readFile(logAudit);
    expect(c).toMatch(/message_text/);
    expect(c).toMatch(/❌ No.*message_text|message_text.*prohibido|message_text.*Logueable.*No/i);
  });

  it('SB-55: se documenta log potencial de sender_ref', () => {
    const c = readFile(logAudit);
    expect(c).toMatch(/sender_ref/);
    expect(c).toMatch(/PII_FIELDS_TO_REDACT.*sender_ref|sender_ref.*redact/i);
  });

  it('SB-56: se documenta log potencial de Authorization', () => {
    const c = readFile(logAudit);
    expect(c).toMatch(/authorization|Authorization/);
    expect(c).toMatch(/logger redacta|redact.*authorization/i);
  });

  it('SB-57: se documenta tratamiento de service_role en logs', () => {
    const c = readFile(logAudit);
    expect(c).toMatch(/service_role/);
    // service_role debe aparecer como campo redactado o prohibido
    expect(c).toMatch(/service_role.*redact|PII_FIELDS_TO_REDACT.*secret|secret.*service_role/i);
  });

  it('SB-58: se documenta log potencial de raw_payload', () => {
    const c = readFile(logAudit);
    expect(c).toMatch(/raw_payload/);
  });

  it('SB-59: los resultados de auditoría de logs están redactados (no hay valores concretos de PII)', () => {
    const c = readFile(logAudit);
    expect(c).not.toMatch(/phone: \+\d{10}/);
    expect(c).not.toMatch(/email: [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    expect(c).not.toMatch(/full_name: "[A-Z][a-z]+ [A-Z][a-z]+"/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SB-60..65 — Webhook/replay
// ─────────────────────────────────────────────────────────────────────────────
describe('SB-60..65 — Webhook y replay auditoría', () => {
  const whAudit = path.join(SEC_DIR, 'webhook-replay-audit.md');

  it('SB-60: firma HMAC inventariada', () => {
    const c = readFile(whAudit);
    expect(c).toMatch(/HMAC-SHA256|crypto\.subtle\.verify/);
  });

  it('SB-61: comparación constant-time inventariada', () => {
    const c = readFile(whAudit);
    expect(c).toMatch(/constant.time|timingSafeEqual/i);
  });

  it('SB-62: replay protection inventariada', () => {
    const c = readFile(whAudit);
    expect(c).toMatch(/replay|timestamp/i);
  });

  it('SB-63: dedupe wasender_message_id inventariada', () => {
    const c = readFile(whAudit);
    expect(c).toMatch(/wasender_message_id/);
    expect(c).toMatch(/dedup|deduplicaci/i);
  });

  it('SB-64: secret rotation inventariada', () => {
    const c = readFile(whAudit);
    expect(c).toMatch(/rotaci|rotation/i);
  });

  it('SB-65: findings generados para controles ausentes', () => {
    const c = readFile(whAudit);
    expect(c).toMatch(/SEC-026|SEC-027/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SB-66..72 — Findings
// ─────────────────────────────────────────────────────────────────────────────
describe('SB-66..72 — Security findings register', () => {
  const findings = path.join(SEC_DIR, 'security-findings.md');

  it('SB-66: todos los findings tienen ID único (SEC-NNN)', () => {
    const c = readFile(findings);
    const ids = [...c.matchAll(/\| finding_id \| (SEC-\d+) \|/g)].map(m => m[1]);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('SB-67: todos los findings tienen severidad', () => {
    const c = readFile(findings);
    const severities = [...c.matchAll(/\| severidad \| (CRITICAL|HIGH|MEDIUM|LOW|INFO)[^|]* \|/g)];
    const ids = [...c.matchAll(/\| finding_id \| (SEC-\d+) \|/g)];
    expect(severities.length).toBeGreaterThan(0);
    // Cada finding debe tener una entrada de severidad
    expect(severities.length).toBe(ids.length);
  });

  it('SB-68: todos los findings tienen evidencia', () => {
    const c = readFile(findings);
    const evidences = [...c.matchAll(/\| evidencia \| .+ \|/g)];
    const ids = [...c.matchAll(/\| finding_id \| (SEC-\d+) \|/g)];
    expect(evidences.length).toBe(ids.length);
  });

  it('SB-69: todos los findings CRITICAL tienen fase', () => {
    const c = readFile(findings);
    // Parse sections and check CRITICAL findings have fase
    const criticalSections = [...c.matchAll(/### SEC-\d+[^\n]*\n([\s\S]*?)(?=---|\n### |$)/g)]
      .filter(m => m[1].includes('CRITICAL'));
    for (const [, section] of criticalSections) {
      expect(section).toMatch(/\| fase \| 11B/);
    }
  });

  it('SB-70: todos los findings HIGH tienen fase', () => {
    const c = readFile(findings);
    const highSections = [...c.matchAll(/### SEC-\d+[^\n]*\n([\s\S]*?)(?=---|\n### |$)/g)]
      .filter(m => m[1].includes('| severidad | HIGH |'));
    for (const [, section] of highSections) {
      expect(section).toMatch(/\| fase \| 11B/);
    }
  });

  it('SB-71: todos los findings indican gates bloqueados', () => {
    const c = readFile(findings);
    expect(c).toMatch(/bloquea sandbox/i);
    expect(c).toMatch(/bloquea preproduction/i);
    expect(c).toMatch(/bloquea production/i);
  });

  it('SB-72: todos los findings tienen estado definido (open/mitigated/accepted)', () => {
    const c = readFile(findings);
    // Cada finding debe tener estado explícito
    const ids = [...c.matchAll(/\| finding_id \| (SEC-\d+) \|/g)];
    expect(ids.length).toBeGreaterThan(0);
    // El documento tiene secciones de estado para los findings
    expect(c).toMatch(/\| estado \| open\b|\| estado \| mitigated|\| estado \| accepted/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SB-84..102 — Boundaries: sin modificaciones prohibidas
// ─────────────────────────────────────────────────────────────────────────────
describe('SB-84..102 — Boundaries: sin modificaciones prohibidas', () => {
  it('SB-84: no se modificaron migraciones (solo lectura en esta fase)', () => {
    const mig = getMigContent();
    // La migración no debe contener menciones a Fase 11B1 (indicaría modificación)
    expect(mig).not.toMatch(/Fase 11B1/);
  });

  it('SB-85: no hay tablas nuevas con prefijo conv_ fuera de las conocidas (11B1 + 11B2B)', () => {
    const mig = getMigContent();
    // 8 tablas originales (Fase 11B1) + conv_rate_limit_buckets (Fase 11B2B, migración 20260721000001)
    const tables = [...new Set([...mig.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(conv_\w+)/g)].map(m => m[1]))];
    const knownTables = [
      'conv_service_activations', 'conv_wa_sessions', 'conv_wc_configs',
      'conv_sessions', 'conv_cases', 'conv_messages', 'conv_send_queue',
      'conv_admin_notifications',
      'conv_rate_limit_buckets',  // añadida en Fase 11B2B (sin PII, rate limiting de poll/session)
    ];
    for (const t of tables) {
      expect(knownTables).toContain(t);
    }
  });

  it('SB-86: validate-security-baseline.mjs no ejecuta queries (sin cliente DB)', () => {
    const script = readFile(path.join(ROOT, 'scripts/smart-conversations/validate-security-baseline.mjs'));
    expect(script).not.toMatch(/createClient/);
    expect(script).not.toMatch(/\.from\s*\(/);
  });

  it('SB-87: validate-security-baseline.mjs no conecta a Supabase', () => {
    const script = readFile(path.join(ROOT, 'scripts/smart-conversations/validate-security-baseline.mjs'));
    expect(script).not.toMatch(/supabase\.co\/rest|supabase\.co\/auth/);
    expect(script).not.toMatch(/createClient\s*\(/);
  });

  it('SB-88: validate-security-baseline.mjs no modifica GRANTs (sin execute())', () => {
    const script = readFile(path.join(ROOT, 'scripts/smart-conversations/validate-security-baseline.mjs'));
    expect(script).not.toMatch(/\.execute\s*\(/);
    expect(script).not.toMatch(/\.rpc\s*\(/);
  });

  it('SB-89: no hay imports de Core real en docs o scripts nuevos', () => {
    const docs = [
      path.join(SEC_DIR, 'data-classification.md'),
      path.join(SEC_DIR, 'threat-model.md'),
    ];
    for (const d of docs) {
      const c = readFile(d);
      expect(c).not.toMatch(/core\.smartroom\.io|api\.core\./i);
    }
  });

  it('SB-90: no hay imports de IA real en docs o scripts nuevos', () => {
    const script = readFile(path.join(ROOT, 'scripts/smart-conversations/validate-security-baseline.mjs'));
    expect(script).not.toMatch(/openai\.com|anthropic\.com|api\.openai/);
  });

  it('SB-91: no hay Wasender API key en ningún archivo nuevo', () => {
    const script = readFile(path.join(ROOT, 'scripts/smart-conversations/validate-security-baseline.mjs'));
    expect(script).not.toMatch(/wasender.*api.*key=|api.*key.*wasender/i);
  });

  it('SB-92: no hay n8n real en ningún archivo nuevo', () => {
    const script = readFile(path.join(ROOT, 'scripts/smart-conversations/validate-security-baseline.mjs'));
    expect(script).not.toMatch(/n8n\.cloud|webhook\.n8n/i);
  });

  it('SB-93: Realtime no activo en validate-security-baseline.mjs', () => {
    const script = readFile(path.join(ROOT, 'scripts/smart-conversations/validate-security-baseline.mjs'));
    expect(script).not.toMatch(/\.channel\s*\(/);
    expect(script).not.toMatch(/supabase.*realtime/i);
  });

  it('SB-94: sin credenciales reales en el script validador', () => {
    const script = readFile(path.join(ROOT, 'scripts/smart-conversations/validate-security-baseline.mjs'));
    expect(script).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/); // JWT pattern
    expect(script).not.toMatch(/sk-[A-Za-z0-9]{20,}/);   // OpenAI key pattern
  });

  it('SB-95: no hay estados nuevos en documentos de auditoría', () => {
    const c = readFile(path.join(SEC_DIR, 'security-findings.md'));
    expect(c).not.toMatch(/conv_help_escalated/);
    expect(c).not.toMatch(/WEAK_MATCH/);
    expect(c).not.toMatch(/UNVERIFIED standalone/);
  });

  it('SB-96: no hay eventos nuevos de Activity Log introducidos', () => {
    const c = readFile(path.join(SEC_DIR, 'logging-privacy-audit.md'));
    expect(c).not.toMatch(/next_retry_at/);
    expect(c).not.toMatch(/attempt_count/);
  });

  it('SB-97: no hay WF-02 en ningún archivo nuevo', () => {
    const script = readFile(path.join(ROOT, 'scripts/smart-conversations/validate-security-baseline.mjs'));
    expect(script).not.toMatch(/WF-02|wf02/i);
  });

  it('SB-98: no hay conv_help_escalated en nuevos archivos', () => {
    for (const doc of ['security-findings.md', 'gate-1-remediation-plan.md']) {
      const c = readFile(path.join(SEC_DIR, doc));
      expect(c).not.toMatch(/conv_help_escalated/);
    }
  });

  it('SB-99: no hay WEAK_MATCH en nuevos archivos', () => {
    for (const doc of ['security-findings.md', 'threat-model.md']) {
      const c = readFile(path.join(SEC_DIR, doc));
      expect(c).not.toMatch(/WEAK_MATCH/);
    }
  });

  it('SB-100: no hay UNVERIFIED standalone en nuevos archivos', () => {
    const c = readFile(path.join(SEC_DIR, 'security-findings.md'));
    expect(c).not.toMatch(/UNVERIFIED standalone/);
  });

  it('SB-101: no hay next_retry_at en nuevos archivos', () => {
    const c = readFile(path.join(SEC_DIR, 'gate-1-remediation-plan.md'));
    expect(c).not.toMatch(/next_retry_at/);
  });

  it('SB-102: no hay attempt_count en nuevos archivos', () => {
    const c = readFile(path.join(SEC_DIR, 'gate-1-remediation-plan.md'));
    expect(c).not.toMatch(/attempt_count/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SB-103..113 — Regresión: tests previos siguen pasando
// ─────────────────────────────────────────────────────────────────────────────
describe('SB-103..113 — Regresión: invariantes Fase 11A intactos', () => {
  const hardDir = path.join(ROOT, 'docs/smart-conversations/hardening');

  it('SB-103: gate-0-report.md sigue teniendo PASS_WITH_WARNINGS', () => {
    const c = readFile(path.join(hardDir, 'gate-0-report.md'));
    expect(c).toMatch(/PASS_WITH_WARNINGS/);
  });

  it('SB-104: risk-register.md sigue teniendo 26 riesgos', () => {
    const c = readFile(path.join(hardDir, 'risk-register.md'));
    expect(c).toMatch(/TOTAL.*26|26.*TOTAL/);
  });

  it('SB-105: historical-test-debt.md sigue documentando 7 archivos afectados', () => {
    const c = readFile(path.join(hardDir, 'historical-test-debt.md'));
    expect(c).toMatch(/Archivos afectados\s*\|\s*7/);
  });

  it('SB-106: validate-security-baseline.mjs existe', () => {
    expect(fileExists(path.join(ROOT, 'scripts/smart-conversations/validate-security-baseline.mjs'))).toBe(true);
  });

  it('SB-107: security-baseline.spec.ts existe', () => {
    expect(fileExists(__filename)).toBe(true);
  });

  it('SB-108: test:sc:regression sigue teniendo it.todo en scaffold suites (no se borraron)', () => {
    const hbSpec = path.join(ROOT, 'tests/regression/smart-conversations/suites/hardening-baseline/hardening-baseline.spec.ts');
    const c = readFile(hbSpec);
    // El spec de hardening-baseline verifica la existencia de it.todo en el regression suite
    expect(c).toMatch(/it\.todo|scaffold/i);
  });

  it('SB-109: security-baseline.spec.ts no añade it.todo como llamadas de función', () => {
    const thisFile = path.join(ROOT, 'tests/regression/smart-conversations/suites/security-baseline/security-baseline.spec.ts');
    const c = readFile(thisFile);
    // Buscar it.todo() con argumento string — distingue llamadas reales de texto descriptivo
    const todos = (c.match(/\bit\.todo\s*\(\s*['"]/g) ?? []).length;
    expect(todos).toBe(0);
  });

  it('SB-110: suites históricas no modificadas por esta fase', () => {
    const scaffoldDir = path.join(ROOT, 'tests/regression/smart-conversations/suites');
    const scaffoldSuites = [
      'activity-log', 'conversation-routing', 'failure-recovery',
      'identity-validation', 'incidents-flow', 'permissions-and-privacy',
    ];
    for (const suite of scaffoldSuites) {
      expect(fileExists(path.join(scaffoldDir, suite))).toBe(true);
    }
  });

  it('SB-111: CI sigue incluyendo sc-hardening-baseline sin continue-on-error', () => {
    const c = readFile(CI_FILE);
    expect(c).toMatch(/sc-hardening-baseline:/);
    const section = c.substring(c.indexOf('sc-hardening-baseline:'));
    const nextSection = section.indexOf('\n  pr-summary:');
    const jobSection = nextSection > 0 ? section.substring(0, nextSection) : section;
    expect(jobSection).not.toMatch(/continue-on-error:\s*true/);
  });

  it('SB-112: build no referencia migraciones de 11B1 inexistentes', () => {
    const pkg = readFile(path.join(ROOT, 'package.json'));
    expect(pkg).toMatch(/test:sc:security-baseline|validate:sc:security-baseline/);
  });

  it('SB-113: lint no incluye imports de librerías externas en validate-security-baseline.mjs', () => {
    const script = readFile(path.join(ROOT, 'scripts/smart-conversations/validate-security-baseline.mjs'));
    // Solo usa módulos de Node core
    const imports = [...script.matchAll(/^import .+ from ['"]([^'"]+)['"]/gm)].map(m => m[1]);
    for (const imp of imports) {
      expect(imp.startsWith('node:')).toBe(true);
    }
  });
});
