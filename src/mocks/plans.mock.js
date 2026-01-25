// src/mocks/plans.mock.js
// Planes de suscripción para SmartRent

import { getServiceByKey, getActiveServices } from "./services.mock";

// Datos iniciales de planes
let plansCatalog = [
  {
    id: "plan-001",
    name: "Básico",
    code: "basic",
    description: "Plan ideal para pequeños propietarios con hasta 3 residencias",
    status: "active",
    valid_from: "2024-01-01",
    valid_to: null,
    limits: {
      max_properties: 3,
      unlimited_properties: false,
      max_admin_users: 1,
      max_api_users: 0,
      custom_theme_allowed: false,
    },
    services_included: ["lavanderia", "tickets_incidencias"],
    pricing: {
      monthly_price: 29,
      annual_price: null, // Se calculará automáticamente
      vat_rate: 21,
      currency: "EUR",
    },
    created_at: "2024-01-01T10:00:00Z",
    updated_at: "2024-01-01T10:00:00Z",
  },
  {
    id: "plan-002",
    name: "Inversor",
    code: "investor",
    description: "Plan para inversores con múltiples propiedades y necesidades avanzadas",
    status: "active",
    valid_from: "2024-01-01",
    valid_to: null,
    limits: {
      max_properties: 10,
      unlimited_properties: false,
      max_admin_users: 3,
      max_api_users: 2,
      custom_theme_allowed: true,
    },
    services_included: ["lavanderia", "encuestas", "limpieza", "tickets_incidencias"],
    pricing: {
      monthly_price: 79,
      annual_price: null,
      vat_rate: 21,
      currency: "EUR",
    },
    created_at: "2024-01-01T10:00:00Z",
    updated_at: "2024-01-01T10:00:00Z",
  },
  {
    id: "plan-003",
    name: "Business",
    code: "business",
    description: "Plan empresarial sin límites, para grandes gestores de alojamientos",
    status: "active",
    valid_from: "2024-01-01",
    valid_to: null,
    limits: {
      max_properties: null,
      unlimited_properties: true,
      max_admin_users: 10,
      max_api_users: 10,
      custom_theme_allowed: true,
    },
    services_included: ["lavanderia", "encuestas", "limpieza", "tickets_incidencias"],
    pricing: {
      monthly_price: 199,
      annual_price: null,
      vat_rate: 21,
      currency: "EUR",
    },
    created_at: "2024-01-01T10:00:00Z",
    updated_at: "2024-01-01T10:00:00Z",
  },
  {
    id: "plan-004",
    name: "Demo",
    code: "demo",
    description: "Plan de demostración para pruebas (borrador)",
    status: "draft",
    valid_from: "2024-06-01",
    valid_to: "2024-12-31",
    limits: {
      max_properties: 1,
      unlimited_properties: false,
      max_admin_users: 1,
      max_api_users: 0,
      custom_theme_allowed: false,
    },
    services_included: ["tickets_incidencias"],
    pricing: {
      monthly_price: 0,
      annual_price: 0,
      vat_rate: 21,
      currency: "EUR",
    },
    created_at: "2024-03-01T10:00:00Z",
    updated_at: "2024-03-01T10:00:00Z",
  },
];

// Estados posibles de un plan
export const planStatuses = [
  { key: "draft", label: "Borrador", color: "#6B7280" },
  { key: "active", label: "Activo", color: "#10B981" },
  { key: "archived", label: "Archivado", color: "#EF4444" },
];

// Generar ID único
const generateId = () => `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Calcular precio anual (regla: 12 meses - 2 gratis = 10 meses)
export const calculateAnnualPrice = (monthlyPrice) => {
  return monthlyPrice * 10;
};

// Calcular precio con IVA
export const calculatePriceWithVAT = (basePrice, vatRate) => {
  return basePrice * (1 + vatRate / 100);
};

// CRUD Helpers

// Obtener todos los planes
export const getPlans = (filters = {}) => {
  let result = [...plansCatalog];

  // Filtrar por estado
  if (filters.status) {
    result = result.filter((p) => p.status === filters.status);
  }

  // Filtrar por vigente hoy
  if (filters.validToday) {
    const today = new Date().toISOString().split("T")[0];
    result = result.filter((p) => {
      const fromOk = !p.valid_from || p.valid_from <= today;
      const toOk = !p.valid_to || p.valid_to >= today;
      return fromOk && toOk;
    });
  }

  // Buscar por nombre/código
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.code.toLowerCase().includes(searchLower)
    );
  }

  return result;
};

// Obtener un plan por ID
export const getPlanById = (id) => {
  return plansCatalog.find((p) => p.id === id) || null;
};

// Obtener un plan por código
export const getPlanByCode = (code) => {
  return plansCatalog.find((p) => p.code === code) || null;
};

// Crear un nuevo plan
export const createPlan = (data) => {
  // Validar code único
  if (plansCatalog.some((p) => p.code === data.code)) {
    throw new Error(`El código "${data.code}" ya existe`);
  }

  const now = new Date().toISOString();
  const newPlan = {
    id: generateId(),
    name: data.name,
    code: data.code,
    description: data.description || "",
    status: data.status || "draft",
    valid_from: data.valid_from || null,
    valid_to: data.valid_to || null,
    limits: {
      max_properties: data.limits?.max_properties || 1,
      unlimited_properties: data.limits?.unlimited_properties || false,
      max_admin_users: data.limits?.max_admin_users || 1,
      max_api_users: data.limits?.max_api_users || 0,
      custom_theme_allowed: data.limits?.custom_theme_allowed || false,
    },
    services_included: data.services_included || [],
    pricing: {
      monthly_price: data.pricing?.monthly_price || 0,
      annual_price: data.pricing?.annual_price || null,
      vat_rate: data.pricing?.vat_rate ?? 21,
      currency: data.pricing?.currency || "EUR",
    },
    created_at: now,
    updated_at: now,
  };

  plansCatalog.push(newPlan);
  return newPlan;
};

// Actualizar un plan
export const updatePlan = (id, data) => {
  const index = plansCatalog.findIndex((p) => p.id === id);
  if (index === -1) {
    throw new Error("Plan no encontrado");
  }

  // Si se cambia el code, validar que no exista
  if (data.code && data.code !== plansCatalog[index].code) {
    if (plansCatalog.some((p) => p.code === data.code)) {
      throw new Error(`El código "${data.code}" ya existe`);
    }
  }

  const existingPlan = plansCatalog[index];

  plansCatalog[index] = {
    ...existingPlan,
    ...data,
    limits: {
      ...existingPlan.limits,
      ...(data.limits || {}),
    },
    pricing: {
      ...existingPlan.pricing,
      ...(data.pricing || {}),
    },
    updated_at: new Date().toISOString(),
  };

  return plansCatalog[index];
};

// Archivar un plan (borrado lógico)
export const archivePlan = (id) => {
  const index = plansCatalog.findIndex((p) => p.id === id);
  if (index === -1) {
    throw new Error("Plan no encontrado");
  }

  plansCatalog[index] = {
    ...plansCatalog[index],
    status: "archived",
    updated_at: new Date().toISOString(),
  };

  return plansCatalog[index];
};

// Duplicar un plan
export const duplicatePlan = (id) => {
  const original = getPlanById(id);
  if (!original) {
    throw new Error("Plan no encontrado");
  }

  // Generar code temporal único
  let copyNum = 1;
  let newCode = `${original.code}_copy_${copyNum}`;
  while (plansCatalog.some((p) => p.code === newCode)) {
    copyNum++;
    newCode = `${original.code}_copy_${copyNum}`;
  }

  const now = new Date().toISOString();
  const duplicated = {
    ...original,
    id: generateId(),
    name: `${original.name} (Copia)`,
    code: newCode,
    status: "draft",
    created_at: now,
    updated_at: now,
  };

  plansCatalog.push(duplicated);
  return duplicated;
};

// Obtener servicios incluidos en un plan (con info completa)
export const getPlanServices = (plan) => {
  return plan.services_included.map((key) => {
    const service = getServiceByKey(key);
    if (service) {
      return service;
    }
    // Si el servicio no existe o está archivado, devolver info básica
    return {
      key,
      label: key,
      status: "archived",
      description: "Servicio no disponible",
    };
  });
};

// Exportar el catálogo
export { plansCatalog };
