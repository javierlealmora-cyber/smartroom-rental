// =============================================================================
// Tests BDD adicionales para edge cases identificados por Claude
// =============================================================================

import { describe, it, expect, afterEach } from 'vitest';
import {
  createPlan,
  updatePlan,
  duplicatePlan,
  setEndDate,
  toggleVisibility,
  canModifyPlan,
  getPlans,
  isPlanActive,
} from '../plans.service';
import { supabase } from '../supabaseClient';

const createTestPlan = async (overrides = {}) => {
  const defaultData = {
    name: 'Plan Test',
    code: `TEST_${Date.now()}`,
    monthly_price: 29.99,
    ...overrides,
  };
  return await createPlan(defaultData);
};

const cleanupTestPlans = async () => {
  // Lista de todos los códigos usados en tests
  const testCodes = [
    'BASIC_TEST_MIN',
    'BASIC_PLAN',
    'PLAN_BASICO_2026',
    'BASIC_EDGE',
    'BASIC_EDGE_COPY_1',
    'STRIPE_TEST',
    'ACTIVE_PLAN',
    'BASIC',
    'PREMIUM',
    'ENTERPRISE',
    'FEATURED_ACTIVE',
    'NOT_FEATURED',
    'ACTIVE_1',
    'DRAFT_1',
    'DEPRECATED_1',
    'BASIC_A',
    'PREMIUM_B',
    'VALID_TODAY',
    'EXPIRED',
  ];

  // Eliminar planes con códigos de test específicos
  await supabase.from('plans_catalog').delete().in('code', testCodes);
  
  // También eliminar cualquier código que empiece con TEST_
  await supabase.from('plans_catalog').delete().ilike('code', 'TEST_%');
};

// =============================================================================
// TESTS DE EDGE CASES DE duplicatePlan
// =============================================================================

describe('Feature: Edge Cases de duplicatePlan', () => {
  afterEach(async () => {
    await cleanupTestPlans();
  });

  describe('Scenario: duplicatePlan cuando ya existe basic_copy_1', () => {
    it('Given existe plan con code=BASIC y ya existe BASIC_COPY_1', async () => {
      const original = await createTestPlan({ code: 'BASIC_EDGE' });
      await createTestPlan({ code: 'BASIC_EDGE_COPY_1' });

      const duplicate = await duplicatePlan(original.id);

      expect(duplicate.code).toContain('BASIC_EDGE_COPY');
      expect(duplicate.code).not.toBe('BASIC_EDGE_COPY_1');
    });
  });

  describe('Scenario: duplicatePlan no copia stripe_price_*_id', () => {
    it('Given un plan con stripe_price_monthly_id', async () => {
      const original = await createTestPlan({
        code: 'STRIPE_TEST',
        stripe_price_monthly_id: 'price_xxx',
        stripe_price_annual_id: 'price_yyy',
      });

      const duplicate = await duplicatePlan(original.id);

      expect(duplicate.stripe_price_monthly_id).toBeNull();
      expect(duplicate.stripe_price_annual_id).toBeNull();
    });
  });

  describe('Scenario: duplicatePlan crea el nuevo en status=draft', () => {
    it('Given un plan activo con status=active', async () => {
      const original = await createTestPlan({
        code: 'ACTIVE_PLAN',
        status: 'active',
      });

      const duplicate = await duplicatePlan(original.id);

      expect(duplicate.status).toBe('draft');
      expect(duplicate.visible_for_new_accounts).toBe(false);
    });
  });
});

// =============================================================================
// TESTS DE EDGE CASES DE updatePlan
// =============================================================================

describe('Feature: Edge Cases de updatePlan', () => {
  afterEach(async () => {
    await cleanupTestPlans();
  });

  describe('Scenario: updatePlan cambia code a uno ya existente (UNIQUE violation)', () => {
    it('Given existe plan_A con code=BASIC y plan_B con code=PREMIUM', async () => {
      const planA = await createTestPlan({ code: 'BASIC_A' });
      const planB = await createTestPlan({ code: 'PREMIUM_B' });

      await expect(updatePlan(planB.id, { code: 'BASIC_A' })).rejects.toThrow();
    });
  });

  describe('Scenario: updatePlan cambia monthly_price de un plan en uso', () => {
    it('Given un plan puede cambiar precio (con warning via canModifyPlan)', async () => {
      const plan = await createTestPlan({ monthly_price: 50 });

      const updated = await updatePlan(plan.id, { monthly_price: 100 });

      expect(updated.monthly_price).toBe(100);
      
      const modifyInfo = await canModifyPlan(plan.id);
      expect(modifyInfo).toHaveProperty('canModify');
    });
  });

  describe('Scenario: updated_at se actualiza automáticamente tras updatePlan', () => {
    it('Given existe un plan', async () => {
      const plan = await createTestPlan({ name: 'Original' });
      const originalUpdatedAt = plan.updated_at;

      await new Promise(resolve => setTimeout(resolve, 1000));

      const updated = await updatePlan(plan.id, { name: 'Nuevo Nombre' });

      expect(new Date(updated.updated_at).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });
  });
});

// =============================================================================
// TESTS DE isPlanActive COMPLETOS
// =============================================================================

describe('Feature: isPlanActive definición completa', () => {
  describe('Scenario: isPlanActive retorna false si status != active', () => {
    it('Given un plan con status = deprecated', () => {
      const plan = {
        status: 'deprecated',
        start_date: '2024-01-01',
        end_date: null,
      };

      expect(isPlanActive(plan)).toBe(false);
    });
  });

  describe('Scenario: isPlanActive retorna false si end_date es pasado', () => {
    it('Given un plan con status=active y end_date = ayer', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const plan = {
        status: 'active',
        start_date: '2024-01-01',
        end_date: yesterday.toISOString().split('T')[0],
      };

      expect(isPlanActive(plan)).toBe(false);
    });
  });

  describe('Scenario: isPlanActive retorna true solo si status=active Y vigencia válida', () => {
    it('Given un plan activo y vigente', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const plan = {
        status: 'active',
        start_date: yesterday.toISOString().split('T')[0],
        end_date: tomorrow.toISOString().split('T')[0],
      };

      expect(isPlanActive(plan)).toBe(true);
    });
  });
});

// =============================================================================
// TESTS DE setEndDate y toggleVisibility
// =============================================================================

describe('Feature: Funciones setEndDate y toggleVisibility', () => {
  afterEach(async () => {
    await cleanupTestPlans();
  });

  describe('Scenario: setEndDate establece fecha de fin válida', () => {
    it('Given un plan activo sin end_date', async () => {
      const plan = await createTestPlan({ end_date: null });

      const updated = await setEndDate(plan.id, '2026-12-31');

      expect(updated.end_date).toBe('2026-12-31');
      expect(updated.status).toBe('active');
    });
  });

  describe('Scenario: setEndDate rechaza fecha anterior a start_date', () => {
    it('Given un plan con start_date = 2026-01-01', async () => {
      const plan = await createTestPlan({ start_date: '2026-01-01' });

      await expect(setEndDate(plan.id, '2025-12-31')).rejects.toThrow(
        'end_date debe ser posterior a start_date'
      );
    });
  });

  describe('Scenario: toggleVisibility cambia de true a false', () => {
    it('Given un plan con visible_for_new_accounts = true', async () => {
      const plan = await createTestPlan({ visible_for_new_accounts: true });

      const updated = await toggleVisibility(plan.id);

      expect(updated.visible_for_new_accounts).toBe(false);
    });
  });

  describe('Scenario: toggleVisibility cambia de false a true', () => {
    it('Given un plan con visible_for_new_accounts = false', async () => {
      const plan = await createTestPlan({ visible_for_new_accounts: false });

      const updated = await toggleVisibility(plan.id);

      expect(updated.visible_for_new_accounts).toBe(true);
    });
  });
});

// =============================================================================
// TESTS DE canModifyPlan MÁS CONCRETO
// =============================================================================

describe('Feature: canModifyPlan más concreto', () => {
  afterEach(async () => {
    await cleanupTestPlans();
  });

  describe('Scenario: canModifyPlan retorna true si nadie usa el plan', () => {
    it('Given el plan no está asignado a ninguna client_account', async () => {
      const plan = await createTestPlan();

      const result = await canModifyPlan(plan.id);

      expect(result.canModify).toBe(true);
      expect(result.activeAccounts).toBe(0);
    });
  });

  describe('Scenario: canModifyPlan retorna info si hay cuentas usando el plan', () => {
    it('Given el plan puede estar en uso', async () => {
      const plan = await createTestPlan();

      const result = await canModifyPlan(plan.id);

      expect(result).toHaveProperty('canModify');
      expect(result).toHaveProperty('activeAccounts');
      expect(typeof result.activeAccounts).toBe('number');
    });
  });
});

// =============================================================================
// TESTS DE FILTROS DE getPlans
// =============================================================================

describe('Feature: Filtros de getPlans', () => {
  afterEach(async () => {
    await cleanupTestPlans();
  });

  describe('Scenario: Filtrar planes vigentes hoy (validToday)', () => {
    it('Given existen planes con diferentes rangos de fechas', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await createTestPlan({
        code: 'VALID_TODAY',
        start_date: yesterday.toISOString().split('T')[0],
        end_date: tomorrow.toISOString().split('T')[0],
      });
      await createTestPlan({
        code: 'EXPIRED',
        start_date: '2020-01-01',
        end_date: yesterday.toISOString().split('T')[0],
      });

      const validPlans = await getPlans({ validToday: true });

      const validCodes = validPlans.map(p => p.code);
      expect(validCodes).toContain('VALID_TODAY');
      expect(validCodes).not.toContain('EXPIRED');
    });
  });

  describe('Scenario: Buscar plan por texto (search)', () => {
    it('Given existen planes: Básico, Premium, Enterprise', async () => {
      await createTestPlan({ code: 'BASIC', name: 'Básico' });
      await createTestPlan({ code: 'PREMIUM', name: 'Premium' });
      await createTestPlan({ code: 'ENTERPRISE', name: 'Enterprise' });

      const results = await getPlans({ search: 'prem' });

      expect(results.some(p => p.name === 'Premium')).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Scenario: Combinar múltiples filtros', () => {
    it('Given existen varios planes', async () => {
      await createTestPlan({
        code: 'FEATURED_ACTIVE',
        status: 'active',
        is_featured: true,
      });
      await createTestPlan({
        code: 'NOT_FEATURED',
        status: 'active',
        is_featured: false,
      });

      const results = await getPlans({
        status: 'active',
        is_featured: true,
      });

      expect(results.every(p => p.status === 'active')).toBe(true);
      expect(results.every(p => p.is_featured === true)).toBe(true);
    });
  });

  describe('Scenario: getPlans sin filtros retorna todos los planes', () => {
    it('Given existen planes con diferentes status', async () => {
      await createTestPlan({ code: 'ACTIVE_1', status: 'active' });
      await createTestPlan({ code: 'DRAFT_1', status: 'draft' });
      await createTestPlan({ code: 'DEPRECATED_1', status: 'deprecated' });

      const allPlans = await getPlans();

      const codes = allPlans.map(p => p.code);
      expect(codes).toContain('ACTIVE_1');
      expect(codes).toContain('DRAFT_1');
      expect(codes).toContain('DEPRECATED_1');
    });
  });
});
