/**
 * security-adversarial.spec.ts — Fase 11B4
 * Pruebas adversariales estáticas para SmartConversations.
 *
 * Cobertura:
 *   - SRA-ASYNC-*    (20): cada EF usa await isServiceRoleRequest
 *   - SRA-NOSYNC-*   (20): ninguna EF llama sin await
 *   - SRA-CSP-*      (12): CSP y cabeceras HTTP
 *   - SRA-ACTIVITY-* (13): 13 eventos oficiales del Activity Log
 *   - SRA-PII-*       (8): campos PII prohibidos en Activity Log
 *   - SRA-ADAPT-*    (10): minimización en adapters
 *   - SRA-BOUND-*    (15): boundaries y contratos Fase 11B4
 *
 * Total: 98 tests estáticos
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../../../../');
const EF_DIR = join(ROOT, 'supabase/functions');

function readFile(relPath: string): string {
  try { return readFileSync(join(ROOT, relPath), 'utf-8'); } catch { return ''; }
}

function fileExists(relPath: string): boolean {
  return existsSync(join(ROOT, relPath));
}

function readEF(name: string): string {
  return readFile(`supabase/functions/${name}/index.ts`);
}

// Las 20 EFs que deben usar await isServiceRoleRequest (Fase 11B3 + 11B4)
const EFS_ASYNC_SERVICE_ROLE = [
  'conv-core-publish-activity',
  'conv-core-query-listings',
  'conv-wf30-listings',
  'conv-wf40-help',
  'conv-core-create-lead',
  'conv-send-wa',
  'conv-core-create-incident',
  'conv-core-get-tenant-features',
  'conv-close-case',
  'conv-wf20-incidents',
  'conv-core-query-help-kb',
  'conv-core-create-help-ticket',
  'conv-core-validate-identity',
  'conv-routing-engine',
  'conv-identity-progressive',
  'conv-dispatch-message',
  'conv-process-send-queue',
  'conv-ingest',
  'conv-escalate-case',
  'conv-web-deliver',
] as const;

// Los 13 eventos oficiales del Activity Log (rules-75 §4.2)
const OFFICIAL_ACTIVITY_EVENTS = [
  'conv_subscription_activated',
  'conv_channel_connected',
  'conv_channel_offboarded',
  'conv_conversation_started',
  'conv_identity_validated',
  'conv_pre_incident_created',
  'conv_incident_created',
  'conv_lead_created',
  'conv_case_escalated',
  'conv_case_summary_updated',
  'conv_case_closed',
  'conv_case_created',
  'conv_message_delivery_failed',
] as const;

// PII prohibida en Activity Log payload
const PII_FORBIDDEN_IN_ACTIVITY = [
  'profile_id',
  'phone_number',
  'full_name',
  'room_label',
  'residence_name',
  'email',
  'assignment_id',
  'sender_ref',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// SRA-ASYNC — 20 tests: cada EF usa await isServiceRoleRequest
// ─────────────────────────────────────────────────────────────────────────────

describe('SRA-ASYNC — Todas las EFs usan await isServiceRoleRequest', () => {
  for (const ef of EFS_ASYNC_SERVICE_ROLE) {
    it(`SRA-ASYNC-${ef}`, () => {
      const src = readEF(ef);
      expect(src, `${ef} debe usar await isServiceRoleRequest`).toMatch(
        /await isServiceRoleRequest\(/
      );
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SRA-NOSYNC — 20 tests: ninguna EF llama sin await (Promise como booleano)
// ─────────────────────────────────────────────────────────────────────────────

describe('SRA-NOSYNC — Ninguna EF usa isServiceRoleRequest sin await', () => {
  for (const ef of EFS_ASYNC_SERVICE_ROLE) {
    it(`SRA-NOSYNC-${ef}`, () => {
      const src = readEF(ef);
      // Patrón sync peligroso: if (!isServiceRoleRequest( o if (isServiceRoleRequest(
      expect(src, `${ef} no debe tener if (!isServiceRoleRequest( sin await`).not.toMatch(
        /if\s*\(\s*!\s*isServiceRoleRequest\s*\(/
      );
      expect(src, `${ef} no debe tener if (isServiceRoleRequest( sin await`).not.toMatch(
        /if\s*\(\s*isServiceRoleRequest\s*\(/
      );
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SRA-CSP — 12 tests: CSP y cabeceras de seguridad
// ─────────────────────────────────────────────────────────────────────────────

describe('SRA-CSP — CSP y cabeceras de seguridad en vercel.json', () => {
  const vercel = readFile('vercel.json');

  it('SRA-CSP-01: Content-Security-Policy presente', () => {
    expect(vercel).toMatch(/Content-Security-Policy/);
  });

  it('SRA-CSP-02: frame-ancestors none (clickjacking)', () => {
    expect(vercel).toContain("frame-ancestors 'none'");
  });

  it('SRA-CSP-03: object-src none (plugin execution)', () => {
    expect(vercel).toContain("object-src 'none'");
  });

  it('SRA-CSP-04: base-uri self (base injection)', () => {
    expect(vercel).toContain("base-uri 'self'");
  });

  it('SRA-CSP-05: form-action self (form hijacking)', () => {
    expect(vercel).toContain("form-action 'self'");
  });

  it('SRA-CSP-06: X-Content-Type-Options nosniff (MIME sniffing)', () => {
    expect(vercel).toContain('X-Content-Type-Options');
    expect(vercel).toContain('nosniff');
  });

  it('SRA-CSP-07: Referrer-Policy presente', () => {
    expect(vercel).toContain('Referrer-Policy');
  });

  it('SRA-CSP-08: Permissions-Policy restringe cámara y micrófono', () => {
    expect(vercel).toMatch(/camera=\(\)/);
    expect(vercel).toMatch(/microphone=\(\)/);
  });

  it('SRA-CSP-09: Permissions-Policy restringe geolocation y payment', () => {
    expect(vercel).toMatch(/geolocation=\(\)/);
    expect(vercel).toMatch(/payment=\(\)/);
  });

  it('SRA-CSP-10: connect-src permite supabase sin wildcard', () => {
    expect(vercel).toContain('supabase.co');
    const connectSrc = vercel.match(/connect-src\s+([^;'"]+)/)?.[1] ?? '';
    expect(connectSrc).not.toMatch(/\s\*\s|\s\*$|^\*/);
  });

  it('SRA-CSP-11: upgrade-insecure-requests (HTTPS enforcement)', () => {
    expect(vercel).toContain('upgrade-insecure-requests');
  });

  it('SRA-CSP-12: no unsafe-eval en ninguna directiva CSP', () => {
    const cspValue = vercel.match(/Content-Security-Policy[^"]*"([^"]+)"/)?.[1] ?? '';
    expect(cspValue).not.toContain('unsafe-eval');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SRA-ACTIVITY — 13 tests: eventos oficiales presentes en allowlist
// ─────────────────────────────────────────────────────────────────────────────

describe('SRA-ACTIVITY — 13 eventos oficiales del Activity Log', () => {
  const publishSrc = readEF('conv-core-publish-activity');

  for (const evt of OFFICIAL_ACTIVITY_EVENTS) {
    it(`SRA-ACTIVITY-${evt}: presente en ALLOWED_EVENT_TYPES`, () => {
      expect(publishSrc, `${evt} debe estar en la allowlist`).toContain(evt);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SRA-PII — 8 tests: campos PII prohibidos en Activity Log
// ─────────────────────────────────────────────────────────────────────────────

describe('SRA-PII — Campos PII prohibidos en payload Activity Log', () => {
  const publishSrc = readEF('conv-core-publish-activity');

  for (const piiField of PII_FORBIDDEN_IN_ACTIVITY) {
    it(`SRA-PII-${piiField}: detectado y rechazado en payload`, () => {
      expect(publishSrc, `${piiField} debe estar en PII_FIELDS_FORBIDDEN_IN_ACTIVITY`)
        .toContain(piiField);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SRA-ADAPT — 10 tests: minimización en adapters
// ─────────────────────────────────────────────────────────────────────────────

describe('SRA-ADAPT — Minimización de datos en adapters (add-ons)', () => {
  it('SRA-ADAPT-01: dispatch-message no expone service_role en payload saliente', () => {
    const src = readEF('conv-dispatch-message');
    expect(src).not.toMatch(/service_role['"]\s*:/);
  });

  it('SRA-ADAPT-02: routing-engine no expone identity_data a n8n/add-ons', () => {
    const src = readEF('conv-routing-engine');
    expect(src).not.toMatch(/identity_data.*n8n|forward.*identity_data/);
  });

  it('SRA-ADAPT-03: wf20-incidents no incluye raw_payload en payload n8n', () => {
    const src = readEF('conv-wf20-incidents');
    expect(src).not.toMatch(/raw_payload.*body|body.*raw_payload/);
  });

  it('SRA-ADAPT-04: wf30-listings no expone assignment_id en respuesta de canal', () => {
    const src = readEF('conv-wf30-listings');
    expect(src).not.toMatch(/assignment_id.*return\s*ok|return\s*ok.*assignment_id/);
  });

  it('SRA-ADAPT-05: wf40-help no incluye profile_id en payload escalation', () => {
    const src = readEF('conv-wf40-help');
    expect(src).not.toMatch(/profile_id.*escalat|escalat.*profile_id/);
  });

  it('SRA-ADAPT-06: send-wa no reenvía webhook_secret ni signing_secret', () => {
    const src = readEF('conv-send-wa');
    expect(src).not.toMatch(/webhook_secret.*body|body.*webhook_secret/);
    expect(src).not.toMatch(/signing_secret.*body|body.*signing_secret/);
  });

  it('SRA-ADAPT-07: identity-progressive no expone raw_payload al canal', () => {
    const src = readEF('conv-identity-progressive');
    expect(src).not.toMatch(/raw_payload.*ok\(|ok\(.*raw_payload/);
  });

  it('SRA-ADAPT-08: core-create-lead no reenvía phone_number al canal', () => {
    const src = readEF('conv-core-create-lead');
    expect(src).not.toMatch(/phone_number.*return ok|return ok.*phone_number/);
  });

  it('SRA-ADAPT-09: core-query-help-kb no expone JID ni sender_ref', () => {
    const src = readEF('conv-core-query-help-kb');
    expect(src).not.toMatch(/sender_ref.*forward|jid.*forward/);
  });

  it('SRA-ADAPT-10: ningún add-on recibe enum interno STRONG_MATCH_ACTIVE o PARTIAL_MATCH_ACTIVE', () => {
    const adapters = [
      'conv-core-create-lead', 'conv-core-create-incident',
      'conv-core-query-listings', 'conv-core-query-help-kb',
      'conv-core-create-help-ticket', 'conv-wf20-incidents',
      'conv-wf30-listings', 'conv-wf40-help',
    ].map(readEF).join('\n');
    expect(adapters).not.toMatch(/STRONG_MATCH_ACTIVE.*n8n|n8n.*STRONG_MATCH_ACTIVE/);
    expect(adapters).not.toMatch(/PARTIAL_MATCH_ACTIVE.*n8n|n8n.*PARTIAL_MATCH_ACTIVE/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SRA-BOUND — 15 tests: boundaries y contratos de Fase 11B4
// ─────────────────────────────────────────────────────────────────────────────

describe('SRA-BOUND — Boundaries y contratos de Fase 11B4', () => {
  // Los comentarios JSDoc pueden mencionar términos prohibidos para documentar restricciones.
  // Solo verificamos que NO aparecen como código ejecutable (fuera de líneas de comentario).
  function stripComments(src: string): string {
    // Elimina líneas de comentario (* ...) y comentarios de bloque
    return src
      .split('\n')
      .filter(line => !line.trimStart().startsWith('*') && !line.trimStart().startsWith('//'))
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '');
  }

  it('SRA-BOUND-01: no se introdujo WF-02 en código ejecutable de las EFs', () => {
    const all = EFS_ASYNC_SERVICE_ROLE.map(ef => stripComments(readEF(ef))).join('\n');
    expect(all).not.toContain('WF-02');
  });

  it('SRA-BOUND-02: no se introdujo conv_help_escalated en código ejecutable', () => {
    const all = EFS_ASYNC_SERVICE_ROLE.map(ef => stripComments(readEF(ef))).join('\n');
    expect(all).not.toContain('conv_help_escalated');
  });

  it('SRA-BOUND-03: no se introdujo WEAK_MATCH en código ejecutable', () => {
    const all = EFS_ASYNC_SERVICE_ROLE.map(ef => stripComments(readEF(ef))).join('\n');
    expect(all).not.toContain('WEAK_MATCH');
  });

  it('SRA-BOUND-04: no se introdujo next_retry_at en código ejecutable (solo next_attempt_at)', () => {
    const all = EFS_ASYNC_SERVICE_ROLE.map(ef => stripComments(readEF(ef))).join('\n');
    expect(all).not.toContain('next_retry_at');
  });

  it('SRA-BOUND-05: no se introdujo attempt_count en EFs SmartConversations (campo de SAL, no SC)', () => {
    // attempt_count es campo de SAL (sal-execute-command), no de SmartConversations
    const all = EFS_ASYNC_SERVICE_ROLE.map(ef => stripComments(readEF(ef))).join('\n');
    expect(all).not.toContain('attempt_count');
  });

  it('SRA-BOUND-06: constant-time.ts existe (SEC-012)', () => {
    expect(fileExists('supabase/functions/_shared/smart-conversations/runtime/constant-time.ts')).toBe(true);
  });

  it('SRA-BOUND-07: ef-auth.ts async usa timingSafeEqual (no === como comparación principal)', () => {
    const auth = readFile('supabase/functions/_shared/smart-conversations/ef-auth.ts');
    expect(auth).toContain('timingSafeEqual');
    expect(auth).not.toMatch(/return bearerToken\s*===\s*serviceRoleKey/);
  });

  it('SRA-BOUND-08: ef-logger.ts no expone Authorization en logs', () => {
    const logger = readFile('supabase/functions/_shared/smart-conversations/ef-logger.ts');
    expect(logger).toContain("'authorization'");
    expect(logger).toContain("'bearer'");
  });

  it('SRA-BOUND-09: cors-policy.ts no tiene wildcard *', () => {
    const cors = readFile('supabase/functions/_shared/smart-conversations/cors-policy.ts');
    expect(cors).not.toMatch(/'Access-Control-Allow-Origin':\s*'\*'/);
  });

  it('SRA-BOUND-10: conv-wa-webhook valida timestamp antes de HMAC (fail-fast)', () => {
    const src = readEF('conv-wa-webhook');
    // Buscamos las LLAMADAS (invocaciones) no las definiciones de función
    // La definición de verifyHmacWithRotation está antes que validateWebhookTimestamp
    // pero la invocación (tsResult = validateWebhookTimestamp) va antes que signatureValid = await verifyHmacWithRotation
    const tsCallIdx = src.indexOf('validateWebhookTimestamp(timestampHeader)');
    const hmacCallIdx = src.indexOf('await verifyHmacWithRotation(');
    expect(tsCallIdx).toBeGreaterThan(0);
    expect(hmacCallIdx).toBeGreaterThan(0);
    // La llamada a timestamp debe aparecer antes que la llamada a HMAC en el flujo
    expect(tsCallIdx).toBeLessThan(hmacCallIdx);
  });

  it('SRA-BOUND-11: conv-wa-webhook silencia errores (200 opaco)', () => {
    const src = readEF('conv-wa-webhook');
    expect(src).toMatch(/silentOk|status.*200.*opaco|200.*webhook/i);
  });

  it('SRA-BOUND-12: matriz adversarial existe', () => {
    expect(fileExists('docs/smart-conversations/security/adversarial-test-matrix.md')).toBe(true);
  });

  it('SRA-BOUND-13: gate-1-closure-checklist.md existe', () => {
    expect(fileExists('docs/smart-conversations/security/gate-1-closure-checklist.md')).toBe(true);
  });

  it('SRA-BOUND-14: phase-11b4-adversarial-report.md existe', () => {
    expect(fileExists('docs/smart-conversations/security/phase-11b4-adversarial-report.md')).toBe(true);
  });

  it('SRA-BOUND-15: GATE_1 no se declara PASS en artefactos 11B4', () => {
    const report = readFile('docs/smart-conversations/security/phase-11b4-adversarial-report.md');
    const checklist = readFile('docs/smart-conversations/security/gate-1-closure-checklist.md');
    const combined = report + checklist;
    expect(combined).not.toMatch(/GATE_1[^A-Z]*PASS\b(?!_WITH)/);
    expect(combined).not.toMatch(/GATE_1[^A-Z]*APPROVED/);
  });
});
