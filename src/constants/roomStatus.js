// Constantes centralizadas para estados de habitaciones
// Evita duplicación y asegura consistencia en toda la aplicación

/**
 * Estados posibles de una habitación
 */
export const ROOM_STATUS = {
  FREE: 'free',
  OCCUPIED: 'occupied',
  PENDING_CHECKOUT: 'pending_checkout',
  MAINTENANCE: 'maintenance',
};

/**
 * Etiquetas legibles para estados de habitación
 */
export const ROOM_STATUS_LABEL = {
  [ROOM_STATUS.FREE]: 'Libre',
  [ROOM_STATUS.OCCUPIED]: 'Ocupada',
  [ROOM_STATUS.PENDING_CHECKOUT]: 'Pendiente de baja',
  [ROOM_STATUS.MAINTENANCE]: 'Mantenimiento',
};

/**
 * Colores Ant Design para Tags de estado
 */
export const ROOM_STATUS_TAG = {
  [ROOM_STATUS.FREE]: 'success',
  [ROOM_STATUS.OCCUPIED]: 'error',
  [ROOM_STATUS.PENDING_CHECKOUT]: 'warning',
  [ROOM_STATUS.MAINTENANCE]: 'default',
};

/**
 * Colores de fondo para cards de habitación
 */
export const ROOM_STATUS_BG = {
  [ROOM_STATUS.FREE]: { 
    card: '#F0FDF4', 
    border: '#D1FAE5', 
    icon: '#DCFCE7', 
    text: '#16A34A' 
  },
  [ROOM_STATUS.OCCUPIED]: { 
    card: '#FFF5F5', 
    border: '#FEE2E2', 
    icon: '#FEE2E2', 
    text: '#DC2626' 
  },
  [ROOM_STATUS.PENDING_CHECKOUT]: { 
    card: '#FFFBEB', 
    border: '#FEF3C7', 
    icon: '#FEF3C7', 
    text: '#D97706' 
  },
  [ROOM_STATUS.MAINTENANCE]: { 
    card: '#F9FAFB', 
    border: '#E5E7EB', 
    icon: '#E5E7EB', 
    text: '#6B7280' 
  },
};

/**
 * Colores de fondo y texto para badges personalizados
 */
export const ROOM_STATUS_BADGE_BG = {
  [ROOM_STATUS.FREE]: { bg: '#DCFCE7', color: '#15803D' },
  [ROOM_STATUS.OCCUPIED]: { bg: '#FFE4E6', color: '#BE123C' },
  [ROOM_STATUS.PENDING_CHECKOUT]: { bg: '#FEF3C7', color: '#B45309' },
  [ROOM_STATUS.MAINTENANCE]: { bg: '#F3F4F6', color: '#4B5563' },
};

/**
 * Tipos de cocina
 */
export const KITCHEN_TYPE = {
  SHARED: 'shared',
  PRIVATE: 'private',
  NONE: 'none',
};

/**
 * Etiquetas para tipos de cocina
 */
export const KITCHEN_LABEL = {
  [KITCHEN_TYPE.SHARED]: 'Compartida',
  [KITCHEN_TYPE.PRIVATE]: 'Privada',
  [KITCHEN_TYPE.NONE]: 'Sin cocina',
};

/**
 * Tipos de baño
 */
export const BATHROOM_TYPE = {
  SHARED: 'shared',
  PRIVATE: 'private',
  ENSUITE: 'ensuite',
};

/**
 * Etiquetas para tipos de baño
 */
export const BATHROOM_LABEL = {
  [BATHROOM_TYPE.SHARED]: 'Baño compartido',
  [BATHROOM_TYPE.PRIVATE]: 'Baño privado',
  [BATHROOM_TYPE.ENSUITE]: 'Baño en suite',
};
