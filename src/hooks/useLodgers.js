// Custom hook para gestión de inquilinos con React Query
// Optimiza rendimiento con caché y reduce re-renders innecesarios

import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, queryKeys, invalidateQueries } from '../lib/queryClient';
import { 
  listLodgers, 
  getLodger, 
  createLodger, 
  updateLodger, 
  setLodgerStatus,
  scheduleCheckout,
  inviteLodger,
  assignRoomToLodger,
  reassignRoom
} from '../services/lodgers.service';

/**
 * Hook para obtener lista de inquilinos con caché
 * @param {Object} options - Opciones de filtrado
 * @param {string} options.clientAccountId - ID de la cuenta cliente
 * @param {string} options.status - Estado del inquilino (opcional)
 */
export function useLodgers({ clientAccountId, status } = {}) {
  return useQuery({
    queryKey: queryKeys.lodgers(clientAccountId),
    queryFn: () => listLodgers({ clientAccountId, status }),
    enabled: !!clientAccountId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener un inquilino específico
 * @param {string} id - ID del inquilino
 * @param {string} clientAccountId - ID de la cuenta cliente
 */
export function useLodger(id, clientAccountId) {
  return useQuery({
    queryKey: queryKeys.lodger(id),
    queryFn: () => getLodger(id, clientAccountId),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para crear un inquilino
 */
export function useCreateLodger() {
  return useMutation({
    mutationFn: createLodger,
    onSuccess: (data, _variables) => {
      // Invalidar lista de inquilinos
      if (data?.client_account_id) {
        invalidateQueries.lodgers(data.client_account_id);
        invalidateQueries.dashboardStats(data.client_account_id);
      }
    },
  });
}

/**
 * Hook para actualizar un inquilino
 */
export function useUpdateLodger() {
  return useMutation({
    mutationFn: ({ id, patch }) => updateLodger(id, patch),
    onSuccess: (data) => {
      // Invalidar inquilino específico y lista
      invalidateQueries.lodger(data.id);
      if (data?.client_account_id) {
        invalidateQueries.lodgers(data.client_account_id);
      }
    },
  });
}

/**
 * Hook para cambiar estado de inquilino
 */
export function useSetLodgerStatus() {
  return useMutation({
    mutationFn: ({ id, status }) => setLodgerStatus(id, status),
    onSuccess: (data) => {
      invalidateQueries.lodger(data.id);
      if (data?.client_account_id) {
        invalidateQueries.lodgers(data.client_account_id);
        invalidateQueries.dashboardStats(data.client_account_id);
      }
    },
  });
}

/**
 * Hook para programar checkout
 */
export function useScheduleCheckout() {
  return useMutation({
    mutationFn: ({ lodgerId, moveOutDate }) => scheduleCheckout(lodgerId, moveOutDate),
    onSuccess: (_, variables) => {
      invalidateQueries.lodger(variables.lodgerId);
      invalidateQueries.allAssignments();
    },
  });
}

/**
 * Hook para enviar invitación
 */
export function useInviteLodger() {
  return useMutation({
    mutationFn: inviteLodger,
    onSuccess: (data, lodgerId) => {
      invalidateQueries.lodger(lodgerId);
    },
  });
}

/**
 * Hook para asignar habitación a inquilino
 */
export function useAssignRoom() {
  return useMutation({
    mutationFn: ({ lodgerId, ...assignmentData }) => 
      assignRoomToLodger(lodgerId, assignmentData),
    onSuccess: (_, variables) => {
      invalidateQueries.lodger(variables.lodgerId);
      invalidateQueries.allAssignments();
      if (variables.accommodationId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.accommodationRooms(variables.accommodationId) 
        });
      }
    },
  });
}

/**
 * Hook para reasignar habitación
 */
export function useReassignRoom() {
  return useMutation({
    mutationFn: ({ lodgerId, ...reassignmentData }) => 
      reassignRoom(lodgerId, reassignmentData),
    onSuccess: (_, variables) => {
      invalidateQueries.lodger(variables.lodgerId);
      invalidateQueries.allAssignments();
      if (variables.newAccommodationId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.accommodationRooms(variables.newAccommodationId) 
        });
      }
    },
  });
}
