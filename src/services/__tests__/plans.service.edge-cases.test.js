// =============================================================================
// Tests BDD adicionales para edge cases identificados por Claude
// =============================================================================

import { describe, it, expect, afterEach, vi } from 'vitest';

// Desactivar mock de supabaseClient para este archivo de tests de integración
// Estos tests necesitan el cliente real de Supabase para funcionar correctamente
vi.unmock('../supabaseClient');
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
      const _planA = await createTestPlan({ code: 'BASIC_A' });
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
