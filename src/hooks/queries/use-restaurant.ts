import { useQuery } from "@tanstack/react-query";
import { restaurantApi } from "@/lib/api/restaurant";

// Query Keys
export const restaurantKeys = {
  all: ["restaurant"] as const,
  config: () => [...restaurantKeys.all, "config"] as const,
};

/**
 * Hook para obtener configuración del restaurante
 */
export function useRestaurant() {
  return useQuery({
    queryKey: restaurantKeys.config(),
    queryFn: restaurantApi.get,
    staleTime: 5 * 60 * 1000, // 5 minutos (rara vez cambia)
  });
}
