import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/lib/api/reports";

// Query Keys
export const reportKeys = {
  all: ["reports"] as const,
  sales: (from: string, to: string) => [...reportKeys.all, "sales", from, to] as const,
};

/**
 * Hook para obtener reporte de ventas
 */
export function useSalesReport(from: string, to: string) {
  return useQuery({
    queryKey: reportKeys.sales(from, to),
    queryFn: () => reportsApi.sales(from, to),
    staleTime: 30000, // 30 segundos
  });
}
