import { useQuery } from "@tanstack/react-query";
import { productsApi } from "@/lib/api/products";

// Query Keys
export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...productKeys.lists(), filters] as const,
};

/**
 * Hook para obtener lista de productos
 */
export function useProducts(filters?: { search?: string; available?: boolean }) {
  return useQuery({
    queryKey: productKeys.list(filters || {}),
    queryFn: () => productsApi.list(filters),
    staleTime: 60000, // 1 minuto
  });
}

/**
 * Hook para obtener solo productos disponibles (para pedidos)
 */
export function useAvailableProducts() {
  return useProducts({ available: true });
}
