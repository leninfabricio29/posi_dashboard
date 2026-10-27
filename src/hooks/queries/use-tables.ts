import { useQuery } from "@tanstack/react-query";
import { tablesApi } from "@/lib/api/tables";

// Query Keys
export const tableKeys = {
  all: ["tables"] as const,
  lists: () => [...tableKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...tableKeys.lists(), filters] as const,
  map: () => [...tableKeys.all, "map"] as const,
};

/**
 * Hook para obtener el mapa de mesas con estado
 */
export function useTableMap() {
  return useQuery({
    queryKey: tableKeys.map(),
    queryFn: tablesApi.map,
    staleTime: 15000, // 15 segundos
    refetchInterval: 30000, // Refetch cada 30s
  });
}

/**
 * Hook para obtener lista de mesas con filtros
 */
export function useTables(filters?: { areaId?: string }) {
  return useQuery({
    queryKey: tableKeys.list(filters || {}),
    queryFn: () => tablesApi.list(filters?.areaId),
    staleTime: 60000, // 1 minuto
  });
}
