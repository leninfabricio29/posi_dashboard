import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cashApi } from "@/lib/api/cash-register";
import type { CashRegisterSummary, MovementType } from "@/lib/api/types";
import { useMutationWithToast } from "../use-query-helpers";

// Query Keys
export const cashRegisterKeys = {
  all: ["cash-register"] as const,
  current: () => [...cashRegisterKeys.all, "current"] as const,
  history: (filters: Record<string, unknown>) => [...cashRegisterKeys.all, "history", filters] as const,
  summary: (id: string) => [...cashRegisterKeys.all, "summary", id] as const,
};

/**
 * Hook para obtener el estado actual de la caja
 */
export function useCurrentCashRegister() {
  return useQuery({
    queryKey: cashRegisterKeys.current(),
    queryFn: cashApi.current,
    staleTime: 10000, // 10 segundos
    refetchInterval: 30000, // Refetch cada 30s
  });
}

/**
 * Hook para obtener historial de cajas
 */
export function useCashRegisterHistory(filters?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: cashRegisterKeys.history(filters || {}),
    queryFn: () => cashApi.history(filters),
    staleTime: 60000, // 1 minuto
  });
}

/**
 * Hook para obtener resumen de una caja específica
 */
export function useCashRegisterSummary(id: string | null) {
  return useQuery({
    queryKey: cashRegisterKeys.summary(id!),
    queryFn: () => cashApi.summary(id!),
    enabled: !!id,
  });
}

/**
 * Hook para abrir caja
 */
export function useOpenCashRegister() {
  const queryClient = useQueryClient();

  return useMutationWithToast({
    mutationFn: ({ initialAmount, notes }: { initialAmount: number; notes?: string }) =>
      cashApi.open(initialAmount, notes),
    successMessage: "Caja abierta",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.current() });
    },
  });
}

/**
 * Hook para cerrar caja
 */
export function useCloseCashRegister() {
  const queryClient = useQueryClient();

  return useMutationWithToast({
    mutationFn: ({ countedCash, notes }: { countedCash: number; notes?: string }) =>
      cashApi.close(countedCash, notes),
    successMessage: "Caja cerrada",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.current() });
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.history({}) });
    },
  });
}

/**
 * Hook para registrar movimiento de efectivo con optimistic update
 */
export function useCashMovement() {
  const queryClient = useQueryClient();

  return useMutationWithToast<
    CashRegisterSummary,
    Error,
    { type: MovementType; amount: number; reason: string },
    { previousCash?: CashRegisterSummary }
  >({
    mutationFn: ({ type, amount, reason }) => cashApi.movement(type, amount, reason),
    successMessage: () => "Movimiento registrado",
    onMutate: async ({ type, amount }) => {
      await queryClient.cancelQueries({ queryKey: cashRegisterKeys.current() });
      const previousCash = queryClient.getQueryData<CashRegisterSummary>(cashRegisterKeys.current());

      if (previousCash) {
        const updated: CashRegisterSummary = {
          ...previousCash,
          expectedCash:
            type === "INCOME"
              ? previousCash.expectedCash + amount
              : previousCash.expectedCash - amount,
        };
        queryClient.setQueryData(cashRegisterKeys.current(), updated);
      }

      return { previousCash };
    },
    onError: (_error, _variables, onMutateResult) => {
      if (onMutateResult?.previousCash) {
        queryClient.setQueryData(cashRegisterKeys.current(), onMutateResult.previousCash);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.current() });
    },
  });
}
