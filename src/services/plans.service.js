// =============================================================================
// src/services/plans.service.js
// =============================================================================
// Servicio para gestión de planes de suscripción (plans_catalog)
// Conectado a Supabase - Reemplaza plans.mock.js
// =============================================================================

import { supabase } from './supabaseClient';

// =============================================================================
// CONSTANTES
// =============================================================================

export const PLAN_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  DEPRECATED: 'deprecated',
  EXPIRED: 'expired',
  DISABLED: 'disabled',
};

export const PLAN_STATUS_LABELS = {
  [PLAN_STATUS.DRAFT]: 'Borrador',
  [PLAN_STATUS.ACTIVE]: 'Activo',
  [PLAN_STATUS.DEPRECATED]: 'Obsoleto',
  [PLAN_STATUS.EXPIRED]: 'Expirado',
  [PLAN_STATUS.DISABLED]: 'Desactivado',
};

// Campos obligatorios sin default (deben ser proporcionados)
const REQUIRED_FIELDS = ['name', 'code', 'monthly_price'];

// Límites de tamaño de campos
const FIELD_LIMITS = {
  name: 100,
  code: 50,
  description: 1000,
  stripe_price_monthly_id: 100,
  stripe_price_annual_id: 100,
};

// Campos opcionales
const OPTIONAL_FIELDS = [
  'description',
  'end_date',
  'deactivated_at',
  'stripe_price_monthly_id',
  'stripe_price_annual_id',
];

// =============================================================================
// VALIDACIONES
// =============================================================================

/**
 * Valida los datos de un plan antes de crear/actualizar
 * @param {Object} data - Datos del plan
 * @param {boolean} isUpdate - Si es una actualización (campos requeridos opcionales)
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validatePlanData = (data, isUpdate = false) => {
  const errors = [];

  // Validar campos requeridos (solo en creación)
  if (!isUpdate) {
    if (!data.name || !data.name.trim()) {
      errors.push("El campo 'name' es obligatorio");
    }
    if (!data.code || !data.code.trim()) {
      errors.push("El campo 'code' es obligatorio");
    }
    if (data.monthly_price === undefined || data.monthly_price === null) {
      errors.push("El campo 'monthly_price' es obligatorio");
    }
  }

  // Validar monthly_price si está presente
  if (data.monthly_price !== undefined) {
    const price = parseFloat(data.monthly_price);
    if (isNaN(price) || price <= 0) {
      errors.push('monthly_price debe ser mayor que 0');
    }
  }

  // Normalizar code a UPPERCASE y validar formato
  if (data.code) {
    data.code = data.code.toUpperCase().trim();
    
    // Validar formato: solo mayúsculas, números y guión bajo
    const codeRegex = /^[A-Z0-9_]+$/;
    if (!codeRegex.test(data.code)) {
      errors.push('El código solo puede contener letras mayúsculas, números y guión bajo');
    }
  }

  // Validar tamaño de campos
  if (data.name && data.name.trim().length === 0) {
    errors.push('El campo name no puede estar vacío');
  }
  if (data.name && data.name.length > FIELD_LIMITS.name) {
    errors.push(`El nombre no puede superar ${FIELD_LIMITS.name} caracteres`);
  }
  if (data.code && data.code.length > FIELD_LIMITS.code) {
    errors.push(`El código no puede superar ${FIELD_LIMITS.code} caracteres`);
  }
  if (data.description && data.description.length > FIELD_LIMITS.description) {
    errors.push(`La descripción no puede superar ${FIELD_LIMITS.description} caracteres`);
  }
  if (data.stripe_price_monthly_id && data.stripe_price_monthly_id.length > FIELD_LIMITS.stripe_price_monthly_id) {
    errors.push(`El ID de precio mensual de Stripe no puede superar ${FIELD_LIMITS.stripe_price_monthly_id} caracteres`);
  }
  if (data.stripe_price_annual_id && data.stripe_price_annual_id.length > FIELD_LIMITS.stripe_price_annual_id) {
    errors.push(`El ID de precio anual de Stripe no puede superar ${FIELD_LIMITS.stripe_price_annual_id} caracteres`);
  }

  // Validar status
  if (data.status && !Object.values(PLAN_STATUS).includes(data.status)) {
    errors.push(
      `status debe ser uno de: ${Object.values(PLAN_STATUS).join(', ')}`
    );
  }

  // Validar fechas
  if (data.start_date && data.end_date) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    if (end < start) {
      errors.push('end_date debe ser posterior a start_date');
    }
  }

  // Redondear monthly_price a 2 decimales
  if (data.monthly_price !== undefined) {
    data.monthly_price = Math.round(data.monthly_price * 100) / 100;
  }

  // Validar tax_percent
  if (data.tax_percent !== undefined) {
    const tax = parseFloat(data.tax_percent);
    if (isNaN(tax) || tax < 0 || tax > 100) {
      errors.push('tax_percent debe estar entre 0 y 100');
    }
  }

  // Validar límites (max_*) - deben ser enteros
  // Campos que NO permiten 0 (debe ser -1 o > 0)
  const limitFieldsNoZero = [
    'max_owners',
    'max_accommodations',
    'max_rooms',
    'max_admin_users',
  ];

  // Campos que SÍ permiten 0 (puede ser -1, 0 o > 0)
  const limitFieldsAllowZero = [
    'max_associated_admins',
    'max_api_users',
    'max_viewer_users',
  ];

  limitFieldsNoZero.forEach((field) => {
    if (data[field] !== undefined) {
      const value = parseInt(data[field]);
      if (isNaN(value) || !Number.isInteger(Number(data[field])) || (value !== -1 && value <= 0)) {
        errors.push(`${field} debe ser un entero: -1 (ilimitado) o mayor que 0`);
      }
    }
  });

  limitFieldsAllowZero.forEach((field) => {
    if (data[field] !== undefined) {
      const value = parseInt(data[field]);
      if (isNaN(value) || !Number.isInteger(Number(data[field])) || (value !== -1 && value < 0)) {
        errors.push(`${field} debe ser un entero: -1 (ilimitado), 0 o mayor que 0`);
      }
    }
  });

  // Validar campos condicionales
  if (data.deactivated_at && data.status && data.status !== 'disabled') {
    errors.push('deactivated_at solo se puede establecer cuando status=disabled');
  }

  if (data.status === 'expired' && data.end_date) {
    const endDate = new Date(data.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (endDate >= today) {
      errors.push('Un plan con status=expired debe tener end_date en el pasado');
    }
  }

  // Validar arrays JSON
  if (data.services !== undefined) {
    if (!Array.isArray(data.services)) {
      errors.push('services debe ser un array');
    }
  }

  if (data.features !== undefined) {
    if (!Array.isArray(data.features)) {
      errors.push('features debe ser un array');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// =============================================================================
// CRUD BÁSICO
// =============================================================================

/**
 * Obtener todos los planes con filtros opcionales
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Promise<Array>} Lista de planes
 */
export const getPlans = async (filters = {}) => {
  try {
    let query = supabase.from('plans_catalog').select('*');

    // Filtrar por status
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Filtrar por visible_for_new_accounts
    if (filters.visible_for_new_accounts !== undefined) {
      query = query.eq('visible_for_new_accounts', filters.visible_for_new_accounts);
    }

    // Filtrar por is_featured
    if (filters.is_featured !== undefined) {
      query = query.eq('is_featured', filters.is_featured);
    }

    // Buscar por nombre o código
    if (filters.search) {
      const search = `%${filters.search}%`;
      query = query.or(`name.ilike.${search},code.ilike.${search}`);
    }

    // Filtrar por vigencia actual
    if (filters.validToday) {
      const today = new Date().toISOString().split('T')[0];
      query = query
        .lte('start_date', today)
        .or(`end_date.is.null,end_date.gte.${today}`);
    }

    // Ordenar por created_at descendente
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error al obtener planes:', error);
    throw new Error(`Error al obtener planes: ${error.message}`);
  }
};

/**
 * Obtener un plan por ID
 * @param {string} id - UUID del plan
 * @returns {Promise<Object|null>} Plan encontrado o null
 */
export const getPlanById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('plans_catalog')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error al obtener plan por ID:', error);
    throw new Error(`Error al obtener plan: ${error.message}`);
  }
};

/**
 * Obtener un plan por código
 * @param {string} code - Código único del plan
 * @returns {Promise<Object|null>} Plan encontrado o null
 */
export const getPlanByCode = async (code) => {
  try {
    const { data, error } = await supabase
      .from('plans_catalog')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error al obtener plan por código:', error);
    throw new Error(`Error al obtener plan: ${error.message}`);
  }
};

/**
 * Crear un nuevo plan
 * @param {Object} data - Datos del plan
 * @returns {Promise<Object>} Plan creado
 */
export const createPlan = async (data) => {
  try {
    // Validar datos
    const validation = validatePlanData(data, false);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Verificar que el código no exista
    const existing = await getPlanByCode(data.code);
    if (existing) {
      throw new Error(`El código "${data.code}" ya existe`);
    }

    // Preparar datos (remover annual_price si viene, es GENERATED)
    const planData = { ...data };
    delete planData.annual_price;

    // Normalizar code a UPPERCASE
    planData.code = planData.code.toUpperCase();

    const { data: newPlan, error } = await supabase
      .from('plans_catalog')
      .insert([planData])
      .select()
      .single();

    if (error) throw error;
    return newPlan;
  } catch (error) {
    console.error('Error al crear plan:', error);
    throw new Error(`Error al crear plan: ${error.message}`);
  }
};

/**
 * Actualizar un plan existente
 * @param {string} id - UUID del plan
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<Object>} Plan actualizado
 */
export const updatePlan = async (id, data) => {
  try {
    // Validar datos (es update, campos requeridos opcionales)
    const validation = validatePlanData(data, true);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Si se cambia el code, verificar que no exista
    if (data.code) {
      const existing = await getPlanByCode(data.code);
      if (existing && existing.id !== id) {
        throw new Error(`El código "${data.code}" ya existe`);
      }
      data.code = data.code.toUpperCase();
    }

    // Preparar datos (remover annual_price, es GENERATED)
    const updateData = { ...data };
    delete updateData.annual_price;
    delete updateData.id; // No permitir cambiar ID
    delete updateData.created_at; // No permitir cambiar fecha creación

    // updated_at se actualiza automáticamente por trigger

    const { data: updatedPlan, error } = await supabase
      .from('plans_catalog')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updatedPlan;
  } catch (error) {
    console.error('Error al actualizar plan:', error);
    throw new Error(`Error al actualizar plan: ${error.message}`);
  }
};

/**
 * Eliminar un plan (soft delete - cambiar status a disabled)
 * @param {string} id - UUID del plan
 * @returns {Promise<Object>} Plan desactivado
 */
export const deletePlan = async (id) => {
  try {
    return await deactivatePlan(id, 'Eliminado por el usuario');
  } catch (error) {
    console.error('Error al eliminar plan:', error);
    throw new Error(`Error al eliminar plan: ${error.message}`);
  }
};

// =============================================================================
// OPERACIONES ESPECIALES
// =============================================================================

/**
 * Alternar visibilidad de un plan para nuevas altas
 * @param {string} id - UUID del plan
 * @returns {Promise<Object>} Plan actualizado
 */
export const toggleVisibility = async (id) => {
  try {
    const plan = await getPlanById(id);
    if (!plan) throw new Error('Plan no encontrado');

    return await updatePlan(id, {
      visible_for_new_accounts: !plan.visible_for_new_accounts,
    });
  } catch (error) {
    console.error('Error al alternar visibilidad:', error);
    throw new Error(`Error al alternar visibilidad: ${error.message}`);
  }
};

/**
 * Establecer fecha de fin de vigencia
 * @param {string} id - UUID del plan
 * @param {string} endDate - Fecha de fin (YYYY-MM-DD)
 * @returns {Promise<Object>} Plan actualizado
 */
export const setEndDate = async (id, endDate) => {
  try {
    // Obtener start_date del plan actual para validar
    const plan = await getPlanById(id);
    if (!plan) throw new Error('Plan no encontrado');

    // Validar que end_date sea posterior a start_date
    if (plan.start_date && endDate <= plan.start_date) {
      throw new Error('end_date debe ser posterior a start_date');
    }

    return await updatePlan(id, { end_date: endDate });
  } catch (error) {
    console.error('Error al establecer fecha fin:', error);
    // Re-lanzar error original sin wrapping para que los tests puedan verificar el mensaje
    throw error;
  }
};

/**
 * Desactivar un plan
 * @param {string} id - UUID del plan
 * @param {string} reason - Motivo de desactivación
 * @returns {Promise<Object>} Plan desactivado
 */
export const deactivatePlan = async (id, reason = '') => {
  try {
    const updateData = {
      status: PLAN_STATUS.DISABLED,
      deactivated_at: new Date().toISOString(),
    };

    // Guardar motivo en metadata (si existe campo metadata, sino en notes)
    // Por ahora, solo actualizamos status y fecha

    return await updatePlan(id, updateData);
  } catch (error) {
    console.error('Error al desactivar plan:', error);
    throw new Error(`Error al desactivar plan: ${error.message}`);
  }
};

/**
 * Duplicar un plan existente
 * @param {string} id - UUID del plan a duplicar
 * @returns {Promise<Object>} Nuevo plan creado
 */
export const duplicatePlan = async (id) => {
  try {
    const original = await getPlanById(id);
    if (!original) throw new Error('Plan no encontrado');

    // Generar código único
    let copyNum = 1;
    let newCode = `${original.code}_copy_${copyNum}`;
    while (await getPlanByCode(newCode)) {
      copyNum++;
      newCode = `${original.code}_copy_${copyNum}`;
    }

    // Crear copia
    const duplicateData = {
      ...original,
      name: `${original.name} (Copia)`,
      code: newCode,
      status: PLAN_STATUS.DRAFT,
      visible_for_new_accounts: false,
      deactivated_at: null,
      stripe_price_monthly_id: null,
      stripe_price_annual_id: null,
    };

    // Remover campos autogenerados
    delete duplicateData.id;
    delete duplicateData.created_at;
    delete duplicateData.updated_at;
    delete duplicateData.annual_price;

    return await createPlan(duplicateData);
  } catch (error) {
    console.error('Error al duplicar plan:', error);
    throw new Error(`Error al duplicar plan: ${error.message}`);
  }
};

/**
 * Verificar si un plan puede ser modificado
 * Retorna información sobre el uso del plan
 * @param {string} planId - UUID del plan
 * @returns {Promise<Object>} { canModify: boolean, accountsCount: number, accounts: Array }
 */
export const canModifyPlan = async (planId) => {
  try {
    const plan = await getPlanById(planId);
    if (!plan) throw new Error('Plan no encontrado');

    // Contar cuántas client_accounts usan este plan
    const { data: accounts, error } = await supabase
      .from('client_accounts')
      .select('id, name, status')
      .eq('plan_code', plan.code);

    if (error) throw error;

    return {
      canModify: accounts.length === 0,
      activeAccounts: accounts.length,
      accounts: accounts || [],
      plan,
    };
  } catch (error) {
    console.error('Error al verificar uso del plan:', error);
    throw new Error(`Error al verificar uso del plan: ${error.message}`);
  }
};

// =============================================================================
// UTILIDADES
// =============================================================================

/**
 * Calcular precio final con IVA
 * @param {number} basePrice - Precio base sin IVA
 * @param {number} taxPercent - Porcentaje de IVA (0-100)
 * @returns {number} Precio final con IVA (redondeado a 2 decimales)
 */
export const calculateFinalPrice = (basePrice, taxPercent) => {
  const finalPrice = basePrice * (1 + taxPercent / 100);
  return Math.round(finalPrice * 100) / 100;
};

/**
 * Calcular precio mensual final de un plan (con IVA)
 * @param {Object} plan - Plan con monthly_price y tax_percent
 * @returns {number} Precio mensual final con IVA
 */
export const calculateMonthlyFinalPrice = (plan) => {
  return calculateFinalPrice(plan.monthly_price, plan.tax_percent);
};

/**
 * Verificar si un plan está activo y vigente
 * @param {Object} plan - Plan a verificar
 * @returns {boolean} true si está activo y vigente
 */
export const isPlanActive = (plan) => {
  if (plan.status !== PLAN_STATUS.ACTIVE) return false;

  const today = new Date().toISOString().split('T')[0];
  const startOk = plan.start_date <= today;
  const endOk = !plan.end_date || plan.end_date >= today;

  return startOk && endOk;
};

/**
 * Obtener label de status
 * @param {string} status - Status del plan
 * @returns {string} Label traducido
 */
export const getPlanStatusLabel = (status) => {
  return PLAN_STATUS_LABELS[status] || status;
};

/**
 * Obtener color para status
 * @param {string} status - Status del plan
 * @returns {string} Color hex
 */
export const getPlanStatusColor = (status) => {
  const colors = {
    [PLAN_STATUS.DRAFT]: '#6B7280',
    [PLAN_STATUS.ACTIVE]: '#10B981',
    [PLAN_STATUS.DEPRECATED]: '#F59E0B',
    [PLAN_STATUS.EXPIRED]: '#EF4444',
    [PLAN_STATUS.DISABLED]: '#DC2626',
  };
  return colors[status] || '#6B7280';
};

/**
 * Formatear límite (-1 = ilimitado)
 * @param {number} limit - Límite a formatear
 * @returns {string} Límite formateado
 */
export const formatLimit = (limit) => {
  return limit === -1 ? '∞' : limit.toString();
};

/**
 * Validar formato del código
 * @param {string} code - Código a validar
 * @returns {Object} { valid: boolean, error: string }
 */
export const validateCodeFormat = (code) => {
  if (!code || !code.trim()) {
    return { valid: false, error: 'El código no puede estar vacío' };
  }
  
  if (code.length > FIELD_LIMITS.code) {
    return { valid: false, error: `El código no puede superar ${FIELD_LIMITS.code} caracteres` };
  }
  
  const regex = /^[A-Z0-9_]+$/;
  if (!regex.test(code)) {
    return { 
      valid: false, 
      error: 'El código solo puede contener letras mayúsculas, números y guión bajo' 
    };
  }
  
  return { valid: true };
};
