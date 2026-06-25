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

      // When llamo a createPlan(data)
      // Then obtengo un error de validación
      await expect(createPlan(data)).rejects.toThrow(
        "El campo 'code' es obligatorio"
      );
    });
  });

  describe('Scenario: Intentar crear plan sin campo \'monthly_price\' (requerido)', () => {
    it('Given tengo datos sin el campo monthly_price', async () => {
      const data = {
        name: 'Básico',
        code: 'TEST_NO_PRICE',
      };

      // When llamo a createPlan(data)
      // Then obtengo un error de validación
      await expect(createPlan(data)).rejects.toThrow(
        "El campo 'monthly_price' es obligatorio"
      );
    });
  });

  describe('Scenario: Crear plan con campos opcionales incluidos', () => {
    it('Given tengo datos con campos opcionales', async () => {
      const data = {
        name: 'Premium',
        code: 'TEST_PREMIUM_OPT',
        monthly_price: 99.99,
        description: 'Plan premium con todas las funciones',
        end_date: '2026-12-31',
        stripe_price_monthly_id: 'price_xxx',
        stripe_price_annual_id: 'price_yyy',
      };

      const plan = await createPlan(data);

      // Then el plan se crea exitosamente
      expect(plan).toBeDefined();
      // And los campos opcionales se guardan correctamente
      expect(plan.description).toBe('Plan premium con todas las funciones');
      expect(plan.end_date).toBe('2026-12-31');
      expect(plan.stripe_price_monthly_id).toBe('price_xxx');
      expect(plan.stripe_price_annual_id).toBe('price_yyy');
    });
  });

  describe('Scenario: Crear plan sin campos opcionales', () => {
    it('Given tengo datos sin campos opcionales', async () => {
      const data = {
        name: 'Básico',
        code: 'TEST_BASIC_NO_OPT',
        monthly_price: 29.99,
      };

      const plan = await createPlan(data);

      // Then el plan se crea exitosamente
      expect(plan).toBeDefined();
      // And los campos opcionales son null
      expect(plan.description).toBeNull();
      expect(plan.end_date).toBeNull();
      expect(plan.deactivated_at).toBeNull();
      expect(plan.stripe_price_monthly_id).toBeNull();
      expect(plan.stripe_price_annual_id).toBeNull();
    });
  });
});

// =============================================================================
// TESTS DE VALIDACIÓN DE TAMAÑO DE CAMPOS
// =============================================================================

describe('Feature: Validación de Tamaño de Campos', () => {
  afterEach(async () => {
    await cleanupTestPlans();
  });

  describe('Scenario: Rechazar name vacío (solo espacios)', () => {
    it('Given tengo datos con name solo espacios', async () => {
      const data = {
        name: '   ',
        code: 'TEST_EMPTY_NAME',
        monthly_price: 29.99,
      };

      await expect(createPlan(data)).rejects.toThrow(
        'El campo name no puede estar vacío'
      );
    });
  });

  describe('Scenario: Rechazar name demasiado largo (> 100 chars)', () => {
    it('Given tengo datos con name de 101 caracteres', async () => {
      const data = {
        name: 'A'.repeat(101),
        code: 'TEST_LONG_NAME',
        monthly_price: 29.99,
      };

      await expect(createPlan(data)).rejects.toThrow(
        'El nombre no puede superar 100 caracteres'
      );
    });
  });

  describe('Scenario: Rechazar description demasiado larga (> 1000 chars)', () => {
    it('Given tengo datos con description de 1001 caracteres', async () => {
      const data = {
        name: 'Plan Test',
        code: 'TEST_LONG_DESC',
        monthly_price: 29.99,
        description: 'A'.repeat(1001),
      };

      await expect(createPlan(data)).rejects.toThrow(
        'La descripción no puede superar 1000 caracteres'
      );
    });
  });

  describe('Scenario: Rechazar code demasiado largo (> 50 chars)', () => {
    it('Given tengo datos con code de 51 caracteres', async () => {
      const data = {
        name: 'Plan Test',
        code: 'A'.repeat(51),
        monthly_price: 29.99,
      };

      await expect(createPlan(data)).rejects.toThrow(
        'El código no puede superar 50 caracteres'
      );
    });
  });
});

// =============================================================================
// TESTS DE VALIDACIÓN DE FORMATO DE CODE
// =============================================================================

describe('Feature: Validación de Formato de Code', () => {
  afterEach(async () => {
    await cleanupTestPlans();
  });

  describe('Scenario: Normalizar code a UPPERCASE automáticamente', () => {
    it('Given tengo datos con code en minúsculas', async () => {
      const data = {
        name: 'Plan Test',
        code: 'basic_plan',
        monthly_price: 29.99,
      };

      const plan = await createPlan(data);

      // Then el plan se crea exitosamente
      expect(plan).toBeDefined();
      // And code se guarda como UPPERCASE
      expect(plan.code).toBe('BASIC_PLAN');
    });
  });

  describe('Scenario: Rechazar code con caracteres especiales', () => {
    it('Given tengo datos con code con caracteres especiales', async () => {
      const data = {
        name: 'Plan Test',
        code: 'PLAN-BÁSICO!',
        monthly_price: 29.99,
      };

      await expect(createPlan(data)).rejects.toThrow(
        'El código solo puede contener letras mayúsculas, números y guión bajo'
      );
    });
  });

  describe('Scenario: Rechazar code con espacios', () => {
    it('Given tengo datos con code con espacios', async () => {
      const data = {
        name: 'Plan Test',
        code: 'PLAN BASICO',
        monthly_price: 29.99,
      };

      await expect(createPlan(data)).rejects.toThrow(
        'El código solo puede contener letras mayúsculas, números y guión bajo'
      );
    });
  });

  describe('Scenario: Aceptar code válido con guión bajo y números', () => {
    it('Given tengo datos con code válido', async () => {
      const data = {
        name: 'Plan Test',
        code: 'PLAN_BASICO_2026',
        monthly_price: 29.99,
      };

      const plan = await createPlan(data);

      expect(plan).toBeDefined();
      expect(plan.code).toBe('PLAN_BASICO_2026');
    });
  });
});

// =============================================================================
// TESTS DE VALIDACIÓN DE CONSTRAINTS
// =============================================================================

describe('Feature: Validación de Constraints', () => {
  afterEach(async () => {
    await cleanupTestPlans();
  });

  describe('Scenario: Validar status con valor inválido', () => {
    it('Given tengo datos con status inválido', async () => {
      const data = {
        name: 'Básico',
        code: 'test_invalid_status',
        monthly_price: 29.99,
        status: 'invalid_status',
      };

      // When llamo a createPlan(data)
      // Then obtengo un error de validación
      await expect(createPlan(data)).rejects.toThrow(
        'status debe ser uno de: draft, active, deprecated, expired, disabled'
      );
    });
  });

  describe('Scenario: Validar status con valores válidos', () => {
    it('Given tengo datos con cada status válido', async () => {
      const statuses = ['draft', 'active', 'deprecated', 'expired', 'disabled'];

      for (const status of statuses) {
        const data = {
          name: `Plan ${status}`,
          code: `test_${status}_${Date.now()}`,
          monthly_price: 29.99,
          status,
        };

        const plan = await createPlan(data);
        expect(plan.status).toBe(status);
      }
    });
  });

  describe('Scenario: Validar código único (UNIQUE constraint)', () => {
    it('Given existe un plan con code "TEST_UNIQUE"', async () => {
      await createTestPlan({ code: 'TEST_UNIQUE' });

      // When intento crear otro plan con el mismo code
      const duplicateData = {
        name: 'Otro Plan',
        code: 'TEST_UNIQUE',
        monthly_price: 49.99,
      };

      // Then obtengo un error
      await expect(createPlan(duplicateData)).rejects.toThrow(
        'El código "TEST_UNIQUE" ya existe'
      );
    });
  });

  describe('Scenario: Validar monthly_price positivo', () => {
    it('Given tengo datos con monthly_price negativo', async () => {
      const data = {
        name: 'Básico',
        code: 'TEST_NEGATIVE_PRICE',
        monthly_price: -10,
      };

      await expect(createPlan(data)).rejects.toThrow(
        'monthly_price debe ser mayor que 0'
      );
    });
  });

  describe('Scenario: Redondear monthly_price a 2 decimales', () => {
    it('Given tengo datos con monthly_price con más de 2 decimales', async () => {
      const data = {
        name: 'Plan Test',
        code: 'TEST_ROUND_PRICE',
        monthly_price: 29.999,
      };

      const plan = await createPlan(data);
      expect(plan.monthly_price).toBe(30.00);
    });
  });

  describe('Scenario: Validar end_date posterior a start_date', () => {
    it('Given tengo datos con end_date anterior a start_date', async () => {
      const data = {
        name: 'Básico',
        code: 'TEST_INVALID_DATES',
        monthly_price: 29.99,
        start_date: '2026-12-31',
        end_date: '2026-01-01',
      };

      await expect(createPlan(data)).rejects.toThrow(
        'end_date debe ser posterior a start_date'
      );
    });
  });

  describe('Scenario: Validar max_rooms como entero', () => {
    it('Given tengo datos con max_rooms = -1 (ilimitado)', async () => {
      const data = {
        name: 'Plan Ilimitado',
        code: 'TEST_UNLIMITED',
        monthly_price: 199.99,
        max_rooms: -1,
      };

      const plan = await createPlan(data);
      expect(plan).toBeDefined();
      expect(plan.max_rooms).toBe(-1);
    });
  });

  describe('Scenario: Rechazar max_rooms = 0', () => {
    it('Given tengo datos con max_rooms = 0', async () => {
      const data = {
        name: 'Plan Test',
        code: 'TEST_ZERO_ROOMS',
        monthly_price: 29.99,
        max_rooms: 0,
      };

      await expect(createPlan(data)).rejects.toThrow(
        'max_rooms debe ser un entero: -1 (ilimitado) o mayor que 0'
      );
    });
  });
});

// =============================================================================
// TESTS DE CÁLCULO DE IVA
// =============================================================================

describe('Feature: Cálculo de IVA', () => {
  describe('Scenario: Calcular precio final mensual con IVA estándar (21%)', () => {
    it('Given monthly_price = 100 y tax_percent = 21', () => {
      const result = calculateFinalPrice(100, 21);
      expect(result).toBe(121.00);
    });
  });

  describe('Scenario: Calcular precio final con IVA reducido (10%)', () => {
    it('Given monthly_price = 100 y tax_percent = 10', () => {
      const result = calculateFinalPrice(100, 10);
      expect(result).toBe(110.00);
    });
  });

  describe('Scenario: Calcular precio con IVA superreducido (4%)', () => {
    it('Given monthly_price = 100 y tax_percent = 4', () => {
      const result = calculateFinalPrice(100, 4);
      expect(result).toBe(104.00);
    });
  });

  describe('Scenario: Plan exento de IVA (tax_percent = 0)', () => {
    it('Given monthly_price = 100 y tax_percent = 0', async () => {
      const result = calculateFinalPrice(100, 0);
      expect(result).toBe(100.00);

      // Verificar que se puede crear un plan con IVA 0
      const data = {
        name: 'Plan Exento',
        code: 'TEST_NO_TAX',
        monthly_price: 100,
        tax_percent: 0,
      };
      const plan = await createPlan(data);
      expect(plan.tax_percent).toBe(0);
    });
  });

  describe('Scenario: Rechazar tax_percent negativo', () => {
    it('Given tengo datos con tax_percent = -5', async () => {
      const data = {
        name: 'Plan Test',
        code: 'TEST_NEGATIVE_TAX',
        monthly_price: 100,
        tax_percent: -5,
      };

      await expect(createPlan(data)).rejects.toThrow(
        'tax_percent debe estar entre 0 y 100'
      );
    });
  });

  describe('Scenario: Rechazar tax_percent mayor de 100', () => {
    it('Given tengo datos con tax_percent = 101', async () => {
      const data = {
        name: 'Plan Test',
        code: 'TEST_HIGH_TAX',
        monthly_price: 100,
        tax_percent: 101,
      };

      await expect(createPlan(data)).rejects.toThrow(
        'tax_percent debe estar entre 0 y 100'
      );
    });
  });

  describe('Scenario: Calcular precio mensual final de un plan', () => {
    it('Given un plan con monthly_price y tax_percent', () => {
      const plan = {
        monthly_price: 50,
        tax_percent: 21,
      };

      const result = calculateMonthlyFinalPrice(plan);
      expect(result).toBe(60.50);
    });
  });
});

// =============================================================================
// TESTS DE CAMPOS CONDICIONALES
// =============================================================================

describe('Feature: Campos Condicionales', () => {
  afterEach(async () => {
    await cleanupTestPlans();
  });

  describe('Scenario: deactivated_at NO puede existir con status distinto de disabled', () => {
    it('Given tengo datos con status = active y deactivated_at', async () => {
      const data = {
        name: 'Plan Test',
        code: 'TEST_INVALID_DEACTIVATED',
        monthly_price: 29.99,
        status: 'active',
        deactivated_at: new Date().toISOString(),
      };

      await expect(createPlan(data)).rejects.toThrow(
        'deactivated_at solo se puede establecer cuando status=disabled'
      );
    });
  });

  describe('Scenario: status=expired requiere end_date en el pasado', () => {
    it('Given tengo datos con status = expired y end_date futuro', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const data = {
        name: 'Plan Test',
        code: 'TEST_EXPIRED_FUTURE',
        monthly_price: 29.99,
        status: 'expired',
        end_date: tomorrow.toISOString().split('T')[0],
      };

      await expect(createPlan(data)).rejects.toThrow(
        'Un plan con status=expired debe tener end_date en el pasado'
      );
    });
  });

  describe('Scenario: is_featured=true con visible_for_new_accounts=false (permitido)', () => {
    it('Given tengo datos con is_featured = true y visible = false', async () => {
      const data = {
        name: 'Plan Destacado Privado',
        code: 'TEST_FEATURED_PRIVATE',
        monthly_price: 99.99,
        is_featured: true,
        visible_for_new_accounts: false,
      };

      const plan = await createPlan(data);
      expect(plan).toBeDefined();
      expect(plan.is_featured).toBe(true);
      expect(plan.visible_for_new_accounts).toBe(false);
    });
  });
});

// =============================================================================
// TESTS CRUD BÁSICOS
// =============================================================================

describe('Feature: CRUD Básico', () => {
  afterEach(async () => {
    await cleanupTestPlans();
  });

  describe('Scenario: Listar todos los planes', () => {
    it('Given existen planes en la base de datos', async () => {
      await createTestPlan({ code: 'TEST_LIST_1' });
      await createTestPlan({ code: 'TEST_LIST_2' });

      const plans = await getPlans();

      // Then obtengo un array de planes
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThanOrEqual(2);

      // And cada plan tiene todos los campos requeridos
      plans.forEach((plan) => {
        expect(plan.id).toBeDefined();
        expect(plan.name).toBeDefined();
        expect(plan.code).toBeDefined();
        expect(plan.monthly_price).toBeDefined();
      });
    });
  });

  describe('Scenario: Filtrar planes activos', () => {
    it('Given existen planes con diferentes estados', async () => {
      await createTestPlan({ code: 'TEST_ACTIVE', status: 'active' });
      await createTestPlan({ code: 'TEST_DRAFT', status: 'draft' });

      const activePlans = await getPlans({ status: 'active' });

      // Then obtengo solo planes con status active
      activePlans.forEach((plan) => {
        expect(plan.status).toBe('active');
      });
    });
  });

  describe('Scenario: Buscar plan por código', () => {
    it('Given existe un plan con code "TEST_SEARCH"', async () => {
      await createTestPlan({ code: 'TEST_SEARCH', name: 'Plan Búsqueda' });

      const plan = await getPlanByCode('TEST_SEARCH');

      // Then obtengo el plan correcto
      expect(plan).toBeDefined();
      expect(plan.code).toBe('TEST_SEARCH');
      expect(plan.name).toBe('Plan Búsqueda');
    });
  });

  describe('Scenario: Actualizar plan existente', () => {
    it('Given existe un plan', async () => {
      const originalPlan = await createTestPlan({ name: 'Original' });

      const updatedPlan = await updatePlan(originalPlan.id, {
        name: 'Nuevo Nombre',
      });

      // Then el plan se actualiza correctamente
      expect(updatedPlan.name).toBe('Nuevo Nombre');
      // And updated_at se actualiza automáticamente
      expect(new Date(updatedPlan.updated_at).getTime()).toBeGreaterThan(
        new Date(originalPlan.updated_at).getTime()
      );
    });
  });

  describe('Scenario: Desactivar plan', () => {
    it('Given existe un plan activo', async () => {
      const plan = await createTestPlan({ status: 'active' });

      const deactivated = await deactivatePlan(plan.id, 'Obsoleto');

      // Then status cambia a disabled
      expect(deactivated.status).toBe('disabled');
      // And deactivated_at se establece
      expect(deactivated.deactivated_at).toBeDefined();
    });
  });

  describe('Scenario: Duplicar plan', () => {
    it('Given existe un plan con code "TEST_DUPLICATE"', async () => {
      const original = await createTestPlan({
        code: 'TEST_DUPLICATE',
        name: 'Original',
      });

      const duplicate = await duplicatePlan(original.id);

      // Then se crea un nuevo plan
      expect(duplicate.id).not.toBe(original.id);
      // And el code es diferente
      expect(duplicate.code).toContain('TEST_DUPLICATE_COPY');
      // And el status es draft
      expect(duplicate.status).toBe('draft');
      // And el nombre indica que es copia
      expect(duplicate.name).toContain('(Copia)');
    });
  });
});

// =============================================================================
// TESTS DE UTILIDADES
// =============================================================================

describe('Feature: Funciones Utilidad', () => {
  describe('calculateFinalPrice', () => {
    it('calcula correctamente el precio con IVA', () => {
      expect(calculateFinalPrice(100, 21)).toBe(121);
      expect(calculateFinalPrice(50, 10)).toBe(55);
      expect(calculateFinalPrice(75, 0)).toBe(75);
    });
  });

  describe('validateCodeFormat', () => {
    it('valida correctamente el formato del código', () => {
      expect(validateCodeFormat('BASIC_PLAN').valid).toBe(true);
      expect(validateCodeFormat('PLAN_2026').valid).toBe(true);
      expect(validateCodeFormat('plan-basic').valid).toBe(false);
      expect(validateCodeFormat('PLAN BASIC').valid).toBe(false);
      expect(validateCodeFormat('').valid).toBe(false);
    });
  });

  describe('isPlanActive', () => {
    it('retorna true para plan activo y vigente', () => {
      const plan = {
        status: 'active',
        start_date: '2024-01-01',
        end_date: null,
      };
      expect(isPlanActive(plan)).toBe(true);
    });

    it('retorna false para plan no activo', () => {
      const plan = {
        status: 'draft',
        start_date: '2024-01-01',
        end_date: null,
      };
      expect(isPlanActive(plan)).toBe(false);
    });

    it('retorna false si end_date es pasado (aunque status=active)', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const plan = {
        status: 'active',
        start_date: '2024-01-01',
        end_date: yesterday.toISOString().split('T')[0],
      };
      expect(isPlanActive(plan)).toBe(false);
    });

    it('retorna true solo si status=active Y vigencia válida', () => {
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

  describe('validatePlanData', () => {
    it('valida correctamente datos completos', () => {
      const data = {
        name: 'Test',
        code: 'TEST',
        monthly_price: 29.99,
      };
      const result = validatePlanData(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detecta campos faltantes', () => {
      const data = {
        code: 'TEST',
      };
      const result = validatePlanData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('normaliza code a UPPERCASE', () => {
      const data = {
        name: 'Test',
        code: 'test_plan',
        monthly_price: 29.99,
      };
      validatePlanData(data);
      expect(data.code).toBe('TEST_PLAN');
    });
  });
});
