// Constantes centralizadas para estados de inquilinos
// Evita duplicación y asegura consistencia en toda la aplicación

/**
 * Estados posibles de un inquilino
 */
export const LODGER_STATUS = {
  ACTIVE: 'active',
  INVITED: 'invited',
  PENDING_CHECKOUT: 'pending_checkout',
  INACTIVE: 'inactive',
};

/**
 * Etiquetas legibles para estados de inquilino
 */
export const LODGER_STATUS_LABEL = {
  [LODGER_STATUS.ACTIVE]: 'Activo',
  [LODGER_STATUS.INVITED]: 'Invitado',
  [LODGER_STATUS.PENDING_CHECKOUT]: 'Pendiente de baja',
  [LODGER_STATUS.INACTIVE]: 'Inactivo',
};

/**
 * Colores hexadecimales para estados de inquilino
 */
export const LODGER_STATUS_COLOR = {
  [LODGER_STATUS.ACTIVE]: '#059669',
  [LODGER_STATUS.INVITED]: '#3B82F6',
  [LODGER_STATUS.PENDING_CHECKOUT]: '#F59E0B',
  [LODGER_STATUS.INACTIVE]: '#6B7280',
};

/**
 * Colores Ant Design para Tags de estado
 */
export const LODGER_STATUS_TAG_COLOR = {
  [LODGER_STATUS.ACTIVE]: 'success',
  [LODGER_STATUS.INVITED]: 'processing',
  [LODGER_STATUS.PENDING_CHECKOUT]: 'warning',
  [LODGER_STATUS.INACTIVE]: 'default',
};

/**
 * Colores de fondo y texto para badges personalizados
 */
export const LODGER_STATUS_BADGE = {
  [LODGER_STATUS.ACTIVE]: { bg: '#DCFCE7', color: '#15803D' },
  [LODGER_STATUS.INVITED]: { bg: '#DBEAFE', color: '#1D4ED8' },
  [LODGER_STATUS.PENDING_CHECKOUT]: { bg: '#FEF3C7', color: '#B45309' },
  [LODGER_STATUS.INACTIVE]: { bg: '#F3F4F6', color: '#4B5563' },
};
