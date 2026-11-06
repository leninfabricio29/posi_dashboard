import { useQuery, useMutation, useQueryClient, type UseQueryOptions, type UseMutationOptions } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { errorMessage } from "@/lib/api/client";

/**
 * Hook mejorado para queries con manejo de errores automático
 */
export function useQueryWithToast<TData = unknown, TError = Error>(
  options: UseQueryOptions<TData, TError>
) {
  const result = useQuery(options);

  // Mostrar toast solo si hay error y la query ya intentó cargar
  if (result.isError && result.failureCount > 0 && result.error) {
    const message = errorMessage(result.error);
    if (message && !result.isFetching) {
      toast.error(message);
    }
  }

  return result;
}

/**
 * Hook mejorado para mutations con optimistic updates y manejo de errores
 */
export function useMutationWithToast<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    successMessage?: string | ((data: TData) => string);
    errorMessage?: string | ((error: TError) => string);
  }
) {
  const { successMessage, errorMessage: errorMsg, ...mutationOptions } = options;

  return useMutation({
    ...mutationOptions,
    onSuccess: (data, variables, context) => {
      if (successMessage) {
        const message = typeof successMessage === "function" ? successMessage(data) : successMessage;
        toast.success(message);
      }
      if (mutationOptions.onSuccess) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mutationOptions.onSuccess as any)(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      const message = errorMsg
        ? typeof errorMsg === "function"
          ? errorMsg(error)
          : errorMsg
        : errorMessage(error);
      toast.error(message);
      if (mutationOptions.onError) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mutationOptions.onError as any)(error, variables, context);
      }
    },
  });
}

/**
 * Hook para invalidar queries específicas después de una mutación
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return (queryKeys: string[][]) => {
    queryKeys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  };
}
