// Configuración de React Query para caché y optimización de rendimiento
// Basado en hallazgos de auditoría técnica Parte 3 (Rendimiento)

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tiempo que los datos se consideran "frescos" (no se refetch automáticamente)
      staleTime: 5 * 60 * 1000, // 5 minutos
      
      // Tiempo que los datos permanecen en caché
      cacheTime: 10 * 60 * 1000, // 10 minutos
      
      // No refetch automático al cambiar de ventana
      refetchOnWindowFocus: false,
      
      // No refetch automático al reconectar
      refetchOnReconnect: false,
      
      // Reintentos en caso de error
      retry: 1,
      
      // Tiempo de espera para retry
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Mantener datos previos mientras se refetch
      keepPreviousData: true,
    },
    mutations: {
      // Reintentos para mutaciones
      retry: 0,
    },
  },
});

// Query keys centralizadas para consistencia
export const queryKeys = {
  // Lodgers
  lodgers: (clientAccountId) => ['lodgers', clientAccountId],
  lodger: (id) => ['lodger', id],
  lodgerAssignments: (lodgerId) => ['lodger-assignments', lodgerId],
  
  // Accommodations
  accommodations: (clientAccountId, filters) => ['accommodations', clientAccountId, filters],
  accommodation: (id) => ['accommodation', id],
  accommodationRooms: (accommodationId) => ['accommodation-rooms', accommodationId],
  
  // Rooms
  rooms: (accommodationId) => ['rooms', accommodationId],
  room: (id) => ['room', id],
  
  // Assignments
  assignments: (filters) => ['assignments', filters],
  activeAssignments: (clientAccountId) => ['active-assignments', clientAccountId],
  
  // Billing
  billingRecords: (clientAccountId, filters) => ['billing-records', clientAccountId, filters],
  
  // Energy
  energyBills: (accommodationId) => ['energy-bills', accommodationId],
  energySettlements: (billId) => ['energy-settlements', billId],
  bulletins: (filters) => ['bulletins', filters],
  
  // Dashboard
  dashboardStats: (clientAccountId) => ['dashboard-stats', clientAccountId],
  occupancyStats: (clientAccountId) => ['occupancy-stats', clientAccountId],
  
  // Entities
  entities: (type) => ['entities', type],
};

// Helpers para invalidación de caché
export const invalidateQueries = {
  // Invalidar todos los lodgers
  lodgers: (clientAccountId) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.lodgers(clientAccountId) }),
  
  // Invalidar un lodger específico
  lodger: (id) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.lodger(id) }),
  
  // Invalidar accommodations
  accommodations: (clientAccountId) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.accommodations(clientAccountId) }),
  
  // Invalidar dashboard stats
  dashboardStats: (clientAccountId) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats(clientAccountId) }),
  
  // Invalidar todo relacionado con asignaciones
  allAssignments: () => 
    queryClient.invalidateQueries({ queryKey: ['assignments'] }),
};

// Prefetch helpers para mejorar UX
export const prefetchQueries = {
  // Prefetch lodgers antes de navegar a la lista
  lodgers: async (clientAccountId) => {
    const { listLodgers } = await import('../services/lodgers.service');
    await queryClient.prefetchQuery({
      queryKey: queryKeys.lodgers(clientAccountId),
      queryFn: () => listLodgers({ clientAccountId }),
    });
  },
  
  // Prefetch accommodation antes de navegar al detalle
  accommodation: async (id) => {
    const { supabase } = await import('../services/supabaseClient');
    await queryClient.prefetchQuery({
      queryKey: queryKeys.accommodation(id),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('accommodations')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      },
    });
  },
};
