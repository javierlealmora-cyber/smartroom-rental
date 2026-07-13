// =============================================================================
// src/services/__tests__/plans.service.test.js
// =============================================================================
// Tests BDD para el servicio de planes de suscripción
// Framework: Vitest
// =============================================================================

import { describe, it, expect, afterEach } from 'vitest';
import {
  getPlans,
  getPlanByCode,
  createPlan,
  updatePlan,
  deactivatePlan,
  duplicatePlan,
  validatePlanData,
  calculateFinalPrice,
  calculateMonthlyFinalPrice,
  isPlanActive,
  validateCodeFormat,
  PLAN_STATUS,
} from '../plans.service';
import { supabase } from '../supabaseClient';

// =============================================================================
// HELPERS DE PRUEBA
// =============================================================================

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
// TESTS DE VALIDACIÓN DE CAMPOS REQUERIDOS
// =============================================================================

describe('Feature: Validación de Campos Requeridos', () => {
  afterEach(async () => {
    await cleanupTestPlans();
  });

  describe('Scenario: Crear plan con todos los campos mínimos requeridos', () => {
    it('Given tengo datos con solo los campos obligatorios sin default', async () => {
      const data = {
        name: 'Básico',
        code: 'BASIC_TEST_MIN',
        monthly_price: 29.99,
      };

      const plan = await createPlan(data);

      // Then el plan se crea exitosamente
      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
      expect(plan.name).toBe('Básico');
      expect(plan.code).toBe('BASIC_TEST_MIN');
      expect(plan.monthly_price).toBe(29.99);

      // And los campos con default se establecen automáticamente
      expect(plan.status).toBe('active');
      expect(plan.start_date).toBeDefined();
      expect(plan.tax_percent).toBe(21);
      expect(plan.max_owners).toBe(1);
      expect(plan.max_accommodations).toBe(3);
      expect(plan.max_rooms).toBe(20);
      expect(plan.max_admin_users).toBe(3);
      expect(plan.max_associated_admins).toBe(2);
      expect(plan.max_api_users).toBe(1);
      expect(plan.max_viewer_users).toBe(0);
      expect(plan.branding_enabled).toBe(false);
      expect(plan.logo_allowed).toBe(false);
      expect(plan.theme_editable).toBe(false);
      expect(plan.allows_multi_owner).toBe(false);
      expect(plan.allows_owner_change).toBe(false);
      expect(plan.allows_receipt_upload).toBe(false);
      expect(plan.services).toEqual([]);
      expect(plan.features).toEqual([]);
      expect(plan.visible_for_new_accounts).toBe(true);
      expect(plan.is_featured).toBe(false);
    });
  });

  describe('Scenario: Intentar crear plan sin campo \'name\' (requerido)', () => {
    it('Given tengo datos sin el campo name', async () => {
      const data = {
        code: 'TEST_NO_NAME',
        monthly_price: 29.99,
      };

      // When llamo a createPlan(data)
      // Then obtengo un error de validación
      await expect(createPlan(data)).rejects.toThrow(
        "El campo 'name' es obligatorio"
      );
    });
  });

  describe('Scenario: Intentar crear plan sin campo \'code\' (requerido)', () => {
    it('Given tengo datos sin el campo code', async () => {
      const data = {
        name: 'Básico',
        monthly_price: 29.99,
      };
