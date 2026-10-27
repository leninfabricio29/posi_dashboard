import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api/orders";
import type { Order, OrderStatus, PaymentInput, UpdateOrderInput } from "@/lib/api/types";
import { useMutationWithToast } from "../use-query-helpers";

// Query Keys
export const orderKeys = {
  all: ["orders"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...orderKeys.lists(), filters] as const,
  active: () => [...orderKeys.all, "active"] as const,
  details: () => [...orderKeys.all, "detail"] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

/**
 * Hook para obtener pedidos activos
 */
export function useActiveOrders() {
  return useQuery({
    queryKey: orderKeys.active(),
    queryFn: ordersApi.active,
    staleTime: 15000, // 15 segundos
    refetchInterval: 30000, // Refetch cada 30s
  });
}

/**
 * Hook para obtener lista de pedidos con filtros
 */
export function useOrders(filters?: {
  status?: OrderStatus;
  from?: string;
  to?: string;
  tableId?: string;
}) {
  return useQuery({
    queryKey: orderKeys.list(filters || {}),
    queryFn: () => ordersApi.list(filters),
    staleTime: 60000, // 1 minuto
  });
}

/**
 * Hook para obtener detalle de un pedido
 */
export function useOrder(id: string | null) {
  return useQuery({
    queryKey: orderKeys.detail(id!),
    queryFn: () => ordersApi.get(id!),
    enabled: !!id,
  });
}

/**
 * Hook para crear un pedido
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutationWithToast({
    mutationFn: ordersApi.create,
    successMessage: (order: Order) => `Pedido #${order.number} guardado`,
    onSuccess: () => {
      // Invalidar pedidos activos y mapa de mesas
      queryClient.invalidateQueries({ queryKey: orderKeys.active() });
      queryClient.invalidateQueries({ queryKey: ["tables", "map"] });
    },
  });
}

/**
 * Hook para corregir nombre del cliente / notas de un pedido abierto
 */
export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutationWithToast({
    mutationFn: ({ orderId, data }: { orderId: string; data: UpdateOrderInput }) => ordersApi.update(orderId, data),
    successMessage: "Pedido actualizado",
    onSuccess: (order: Order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      queryClient.invalidateQueries({ queryKey: orderKeys.active() });
      queryClient.invalidateQueries({ queryKey: ["tables", "map"] });
    },
  });
}

/**
 * Hook para agregar items a un pedido
 */
export function useAddOrderItems() {
  const queryClient = useQueryClient();

  return useMutationWithToast({
    mutationFn: ({ orderId, items }: { orderId: string; items: Parameters<typeof ordersApi.addItems>[1] }) =>
      ordersApi.addItems(orderId, items),
    successMessage: (order: Order) => `Productos agregados al pedido #${order.number}`,
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      queryClient.invalidateQueries({ queryKey: orderKeys.active() });
    },
  });
}

/**
 * Hook para remover un item de un pedido
 */
export function useRemoveOrderItem() {
  const queryClient = useQueryClient();

  return useMutationWithToast({
    mutationFn: ({ orderId, itemId }: { orderId: string; itemId: string }) =>
      ordersApi.removeItem(orderId, itemId),
    successMessage: "Producto quitado",
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      queryClient.invalidateQueries({ queryKey: orderKeys.active() });
    },
  });
}

/**
 * Hook para cambiar la cantidad de un producto del pedido (p. ej. 2 → 1)
 */
export function useUpdateOrderItemQuantity() {
  const queryClient = useQueryClient();

  return useMutationWithToast({
    mutationFn: ({ orderId, itemId, quantity }: { orderId: string; itemId: string; quantity: number }) =>
      ordersApi.updateItemQuantity(orderId, itemId, quantity),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      queryClient.invalidateQueries({ queryKey: orderKeys.active() });
    },
  });
}

/**
 * Hook para cobrar un pedido
 */
export function usePayOrder() {
  const queryClient = useQueryClient();

  return useMutationWithToast<
    Order,
    Error,
    { orderId: string; payments: PaymentInput[] },
    { previousOrder?: Order; previousActiveOrders?: Order[] }
  >({
    mutationFn: ({ orderId, payments }: { orderId: string; payments: PaymentInput[] }) =>
      ordersApi.pay(orderId, payments),
    successMessage: (order: Order) => `Pedido #${order.number} cobrado`,
    onMutate: async ({ orderId }) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.detail(orderId) });
      const previousOrder = queryClient.getQueryData<Order>(orderKeys.detail(orderId));

      if (previousOrder) {
        queryClient.setQueryData<Order>(orderKeys.detail(orderId), {
          ...previousOrder,
          status: "PAID",
        });
      }

      const activeOrders = queryClient.getQueryData<Order[]>(orderKeys.active());
      if (activeOrders) {
        queryClient.setQueryData<Order[]>(
          orderKeys.active(),
          activeOrders.filter((o) => o.id !== orderId)
        );
      }

      return { previousOrder, previousActiveOrders: activeOrders };
    },
    onError: (_error, { orderId }, onMutateResult) => {
      if (onMutateResult?.previousOrder) {
        queryClient.setQueryData(orderKeys.detail(orderId), onMutateResult.previousOrder);
      }
      if (onMutateResult?.previousActiveOrders) {
        queryClient.setQueryData(orderKeys.active(), onMutateResult.previousActiveOrders);
      }
    },
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      queryClient.invalidateQueries({ queryKey: orderKeys.active() });
      queryClient.invalidateQueries({ queryKey: ["tables", "map"] });
      queryClient.invalidateQueries({ queryKey: ["cash-register", "current"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
