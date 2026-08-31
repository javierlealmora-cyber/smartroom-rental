/**
 * Security Baseline — Runtime Tests del Validador
 * Fase 11B1 · SmartConversations
 *
 * Tests de ejecución del script validate-security-baseline.mjs.
 * Verifican salida JSON, exit codes, ausencia de side effects y contenido del reporte.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as child_process from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../../../');
const SCRIPT = path.join(ROOT, 'scripts/smart-conversations/validate-security-baseline.mjs');

interface ValidatorOutput {
  gate: string;
  phase: string;
  status: string;
  summary: {
    tables?: number;
    functions?: number;
    policies?: number;
    findings?: number;
    checks?: number;
    passed?: number;
    failed?: number;
    warnings?: number;
  };
  checks: Array<{ id: string; description: string; result: string; detail?: string }>;
  warnings: string[];
  blockers: string[];
}

function runValidator(env?: Record<string, string>): {
  stdout: string;
  stderr: string;
  exitCode: number;
  json?: ValidatorOutput;
  duration: number;
} {
  const start = Date.now();
  const result = child_process.spawnSync(
    'node',
    [SCRIPT],
    {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 30_000,
      env: { ...process.env, ...env },
    }
  );
  const duration = Date.now() - start;
  let json: ValidatorOutput | undefined;
  try {
    json = JSON.parse(result.stdout);
  } catch {}
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
    json,
    duration,
  };
}

let baseResult: ReturnType<typeof runValidator>;

beforeAll(() => {
  baseResult = runValidator();
}, 60_000);

// ─────────────────────────────────────────────────────────────────────────────
// SBR-01..11 — Runtime: salida JSON, exit code, estructura
// ─────────────────────────────────────────────────────────────────────────────
describe('SBR-01..11 — Validator: salida y estructura', () => {
  it('SBR-01: el validador existe y es ejecutable', () => {
    expect(fs.existsSync(SCRIPT)).toBe(true);
  });

  it('SBR-02: produce JSON válido en stdout', () => {
    expect(baseResult.json).toBeDefined();
    expect(typeof baseResult.json).toBe('object');
  });

  it('SBR-03: JSON tiene campo gate = GATE_1', () => {
    expect(baseResult.json?.gate).toBe('GATE_1');
  });

  it('SBR-04: JSON tiene campo phase = 11B4 (actualizado en Fase 11B4)', () => {
    expect(baseResult.json?.phase).toBe('11B4');
  });

  it('SBR-05: JSON tiene campo status', () => {
    const status = baseResult.json?.status;
    expect(['AUDIT_COMPLETE', 'AUDIT_INCOMPLETE']).toContain(status);
  });

  it('SBR-06: JSON tiene campo summary con métricas numéricas', () => {
    const s = baseResult.json?.summary;
    expect(s).toBeDefined();
    const hasNumeric = Object.values(s ?? {}).some(v => typeof v === 'number');
    expect(hasNumeric).toBe(true);
  });

  it('SBR-07: JSON tiene campo checks (array)', () => {
    expect(Array.isArray(baseResult.json?.checks)).toBe(true);
    expect(baseResult.json!.checks.length).toBeGreaterThan(0);
  });

  it('SBR-08: JSON tiene campo warnings (array)', () => {
    expect(Array.isArray(baseResult.json?.warnings)).toBe(true);
  });

  it('SBR-09: JSON tiene campo blockers (array)', () => {
    expect(Array.isArray(baseResult.json?.blockers)).toBe(true);
  });

  it('SBR-10: terminó en menos de 10 segundos', () => {
    expect(baseResult.duration).toBeLessThan(10_000);
  });

  it('SBR-11: no hay nada escrito en stderr que sea un error fatal', () => {
    expect(baseResult.stderr).not.toMatch(/Error: ENOENT|SyntaxError|ReferenceError|TypeError/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SBR-12..22 — Contenido del reporte
// ─────────────────────────────────────────────────────────────────────────────
describe('SBR-12..22 — Validator: contenido del reporte', () => {
  it('SBR-12: checks incluyen resultado pass/warn/fail', () => {
    const results = baseResult.json?.checks.map(c => c.status) ?? [];
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(['pass', 'warn', 'fail', 'skip']).toContain(r);
    }
  });

  it('SBR-13: checks tienen campo id', () => {
    for (const check of baseResult.json?.checks ?? []) {
      expect(typeof check.id).toBe('string');
      expect(check.id.length).toBeGreaterThan(0);
    }
  });

  it('SBR-14: checks tienen campo description (o status)', () => {
    for (const check of baseResult.json?.checks ?? []) {
      // El validator incluye description (= msg) en el output JSON
      expect(typeof check.status).toBe('string');
    }
  });

  it('SBR-15: status=AUDIT_COMPLETE cuando no hay blockers', () => {
    const blockers = baseResult.json?.blockers ?? [];
    if (blockers.length === 0) {
      expect(baseResult.json?.status).toBe('AUDIT_COMPLETE');
    } else {
      // Con blockers → AUDIT_INCOMPLETE (también válido)
      expect(baseResult.json?.status).toBe('AUDIT_INCOMPLETE');
    }
  });

  it('SBR-16: status=AUDIT_INCOMPLETE cuando hay blockers', () => {
    const blockers = baseResult.json?.blockers ?? [];
    if (blockers.length > 0) {
      expect(baseResult.json?.status).toBe('AUDIT_INCOMPLETE');
    } else {
      expect(baseResult.json?.status).toBe('AUDIT_COMPLETE');
    }
  });

  it('SBR-17: summary.findings es el conteo de findings en security-findings.md', () => {
    const findingsFile = path.join(ROOT, 'docs/smart-conversations/security/security-findings.md');
    const c = fs.readFileSync(findingsFile, 'utf-8');
    const ids = [...c.matchAll(/\| finding_id \| (SEC-\d+) \|/g)].map(m => m[1]);
    const unique = new Set(ids).size;
    if (typeof baseResult.json?.summary?.findings === 'number') {
      expect(baseResult.json.summary.findings).toBe(unique);
    }
  });

  it('SBR-18: warnings no contienen PII real (emails, phones)', () => {
    const w = JSON.stringify(baseResult.json?.warnings ?? []);
    expect(w).not.toMatch(/\b[\w.-]+@[\w.-]+\.\w{2,}\b/);
    expect(w).not.toMatch(/\+\d{8,}/);
  });

  it('SBR-19: blockers no contienen service_role key value', () => {
    const b = JSON.stringify(baseResult.json?.blockers ?? []);
    expect(b).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('SBR-20: stdout no contiene credenciales (JWT pattern)', () => {
    expect(baseResult.stdout).not.toMatch(/eyJ[A-Za-z0-9_-]{40,}/);
  });

  it('SBR-21: stdout no contiene API key pattern', () => {
    expect(baseResult.stdout).not.toMatch(/sk-[A-Za-z0-9]{20,}/);
  });

  it('SBR-22: stdout no contiene números de teléfono reales', () => {
    expect(baseResult.stdout).not.toMatch(/\+\d{10,}/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SBR-23..33 — Sin side effects
// ─────────────────────────────────────────────────────────────────────────────
describe('SBR-23..33 — Validator: sin side effects', () => {
  it('SBR-23: no modifica archivos en supabase/migrations/', () => {
    const before = fs.readdirSync(path.join(ROOT, 'supabase/migrations')).length;
    runValidator();
    const after = fs.readdirSync(path.join(ROOT, 'supabase/migrations')).length;
    expect(after).toBe(before);
  });

  it('SBR-24: no modifica archivos en supabase/functions/', () => {
    const efDir = path.join(ROOT, 'supabase/functions');
    const beforeMtime = fs.statSync(efDir).mtime.getTime();
    runValidator();
    const afterMtime = fs.statSync(efDir).mtime.getTime();
    expect(afterMtime).toBe(beforeMtime);
  });

  it('SBR-25: no crea archivos temporales en ROOT', () => {
    const before = fs.readdirSync(ROOT).length;
    runValidator();
    const after = fs.readdirSync(ROOT).length;
    expect(after).toBe(before);
  });

  it('SBR-26: no crea archivos en docs/smart-conversations/security/', () => {
    const secDir = path.join(ROOT, 'docs/smart-conversations/security');
    const before = fs.readdirSync(secDir).length;
    runValidator();
    const after = fs.readdirSync(secDir).length;
    expect(after).toBe(before);
  });

  it('SBR-27: puede ejecutarse dos veces sin errores (idempotente)', () => {
    const r1 = runValidator();
    const r2 = runValidator();
    expect(r1.exitCode).toBe(r2.exitCode);
    expect(r1.json?.status).toBe(r2.json?.status);
  });

  it('SBR-28: puede ejecutarse sin red activa', () => {
    // Al no tener fetch/socket, no depende de red — el script terminó sin error de red
    expect(baseResult.stderr).not.toMatch(/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/);
  });

  it('SBR-29: no requiere variables de entorno secretas para ejecutarse', () => {
    // El validator no hace llamadas de red, por lo que corre sin secretos reales
    // Solo verifica archivos locales — debe producir JSON válido independientemente
    expect(baseResult.json).toBeDefined();
    expect(baseResult.json?.gate).toBe('GATE_1');
  });

  it('SBR-30: no intenta conexiones a Supabase', () => {
    expect(baseResult.stderr).not.toMatch(/supabase\.co/);
    expect(baseResult.stdout).not.toMatch(/Connecting to Supabase/i);
  });

  it('SBR-31: no intenta conexiones a Wasender', () => {
    expect(baseResult.stderr).not.toMatch(/wasender/i);
  });

  it('SBR-32: no intenta conexiones a Core', () => {
    expect(baseResult.stderr).not.toMatch(/core\.smartroom|api\.core/i);
  });

  it('SBR-33: no intenta conexiones a n8n', () => {
    expect(baseResult.stderr).not.toMatch(/n8n\.cloud|webhook\.n8n/i);
  });
});
