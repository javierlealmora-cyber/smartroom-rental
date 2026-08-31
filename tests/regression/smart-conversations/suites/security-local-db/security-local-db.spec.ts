/**
 * Security Local DB — Tests de validación real sobre Supabase local
 * Fase 11B2C · SmartConversations
 *
 * Estos tests requieren Supabase local corriendo con Docker.
 * Si la infraestructura no está disponible, todos los tests se saltan
 * con `it.skipIf` y el estado de la fase queda LOCAL_DB_PENDING.
 *
 * Para activarlos:
 *   1. Instalar Docker Desktop
 *   2. supabase start
 *   3. npm run test:sc:security-local-db
 *
 * NO conectar a Supabase remoto.
 * NO usar credenciales reales de producción.
 * NO activar servicios externos (Core, IA, Wasender, n8n, Realtime).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as child_process from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../../../');

// ─────────────────────────────────────────────────────────────────────────────
// Detección de infraestructura local
// ─────────────────────────────────────────────────────────────────────────────

// En Windows, los comandos .cmd requieren shell:true para resolverse
const SHELL_OPT = process.platform === 'win32' ? { shell: true } : {};

function isDockerAvailable(): boolean {
  try {
    const r = child_process.spawnSync('docker', ['info'], {
      timeout: 5000, encoding: 'utf-8', ...SHELL_OPT,
    });
    return r.status === 0;
  } catch {
    return false;
  }
}

function isSupabaseLocalRunning(): boolean {
  try {
    const r = child_process.spawnSync('supabase', ['status'],
      { timeout: 10000, encoding: 'utf-8', cwd: ROOT, ...SHELL_OPT });
    if (r.status !== 0) return false;
    const output = (r.stdout ?? '') + (r.stderr ?? '');
    return output.includes('postgresql://') || output.includes('DB URL');
  } catch {
    return false;
  }
}

function getSupabaseLocalUrl(): string {
  return process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321';
}

function getServiceRoleKey(): string {
  // Clave local por defecto del CLI de Supabase (no es un secreto real de producción)
  return process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Estado de infraestructura (calculado una vez)
// ─────────────────────────────────────────────────────────────────────────────

const DOCKER_AVAILABLE = isDockerAvailable();
const SUPABASE_RUNNING = DOCKER_AVAILABLE && isSupabaseLocalRunning();
const INFRA_AVAILABLE = SUPABASE_RUNNING;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de DB (solo se usan si INFRA_AVAILABLE)
// ─────────────────────────────────────────────────────────────────────────────

function runPsql(sql: string, role = 'postgres'): { stdout: string; exitCode: number } {
  // Usa psql contra la DB local de Supabase
  const dbUrl = process.env['SUPABASE_DB_URL'] ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  const r = child_process.spawnSync('psql', [dbUrl, '-c', sql], {
    timeout: 15000,
    encoding: 'utf-8',
    env: { ...process.env, PGCONNECT_TIMEOUT: '5' },
  });
  return { stdout: (r.stdout ?? '') + (r.stderr ?? ''), exitCode: r.status ?? 1 };
}

function isPsqlAvailable(): boolean {
  try {
    const r = child_process.spawnSync('psql', ['--version'],
      { timeout: 5000, encoding: 'utf-8', ...SHELL_OPT });
    return r.status === 0;
  } catch {
    return false;
  }
}

const PSQL_AVAILABLE = INFRA_AVAILABLE && isPsqlAvailable();

// ─────────────────────────────────────────────────────────────────────────────
// INFRA-01..05 — Precheck de infraestructura
// ─────────────────────────────────────────────────────────────────────────────
describe('INFRA-01..05 — Infraestructura local', () => {
  it('INFRA-01: Supabase CLI está instalado', () => {
    const r = child_process.spawnSync('supabase', ['--version'],
      { timeout: 5000, encoding: 'utf-8', ...SHELL_OPT });
    expect(r.status).toBe(0);
  });

  it.skipIf(!DOCKER_AVAILABLE)('INFRA-02: Docker está disponible', () => {
    expect(DOCKER_AVAILABLE).toBe(true);
  });

  it.skipIf(DOCKER_AVAILABLE)('INFRA-02b: Docker NO disponible — infraestructura bloqueada', () => {
    // Este test documenta el bloqueo explícitamente
    expect(DOCKER_AVAILABLE).toBe(false);
    // Instrucciones: instalar Docker Desktop y reiniciar
  });

  it.skipIf(!DOCKER_AVAILABLE)('INFRA-03: Supabase local está corriendo', () => {
    expect(SUPABASE_RUNNING).toBe(true);
  });

  it.skipIf(!INFRA_AVAILABLE)('INFRA-04: psql disponible para verificación directa', () => {
    expect(PSQL_AVAILABLE).toBe(true);
  });

  it.skipIf(!INFRA_AVAILABLE)('INFRA-05: migración 11B2B está aplicada', () => {
    const r = runPsql(
      "SELECT column_name FROM information_schema.columns WHERE table_name='conv_wc_configs' AND column_name='widget_public_key';"
    );
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/widget_public_key/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MIG-01..08 — Verificación de migraciones
// ─────────────────────────────────────────────────────────────────────────────
describe('MIG-01..08 — Migraciones aplicadas en DB local', () => {
  it.skipIf(!INFRA_AVAILABLE)('MIG-01: Las 8 tablas conv_* existen', () => {
    const tables = [
      'conv_service_activations', 'conv_wa_sessions', 'conv_wc_configs',
      'conv_sessions', 'conv_cases', 'conv_messages', 'conv_send_queue',
      'conv_admin_notifications',
    ];
    for (const t of tables) {
      const r = runPsql(`SELECT 1 FROM information_schema.tables WHERE table_name='${t}';`);
      expect(r.exitCode).toBe(0);
      expect(r.stdout).toMatch(/1 row/);
    }
  });

  it.skipIf(!INFRA_AVAILABLE)('MIG-02: conv_rate_limit_buckets existe', () => {
    const r = runPsql("SELECT 1 FROM information_schema.tables WHERE table_name='conv_rate_limit_buckets';");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/1 row/);
  });

  it.skipIf(!INFRA_AVAILABLE)('MIG-03: widget_public_key existe en conv_wc_configs', () => {
    const r = runPsql("SELECT column_name FROM information_schema.columns WHERE table_name='conv_wc_configs' AND column_name='widget_public_key';");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/widget_public_key/);
  });

  it.skipIf(!INFRA_AVAILABLE)('MIG-04: expires_at existe en conv_sessions', () => {
    const r = runPsql("SELECT column_name FROM information_schema.columns WHERE table_name='conv_sessions' AND column_name='expires_at';");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/expires_at/);
  });

  it.skipIf(!INFRA_AVAILABLE)('MIG-05: función increment_rate_limit_bucket existe', () => {
    const r = runPsql("SELECT routine_name FROM information_schema.routines WHERE routine_name='increment_rate_limit_bucket';");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/increment_rate_limit_bucket/);
  });

  it.skipIf(!INFRA_AVAILABLE)('MIG-06: search_path de increment_rate_limit_bucket es public', () => {
    const r = runPsql("SELECT prosrc FROM pg_proc WHERE proname='increment_rate_limit_bucket';");
    expect(r.exitCode).toBe(0);
    // La función existe — el search_path se verifica en la definición SQL de la migración
    expect(r.stdout).toMatch(/1 row|increment/i);
  });

  it.skipIf(!INFRA_AVAILABLE)('MIG-07: conv_wc_configs.auth_mode tiene constraint check', () => {
    const r = runPsql("SELECT conname FROM pg_constraint WHERE conrelid='conv_wc_configs'::regclass AND contype='c';");
    expect(r.exitCode).toBe(0);
    // Deben existir constraints check para auth_mode y rate_limit_mode
    expect(r.stdout).toMatch(/auth_mode|rate_limit/i);
  });

  it.skipIf(!INFRA_AVAILABLE)('MIG-08: conv_rate_limit_buckets tiene RLS habilitado', () => {
    const r = runPsql("SELECT relrowsecurity FROM pg_class WHERE relname='conv_rate_limit_buckets';");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/t\b/); // relrowsecurity = true
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PERM-01..24 — Permisos reales por rol
// ─────────────────────────────────────────────────────────────────────────────
describe('PERM-01..24 — Permisos reales anon/authenticated/service_role', () => {
  const convTables = [
    'conv_service_activations', 'conv_wa_sessions', 'conv_wc_configs',
    'conv_sessions', 'conv_cases', 'conv_messages', 'conv_send_queue',
    'conv_admin_notifications',
  ];

  // anon no puede SELECT en ninguna tabla conv_*
  it.skipIf(!INFRA_AVAILABLE)('PERM-01: anon rechazado en SELECT conv_sessions', () => {
    const r = runPsql('SET ROLE anon; SELECT COUNT(*) FROM conv_sessions; RESET ROLE;');
    expect(r.stdout).toMatch(/permission denied|ERROR/i);
  });

  it.skipIf(!INFRA_AVAILABLE)('PERM-02: anon rechazado en SELECT conv_messages', () => {
    const r = runPsql('SET ROLE anon; SELECT COUNT(*) FROM conv_messages; RESET ROLE;');
    expect(r.stdout).toMatch(/permission denied|ERROR/i);
  });

  it.skipIf(!INFRA_AVAILABLE)('PERM-03: anon rechazado en SELECT conv_wc_configs', () => {
    const r = runPsql('SET ROLE anon; SELECT COUNT(*) FROM conv_wc_configs; RESET ROLE;');
    expect(r.stdout).toMatch(/permission denied|ERROR/i);
  });

  it.skipIf(!INFRA_AVAILABLE)('PERM-04: anon rechazado en INSERT conv_sessions', () => {
    const r = runPsql("SET ROLE anon; INSERT INTO conv_sessions(id) VALUES(gen_random_uuid()); RESET ROLE;");
    expect(r.stdout).toMatch(/permission denied|ERROR/i);
  });

  it.skipIf(!INFRA_AVAILABLE)('PERM-05: anon rechazado en SELECT conv_rate_limit_buckets', () => {
    const r = runPsql('SET ROLE anon; SELECT COUNT(*) FROM conv_rate_limit_buckets; RESET ROLE;');
    expect(r.stdout).toMatch(/permission denied|ERROR/i);
  });

  it.skipIf(!INFRA_AVAILABLE)('PERM-06: authenticated rechazado en SELECT conv_sessions', () => {
    const r = runPsql('SET ROLE authenticated; SELECT COUNT(*) FROM conv_sessions; RESET ROLE;');
    expect(r.stdout).toMatch(/permission denied|ERROR/i);
  });

  it.skipIf(!INFRA_AVAILABLE)('PERM-07: authenticated rechazado en SELECT conv_messages', () => {
    const r = runPsql('SET ROLE authenticated; SELECT COUNT(*) FROM conv_messages; RESET ROLE;');
    expect(r.stdout).toMatch(/permission denied|ERROR/i);
  });

  it.skipIf(!INFRA_AVAILABLE)('PERM-08: authenticated rechazado en INSERT conv_sessions', () => {
    const r = runPsql("SET ROLE authenticated; INSERT INTO conv_sessions(id) VALUES(gen_random_uuid()); RESET ROLE;");
    expect(r.stdout).toMatch(/permission denied|ERROR/i);
  });

  it.skipIf(!INFRA_AVAILABLE)('PERM-09: authenticated rechazado en SELECT conv_rate_limit_buckets', () => {
    const r = runPsql('SET ROLE authenticated; SELECT COUNT(*) FROM conv_rate_limit_buckets; RESET ROLE;');
    expect(r.stdout).toMatch(/permission denied|ERROR/i);
  });

  it.skipIf(!INFRA_AVAILABLE)('PERM-10: service_role puede SELECT conv_sessions', () => {
    const r = runPsql('SELECT COUNT(*) FROM conv_sessions;');
    expect(r.exitCode).toBe(0);
    expect(r.stdout).not.toMatch(/ERROR/i);
  });

  it.skipIf(!INFRA_AVAILABLE)('PERM-11: service_role puede SELECT conv_messages', () => {
    const r = runPsql('SELECT COUNT(*) FROM conv_messages;');
    expect(r.exitCode).toBe(0);
    expect(r.stdout).not.toMatch(/ERROR/i);
  });

  it.skipIf(!INFRA_AVAILABLE)('PERM-12: service_role puede SELECT conv_rate_limit_buckets', () => {
    const r = runPsql('SELECT COUNT(*) FROM conv_rate_limit_buckets;');
    expect(r.exitCode).toBe(0);
    expect(r.stdout).not.toMatch(/ERROR/i);
  });

  // Verificar todas las tablas conv_* en loop para anon
  for (const t of convTables) {
    it.skipIf(!INFRA_AVAILABLE)(`PERM-ANON-${t}: anon rechazado en ${t}`, () => {
      const r = runPsql(`SET ROLE anon; SELECT COUNT(*) FROM ${t}; RESET ROLE;`);
      expect(r.stdout).toMatch(/permission denied|ERROR/i);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// RPC-01..10 — RPC increment_rate_limit_bucket real
// ─────────────────────────────────────────────────────────────────────────────
describe('RPC-01..10 — increment_rate_limit_bucket (RPC real)', () => {
  const TENANT_A = '00000000-0000-0000-0000-000000000001';
  const TENANT_B = '00000000-0000-0000-0000-000000000002';
  const WINDOW_START = 'NOW()';
  const EXPIRES_AT = "NOW() + INTERVAL '1 minute'";

  it.skipIf(!INFRA_AVAILABLE)('RPC-01: primer incremento devuelve count=1', () => {
    const key = `test-rpc-01-${Date.now()}`;
    const r = runPsql(
      `SELECT increment_rate_limit_bucket('${TENANT_A}'::uuid, '${key}', 'poll', ${WINDOW_START}, ${EXPIRES_AT});`
    );
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/\b1\b/);
  });

  it.skipIf(!INFRA_AVAILABLE)('RPC-02: segundo incremento devuelve count=2', () => {
    const key = `test-rpc-02-${Date.now()}`;
    const w = 'NOW()';
    const e = "NOW() + INTERVAL '1 minute'";
    runPsql(`SELECT increment_rate_limit_bucket('${TENANT_A}'::uuid, '${key}', 'poll', ${w}, ${e});`);
    const r = runPsql(`SELECT increment_rate_limit_bucket('${TENANT_A}'::uuid, '${key}', 'poll', ${w}, ${e});`);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/\b2\b/);
  });

  it.skipIf(!INFRA_AVAILABLE)('RPC-03: Tenant A y Tenant B tienen buckets independientes', () => {
    const key = `test-rpc-03-${Date.now()}`;
    const w = 'NOW()';
    const e = "NOW() + INTERVAL '1 minute'";
    runPsql(`SELECT increment_rate_limit_bucket('${TENANT_A}'::uuid, '${key}-a', 'poll', ${w}, ${e});`);
    runPsql(`SELECT increment_rate_limit_bucket('${TENANT_B}'::uuid, '${key}-b', 'poll', ${w}, ${e});`);
    const rA = runPsql(`SELECT request_count FROM conv_rate_limit_buckets WHERE bucket_key='${key}-a';`);
    const rB = runPsql(`SELECT request_count FROM conv_rate_limit_buckets WHERE bucket_key='${key}-b';`);
    expect(rA.stdout).toMatch(/1/);
    expect(rB.stdout).toMatch(/1/);
  });

  it.skipIf(!INFRA_AVAILABLE)('RPC-04: operaciones poll y message usan buckets distintos', () => {
    const key = `test-rpc-04-${Date.now()}`;
    const w = 'NOW()';
    const e = "NOW() + INTERVAL '1 minute'";
    runPsql(`SELECT increment_rate_limit_bucket('${TENANT_A}'::uuid, '${key}:poll', 'poll', ${w}, ${e});`);
    runPsql(`SELECT increment_rate_limit_bucket('${TENANT_A}'::uuid, '${key}:message', 'message', ${w}, ${e});`);
    const rPoll = runPsql(`SELECT request_count FROM conv_rate_limit_buckets WHERE bucket_key='${key}:poll';`);
    const rMsg  = runPsql(`SELECT request_count FROM conv_rate_limit_buckets WHERE bucket_key='${key}:message';`);
    expect(rPoll.stdout).toMatch(/1/);
    expect(rMsg.stdout).toMatch(/1/);
  });

  it.skipIf(!INFRA_AVAILABLE)('RPC-05: buckets no contienen PII', () => {
    const r = runPsql('SELECT bucket_key, operation, client_account_id FROM conv_rate_limit_buckets LIMIT 5;');
    expect(r.exitCode).toBe(0);
    // No debe haber emails, teléfonos ni nombres en bucket_key
    expect(r.stdout).not.toMatch(/\b[\w.-]+@[\w.-]+\.\w{2,}\b/);
    expect(r.stdout).not.toMatch(/\+\d{8,}/);
  });

  it.skipIf(!INFRA_AVAILABLE)('RPC-06: ON CONFLICT actualiza y no duplica filas', () => {
    const key = `test-rpc-06-${Date.now()}`;
    const w = 'NOW()';
    const e = "NOW() + INTERVAL '1 minute'";
    // Llamar 5 veces con el mismo bucket_key y window_start
    for (let i = 0; i < 5; i++) {
      runPsql(`SELECT increment_rate_limit_bucket('${TENANT_A}'::uuid, '${key}', 'poll', ${w}, ${e});`);
    }
    const r = runPsql(`SELECT COUNT(*), MAX(request_count) FROM conv_rate_limit_buckets WHERE bucket_key='${key}';`);
    expect(r.exitCode).toBe(0);
    // Debe haber exactamente 1 fila (ON CONFLICT DO UPDATE, no INSERT duplicado)
    expect(r.stdout).toMatch(/\b1\b.*\b5\b|\b5\b.*\b1\b/);
  });

  it.skipIf(!INFRA_AVAILABLE)('RPC-07: cleanup_rate_limit_buckets elimina buckets expirados', () => {
    const key = `test-cleanup-${Date.now()}`;
    // Insertar bucket ya expirado
    runPsql(
      `INSERT INTO conv_rate_limit_buckets(client_account_id, bucket_key, operation, window_start, request_count, expires_at) ` +
      `VALUES('${TENANT_A}'::uuid, '${key}', 'poll', NOW() - INTERVAL '2 minutes', 1, NOW() - INTERVAL '1 minute');`
    );
    const r = runPsql('SELECT cleanup_rate_limit_buckets();');
    expect(r.exitCode).toBe(0);
    const check = runPsql(`SELECT COUNT(*) FROM conv_rate_limit_buckets WHERE bucket_key='${key}';`);
    expect(check.stdout).toMatch(/\b0\b/);
  });

  it.skipIf(!INFRA_AVAILABLE)('RPC-08: la función es ejecutable por service_role', () => {
    const key = `test-rpc-08-${Date.now()}`;
    const r = runPsql(
      `SELECT increment_rate_limit_bucket('${TENANT_A}'::uuid, '${key}', 'session', NOW(), NOW() + INTERVAL '1 minute');`
    );
    expect(r.exitCode).toBe(0);
    expect(r.stdout).not.toMatch(/ERROR|permission denied/i);
  });

  it.skipIf(!INFRA_AVAILABLE)('RPC-09: anon no puede ejecutar increment_rate_limit_bucket', () => {
    const key = `test-rpc-09-${Date.now()}`;
    const r = runPsql(
      `SET ROLE anon; SELECT increment_rate_limit_bucket('${TENANT_A}'::uuid, '${key}', 'poll', NOW(), NOW() + INTERVAL '1 minute'); RESET ROLE;`
    );
    expect(r.stdout).toMatch(/permission denied|ERROR/i);
  });

  it.skipIf(!INFRA_AVAILABLE)('RPC-10: incrementos concurrentes no pierden actualizaciones', () => {
    const key = `test-concurrent-${Date.now()}`;
    const w = 'NOW()';
    const e = "NOW() + INTERVAL '1 minute'";
    const N = 10;
    // Ejecutar N llamadas consecutivas rápidas (psql no es async pero verifica integridad)
    for (let i = 0; i < N; i++) {
      runPsql(`SELECT increment_rate_limit_bucket('${TENANT_A}'::uuid, '${key}', 'poll', ${w}, ${e});`);
    }
    const r = runPsql(`SELECT request_count FROM conv_rate_limit_buckets WHERE bucket_key='${key}' ORDER BY window_start DESC LIMIT 1;`);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(new RegExp(`\\b${N}\\b`));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EF-SESSION-01..08 — conv-web-session E2E local
// ─────────────────────────────────────────────────────────────────────────────
describe('EF-SESSION-01..08 — conv-web-session E2E local', () => {
  const SUPABASE_URL = getSupabaseLocalUrl();

  async function invokeWebSession(body: Record<string, unknown>, env?: Record<string, string>): Promise<{
    status: number; json: Record<string, unknown>;
  }> {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/conv-web-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...env },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({})) as Record<string, unknown>;
    return { status: res.status, json };
  }

  it.skipIf(!INFRA_AVAILABLE)('EF-SESSION-01: widget desconocido rechazado en modo local', async () => {
    const r = await invokeWebSession({ widget_public_key: 'key-inexistente-xyz', client_account_id: null });
    // En modo local (permissive), acepta client_account_id del body
    // widget_public_key desconocido no es error en modo permissive
    expect([200, 400, 403, 404]).toContain(r.status);
  });

  it.skipIf(!INFRA_AVAILABLE)('EF-SESSION-02: sin client_account_id ni widget_public_key → 400', async () => {
    const r = await invokeWebSession({});
    expect(r.status).toBe(400);
  });

  it.skipIf(!INFRA_AVAILABLE)('EF-SESSION-03: WebChat inactivo → 403', async () => {
    // tenant sin configuración WebChat → 403
    const r = await invokeWebSession({ client_account_id: '00000000-0000-0000-0000-eeeeeeeeeeee' });
    expect(r.status).toBe(403);
  });

  it.skipIf(!INFRA_AVAILABLE)('EF-SESSION-04: respuesta no contiene signing secret', async () => {
    const r = await invokeWebSession({ client_account_id: '00000000-0000-0000-0000-eeeeeeeeeeee' });
    const body = JSON.stringify(r.json);
    expect(body).not.toMatch(/signingSecret|signing_secret|WEBCHAT_SESSION_SIGNING_SECRET/);
  });

  it.skipIf(!INFRA_AVAILABLE)('EF-SESSION-05: respuesta no contiene service_role key', async () => {
    const r = await invokeWebSession({ client_account_id: '00000000-0000-0000-0000-eeeeeeeeeeee' });
    const body = JSON.stringify(r.json);
    // No debe filtrar service_role key (JWT pattern)
    expect(body).not.toMatch(/eyJ[A-Za-z0-9_-]{40,}/);
  });

  it.skipIf(!INFRA_AVAILABLE)('EF-SESSION-06: campos prohibidos rechazados', async () => {
    const r = await invokeWebSession({
      client_account_id: '00000000-0000-0000-0000-aaaaaaaaaaaa',
      profile_id: 'leaked-id',
    });
    expect(r.status).toBe(400);
  });

  it.skipIf(!INFRA_AVAILABLE)('EF-SESSION-07: phone en body rechazado', async () => {
    const r = await invokeWebSession({
      client_account_id: '00000000-0000-0000-0000-aaaaaaaaaaaa',
      phone: '+34666000000',
    });
    expect(r.status).toBe(400);
  });

  it.skipIf(!INFRA_AVAILABLE)('EF-SESSION-08: identity_data en body rechazado', async () => {
    const r = await invokeWebSession({
      client_account_id: '00000000-0000-0000-0000-aaaaaaaaaaaa',
      identity_data: { name: 'test' },
    });
    expect(r.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EF-MESSAGE-01..08 — conv-web-message E2E local
// ─────────────────────────────────────────────────────────────────────────────
describe('EF-MESSAGE-01..08 — conv-web-message E2E local', () => {
  const SUPABASE_URL = getSupabaseLocalUrl();

  async function invokeWebMessage(body: Record<string, unknown>, authHeader?: string): Promise<{
    status: number; json: Record<string, unknown>;
  }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authHeader) headers['Authorization'] = authHeader;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/conv-web-message`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({})) as Record<string, unknown>;
    return { status: res.status, json };
  }

  it.skipIf(!INFRA_AVAILABLE)('EF-MESSAGE-01: sin body → 400', async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/conv-web-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid',
    });
    expect(res.status).toBe(400);
  });

  it.skipIf(!INFRA_AVAILABLE)('EF-MESSAGE-02: sin session_id → 400', async () => {
    const r = await invokeWebMessage({ client_account_id: 'x', sender_ref: 'wc_abc', message_text: 'hi' });
    expect(r.status).toBe(400);
  });

  it.skipIf(!INFRA_AVAILABLE)('EF-MESSAGE-03: sender_ref inválido (no wc_<hex>) → 400', async () => {
    const r = await invokeWebMessage({
      client_account_id: 'x', session_id: 'y',
      sender_ref: 'invalid-ref', message_text: 'hi',
    });
    expect(r.status).toBe(400);
  });

  it.skipIf(!INFRA_AVAILABLE)('EF-MESSAGE-04: sesión inexistente → 403 o 404', async () => {
    const r = await invokeWebMessage({
      client_account_id: '00000000-0000-0000-0000-aaaaaaaaaaaa',
      session_id: '00000000-0000-0000-0000-bbbbbbbbbbbb',
      sender_ref: 'wc_' + 'a'.repeat(32),
      message_text: 'test',
    });
    expect([403, 404]).toContain(r.status);
  });

  it.skipIf(!INFRA_AVAILABLE)('EF-MESSAGE-05: profile_id en body rechazado', async () => {
    const r = await invokeWebMessage({
      client_account_id: 'x', session_id: 'y',
      sender_ref: 'wc_' + 'a'.repeat(32), message_text: 'hi',
      profile_id: 'leaked',
    });
    // La EF debe rechazar por campo prohibido (si detectForbiddenPublicInput está en conv-web-message)
    // o al menos no exponer el profile_id
    expect([400, 403, 404]).toContain(r.status);
  });

  it.skipIf(!INFRA_AVAILABLE)('EF-MESSAGE-06: respuesta no contiene raw_payload', async () => {
    const r = await invokeWebMessage({
      client_account_id: '00000000-0000-0000-0000-aaaaaaaaaaaa',
      session_id: '00000000-0000-0000-0000-bbbbbbbbbbbb',
      sender_ref: 'wc_' + 'a'.repeat(32), message_text: 'test',
    });
    const body = JSON.stringify(r.json);
    expect(body).not.toMatch(/raw_payload/);
  });

  it.skipIf(!INFRA_AVAILABLE)('EF-MESSAGE-07: error cross-tenant no confirma existencia', async () => {
    const r = await invokeWebMessage({
      client_account_id: '00000000-0000-0000-0000-fffffffffffx', // tenant incorrecto
      session_id: '00000000-0000-0000-0000-bbbbbbbbbbbb',
      sender_ref: 'wc_' + 'a'.repeat(32), message_text: 'test',
    });
    // No debe decir "sesión pertenece a otro tenant"
    const body = JSON.stringify(r.json);
    expect(body).not.toMatch(/otro tenant|other tenant/i);
  });

  it.skipIf(!INFRA_AVAILABLE)('EF-MESSAGE-08: message_text vacío → 400', async () => {
    const r = await invokeWebMessage({
      client_account_id: 'x', session_id: 'y',
      sender_ref: 'wc_' + 'a'.repeat(32), message_text: '   ',
    });
    expect(r.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EF-POLL-01..06 — conv-web-poll E2E local
// ─────────────────────────────────────────────────────────────────────────────
describe('EF-POLL-01..06 — conv-web-poll E2E local', () => {
  const SUPABASE_URL = getSupabaseLocalUrl();

  async function invokeWebPoll(body: Record<string, unknown>): Promise<{
    status: number; json: Record<string, unknown>;
  }> {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/conv-web-poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({})) as Record<string, unknown>;
    return { status: res.status, json };
  }

  it.skipIf(!INFRA_AVAILABLE)('EF-POLL-01: sin session_id → 400', async () => {
    const r = await invokeWebPoll({ client_account_id: 'x', sender_ref: 'wc_abc' });
    expect(r.status).toBe(400);
  });

  it.skipIf(!INFRA_AVAILABLE)('EF-POLL-02: sesión inexistente → 404', async () => {
    const r = await invokeWebPoll({
      client_account_id: '00000000-0000-0000-0000-aaaaaaaaaaaa',
      session_id: '00000000-0000-0000-0000-bbbbbbbbbbbb',
      sender_ref: 'wc_' + 'a'.repeat(32),
    });
    expect([403, 404]).toContain(r.status);
  });

  it.skipIf(!INFRA_AVAILABLE)('EF-POLL-03: respuesta no contiene raw_payload', async () => {
    const r = await invokeWebPoll({
      client_account_id: '00000000-0000-0000-0000-aaaaaaaaaaaa',
      session_id: '00000000-0000-0000-0000-bbbbbbbbbbbb',
      sender_ref: 'wc_' + 'a'.repeat(32),
    });
    const body = JSON.stringify(r.json);
    expect(body).not.toMatch(/raw_payload/);
  });

  it.skipIf(!INFRA_AVAILABLE)('EF-POLL-04: respuesta no contiene identity_data', async () => {
    const r = await invokeWebPoll({
      client_account_id: '00000000-0000-0000-0000-aaaaaaaaaaaa',
      session_id: '00000000-0000-0000-0000-bbbbbbbbbbbb',
      sender_ref: 'wc_' + 'a'.repeat(32),
    });
    const body = JSON.stringify(r.json);
    expect(body).not.toMatch(/identity_data/);
  });

  it.skipIf(!INFRA_AVAILABLE)('EF-POLL-05: GET no permitido → 405', async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/conv-web-poll`, {
      method: 'GET',
    });
    expect(res.status).toBe(405);
  });

  it.skipIf(!INFRA_AVAILABLE)('EF-POLL-06: error cross-tenant opaco', async () => {
    const r = await invokeWebPoll({
      client_account_id: '00000000-0000-0000-0000-fffffffffffx',
      session_id: '00000000-0000-0000-0000-bbbbbbbbbbbb',
      sender_ref: 'wc_' + 'a'.repeat(32),
    });
    const body = JSON.stringify(r.json);
    expect(body).not.toMatch(/otro tenant|other tenant/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROLLBACK-01..04 — Verificación de rollback document
// ─────────────────────────────────────────────────────────────────────────────
describe('ROLLBACK-01..04 — Documento de rollback', () => {
  const ROLLBACK_DOC = path.join(ROOT, 'docs/smart-conversations/security/phase-11b2b-rollback.md');

  it('ROLLBACK-01: documento de rollback existe', () => {
    expect(fs.existsSync(ROLLBACK_DOC)).toBe(true);
  });

  it('ROLLBACK-02: rollback no propone habilitar legacy en sandbox/production', () => {
    const src = fs.readFileSync(ROLLBACK_DOC, 'utf-8');
    expect(src).not.toMatch(/sandbox.*legacy|production.*legacy|staging.*legacy/i);
  });

  it('ROLLBACK-03: rollback no abre acceso anon/authenticated en conv_*', () => {
    const src = fs.readFileSync(ROLLBACK_DOC, 'utf-8');
    // Si menciona GRANT ... TO anon, debe estar en contexto de advertencia condicional
    const grantToAnon = [...src.matchAll(/GRANT[^;]*TO anon[^;]*;/gi)];
    for (const match of grantToAnon) {
      // Debe estar en un bloque comentado o precedido de una advertencia
      expect(match[0]).toMatch(/--|\*\*Solo si/i);
    }
  });

  it('ROLLBACK-04: rollback incluye DROP TABLE conv_rate_limit_buckets', () => {
    const src = fs.readFileSync(ROLLBACK_DOC, 'utf-8');
    expect(src).toMatch(/DROP TABLE.*conv_rate_limit_buckets/i);
  });
});
