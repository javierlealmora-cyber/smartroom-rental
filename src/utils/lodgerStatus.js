// Utilidades para cálculo y formateo de estados de inquilinos
// Centraliza lógica duplicada en múltiples componentes

import dayjs from 'dayjs';

/**
 * Calcula el estado de un inquilino basado en su historial de asignaciones
 * @param {Object} lodger - Objeto inquilino con sus asignaciones
 * @returns {string} Estado del inquilino: 'active' | 'pending_checkout' | 'inactive' | 'invited'
 */
export function getLodgerStatus(lodger) {
  // Aceptar tanto 'assignments' (de getLodger) como 'active_assignment' (de listLodgers)
  const assignments = lodger?.assignments || lodger?.active_assignment || [];
  
  if (!assignments || assignments.length === 0) {
    return 'invited';
  }
  
  // Ordenar asignaciones por fecha de entrada (más reciente primero)
  const sortedAssignments = [...assignments].sort((a, b) => {
    const dateA = a.move_in_date ? new Date(a.move_in_date) : new Date(0);
    const dateB = b.move_in_date ? new Date(b.move_in_date) : new Date(0);
    return dateB - dateA;
  });
  
  const latestAssignment = sortedAssignments[0];
  
  // Si no tiene fecha de entrada, está invitado
  if (!latestAssignment.move_in_date) {
    return 'invited';
  }
  
  // Si no tiene fecha de salida, está activo
  if (!latestAssignment.move_out_date) {
    return 'active';
  }
  
  // Si tiene fecha de salida, verificar si es futura o pasada
  const checkOutDate = dayjs(latestAssignment.move_out_date);
  const today = dayjs().startOf('day');
  
  return checkOutDate.isAfter(today) ? 'pending_checkout' : 'inactive';
}

/**
 * Obtiene el color asociado a un estado de inquilino (para Ant Design Tag)
 * @param {string} status - Estado del inquilino
 * @returns {string} Color del tag
 */
export function getLodgerStatusColor(status) {
  const colors = {
    active: 'success',
    pending_checkout: 'warning',
    inactive: 'default',
    invited: 'processing',
  };
  return colors[status] || 'default';
}

/**
 * Obtiene la etiqueta legible de un estado de inquilino
 * @param {string} status - Estado del inquilino
 * @returns {string} Etiqueta en español
 */
export function getLodgerStatusLabel(status) {
  const labels = {
    active: 'Activo',
    pending_checkout: 'Pendiente baja',
    inactive: 'Inactivo',
    invited: 'Invitado',
  };
  return labels[status] || status;
}

/**
 * Obtiene el color hexadecimal asociado a un estado de inquilino
 * @param {string} status - Estado del inquilino
 * @returns {string} Color en formato hexadecimal
 */
export function getLodgerStatusHexColor(status) {
  const colors = {
    active: '#059669',
    pending_checkout: '#F59E0B',
    inactive: '#6B7280',
    invited: '#3B82F6',
  };
  return colors[status] || '#6B7280';
}

/**
 * Verifica si un inquilino está activo (tiene asignación sin fecha de salida)
 * @param {Object} lodger - Objeto inquilino con sus asignaciones
 * @returns {boolean} True si está activo
 */
export function isLodgerActive(lodger) {
  return getLodgerStatus(lodger) === 'active';
}

/**
 * Verifica si un inquilino tiene checkout pendiente
 * @param {Object} lodger - Objeto inquilino con sus asignaciones
 * @returns {boolean} True si tiene checkout pendiente
 */
export function hasLodgerPendingCheckout(lodger) {
  return getLodgerStatus(lodger) === 'pending_checkout';
}

/**
 * Obtiene la asignación activa de un inquilino
 * @param {Object} lodger - Objeto inquilino con sus asignaciones
 * @returns {Object|null} Asignación activa o null
 */
export function getActiveAssignment(lodger) {
  const assignments = lodger?.assignments || lodger?.active_assignment || [];
  if (assignments.length === 0) return null;
  
  const today = new Date().toISOString().split('T')[0];
  
  return assignments.find(a => {
    if (!a.move_in_date) return false;
    if (!a.move_out_date) return true;
    return a.move_out_date > today;
  }) || null;
}
