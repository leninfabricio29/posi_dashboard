import { api } from "./client";
import type { Product, ProductInput, SuccessResponse } from "./types";

export const productsApi = {
  list: (query?: { search?: string; available?: boolean }) => api.get<Product[]>("/products", query),
  create: (data: ProductInput) => api.post<Product>("/products", data),
  update: (id: string, data: Partial<ProductInput>) => api.patch<Product>(`/products/${id}`, data),
  remove: (id: string) => api.delete<SuccessResponse>(`/products/${id}`),
};
