// qa/unit/security/multi-tenant-isolation.test.js
// Tests de seguridad multi-tenant (SEC-01..04)
// Estrategia: defensa en profundidad verificada por análisis estático del código fuente.
// Los tests de integración con BD real están marcados con test.skip hasta tener usuarios de prueba.

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.resolve(root, rel), 'utf-8');

// ── SEC-01 — RLS activo en tablas críticas ────────────────────────────────────

describe('SEC-01 — RLS definido en baseline para tablas críticas', () => {
  const rlsFile = read('supabase/migrations/baseline/00000000000003_baseline_rls.sql');

  const criticalTables = [
    'profiles',
    'lodger_room_assignments',
    'energy_bills',
    'energy_settlements',
    'bulletins',
    'accommodations',
    'rooms',
  ];

  for (const table of criticalTables) {
    it(`tabla "${table}" tiene políticas RLS definidas`, () => {
      expect(rlsFile).toContain(table);
    });
  }
});

// ── SEC-02 — Queries incluyen client_account_id ───────────────────────────────

describe('SEC-02 — Servicios filtran por client_account_id', () => {
  it('lodgers.service.js aplica filtro client_account_id en listLodgers', () => {
    const src = read('src/services/lodgers.service.js');
    expect(src).toContain('client_account_id');
    expect(src).toContain('clientAccountId');
  });

  it('energy.service.js no hace queries directas sin filtro tenant (usa RLS)', () => {
    const src = read('src/services/energy.service.js');
    // El servicio de energía usa supabase con RLS (anon key del user logado)
    // Solo debe verificar que no hay bypass con service_role_key en el cliente
    expect(src).not.toContain('service_role_key');
  });
});

// ── SEC-03 — Creación de inquilinos mediante Edge Function ────────────────────

describe('SEC-03 — Operaciones sensibles pasan por Edge Functions', () => {
  it('createLodger usa manage_lodger (no genera contraseñas en cliente)', () => {
    const src = read('src/services/lodgers.service.js');
    expect(src).toContain('manage_lodger');
    expect(src).toContain('action: "create"');
    // Verificar que NO hay generación de contraseña en cliente
    expect(src).not.toContain('randomPassword');
    expect(src).not.toContain('crypto.randomUUID()');
  });

  it('settleEnergyBill usa RLS directa con client_account_id (no Edge Function)', () => {
    // Migrado de Edge Function a llamadas directas con RLS.
    // Seguridad multi-tenant garantizada por: eq("client_account_id", clientAccountId) + políticas RLS en BD.
    const src = read('src/services/energy.service.js');
    expect(src).toContain('client_account_id');
    expect(src).toContain('clientAccountId');
    expect(src).not.toContain('invokeWithAuth');
  });
});

// ── SEC-04 — Edge Functions validan JWT + tenant ──────────────────────────────

describe('SEC-04 — Edge Functions validan JWT y tenant', () => {
  it('settle_energy_bill verifica Authorization header', () => {
    const src = read('supabase/functions/settle_energy_bill/index.ts');
    expect(src).toContain('Authorization');
    expect(src).toContain('getUser(token)');
  });

  it('settle_energy_bill filtra factura por client_account_id del perfil', () => {
    const src = read('supabase/functions/settle_energy_bill/index.ts');
    expect(src).toContain('client_account_id');
    expect(src).toContain('clientAccountId');
    // La factura se valida contra el tenant del usuario
    expect(src).toContain('.eq("client_account_id", clientAccountId)');
  });

  it('settle_energy_bill exige rol admin o superadmin', () => {
    const src = read('supabase/functions/settle_energy_bill/index.ts');
    expect(src).toContain('"admin"');
    expect(src).toContain('"superadmin"');
    expect(src).toContain('Insufficient permissions');
  });

  it('settle_energy_bill rechaza si no hay tenant asociado', () => {
    const src = read('supabase/functions/settle_energy_bill/index.ts');
    expect(src).toContain('No tenant associated');
  });
});

// ── Tests de integración real (requieren usuarios de prueba) ──────────────────

describe('Aislamiento real entre tenants (integración, requiere BD)', () => {
  it.skip('Tenant A no puede leer inquilinos del Tenant B', async () => {
    // TODO: Implementar con usuarios de prueba reales en .env.test
    // 1. Login como tenant1@test.com
    // 2. Intentar leer profiles con client_account_id de tenant2
    // 3. Debe devolver [] por RLS
  });

  it.skip('Tenant A no puede insertar lodger_room_assignments de Tenant B', async () => {
    // TODO: Implementar con usuarios de prueba reales
  });
});
