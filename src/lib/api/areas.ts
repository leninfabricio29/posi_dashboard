import { api } from "./client";
import type { Area, SuccessResponse } from "./types";

export const areasApi = {
  list: () => api.get<Area[]>("/areas"),
  create: (name: string) => api.post<Area>("/areas", { name }),
  update: (id: string, name: string) => api.patch<Area>(`/areas/${id}`, { name }),
  remove: (id: string) => api.delete<SuccessResponse>(`/areas/${id}`),
};
