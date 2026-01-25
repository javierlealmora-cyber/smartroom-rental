// src/mocks/services.mock.js
// Catálogo de servicios dinámicos para SmartRent

// Datos iniciales del catálogo
let servicesCatalog = [
  {
    id: "srv-001",
    key: "lavanderia",
    label: "Lavandería",
    description: "Servicio de lavandería compartida en el alojamiento",
    status: "active",
    category: "operación",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "srv-002",
    key: "encuestas",
    label: "Encuestas",
    description: "Sistema de encuestas de satisfacción para inquilinos",
    status: "active",
    category: "comunicación",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "srv-003",
    key: "limpieza",
    label: "Limpieza",
    description: "Servicio de limpieza de zonas comunes",
    status: "active",
    category: "operación",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "srv-004",
    key: "tickets_incidencias",
    label: "Tickets de Incidencias",
    description: "Sistema de gestión de incidencias y soporte",
    status: "active",
    category: "comunicación",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "srv-005",
    key: "whatsapp_soporte",
    label: "WhatsApp Soporte",
    description: "Canal de soporte vía WhatsApp (futuro)",
    status: "archived",
    category: "comunicación",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "srv-006",
    key: "informes_avanzados",
    label: "Informes Avanzados",
    description: "Generación de informes analíticos avanzados (futuro)",
    status: "archived",
    category: "analítica",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  },
];

// Categorías disponibles
export const serviceCategories = [
  { key: "operación", label: "Operación" },
  { key: "comunicación", label: "Comunicación" },
  { key: "analítica", label: "Analítica" },
];

// Generar ID único
const generateId = () => `srv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// CRUD Helpers

// Obtener todos los servicios
export const getServices = (filters = {}) => {
  let result = [...servicesCatalog];

  // Filtrar por estado
  if (filters.status) {
    result = result.filter((s) => s.status === filters.status);
  }

  // Filtrar por categoría
  if (filters.category) {
    result = result.filter((s) => s.category === filters.category);
  }

  // Buscar por nombre/key
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter(
      (s) =>
        s.label.toLowerCase().includes(searchLower) ||
        s.key.toLowerCase().includes(searchLower)
    );
  }

  return result;
};

// Obtener solo servicios activos (para selección en planes)
export const getActiveServices = () => {
  return servicesCatalog.filter((s) => s.status === "active");
};

// Obtener un servicio por ID
export const getServiceById = (id) => {
  return servicesCatalog.find((s) => s.id === id) || null;
};

// Obtener un servicio por key
export const getServiceByKey = (key) => {
  return servicesCatalog.find((s) => s.key === key) || null;
};

// Obtener múltiples servicios por keys
export const getServicesByKeys = (keys) => {
  return keys.map((key) => getServiceByKey(key)).filter(Boolean);
};

// Crear un nuevo servicio
export const createService = (data) => {
  // Validar key único
  if (servicesCatalog.some((s) => s.key === data.key)) {
    throw new Error(`El key "${data.key}" ya existe`);
  }

  const now = new Date().toISOString();
  const newService = {
    id: generateId(),
    key: data.key,
    label: data.label,
    description: data.description || "",
    status: data.status || "active",
    category: data.category || "operación",
    created_at: now,
    updated_at: now,
  };

  servicesCatalog.push(newService);
  return newService;
};

// Actualizar un servicio
export const updateService = (id, data) => {
  const index = servicesCatalog.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error("Servicio no encontrado");
  }

  // Si se cambia el key, validar que no exista
  if (data.key && data.key !== servicesCatalog[index].key) {
    if (servicesCatalog.some((s) => s.key === data.key)) {
      throw new Error(`El key "${data.key}" ya existe`);
    }
  }

  servicesCatalog[index] = {
    ...servicesCatalog[index],
    ...data,
    updated_at: new Date().toISOString(),
  };

  return servicesCatalog[index];
};

// Archivar un servicio (borrado lógico)
export const archiveService = (id) => {
  const index = servicesCatalog.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error("Servicio no encontrado");
  }

  servicesCatalog[index] = {
    ...servicesCatalog[index],
    status: "archived",
    updated_at: new Date().toISOString(),
  };

  return servicesCatalog[index];
};

// Reactivar un servicio archivado
export const reactivateService = (id) => {
  const index = servicesCatalog.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error("Servicio no encontrado");
  }

  servicesCatalog[index] = {
    ...servicesCatalog[index],
    status: "active",
    updated_at: new Date().toISOString(),
  };

  return servicesCatalog[index];
};

// Exportar el catálogo (para uso en otros módulos)
export { servicesCatalog };
