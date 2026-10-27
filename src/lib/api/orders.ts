import { api } from "./client";
import type { CreateOrderInput, Order, OrderItemInput, OrdersQuery, PaymentInput, UpdateOrderInput } from "./types";

export const ordersApi = {
  list: (query?: OrdersQuery) => api.get<Order[]>("/orders", { ...query }),
  active: () => api.get<Order[]>("/orders/active"),
  get: (id: string) => api.get<Order>(`/orders/${id}`),
  create: (data: CreateOrderInput) => api.post<Order>("/orders", data),
  update: (id: string, data: UpdateOrderInput) => api.patch<Order>(`/orders/${id}`, data),
  addItems: (id: string, items: OrderItemInput[]) => api.post<Order>(`/orders/${id}/items`, { items }),
  removeItem: (id: string, itemId: string) => api.delete<Order>(`/orders/${id}/items/${itemId}`),
  updateItemQuantity: (id: string, itemId: string, quantity: number) =>
    api.patch<Order>(`/orders/${id}/items/${itemId}`, { quantity }),
  pay: (id: string, payments: PaymentInput[]) => api.post<Order>(`/orders/${id}/pay`, { payments }),
};
