import { api } from "./client";
import type { CreateTableInput, SuccessResponse, Table, TableMapArea, UpdateTableInput } from "./types";

export const tablesApi = {
  list: (areaId?: string) => api.get<Table[]>("/tables", { areaId }),
  map: () => api.get<TableMapArea[]>("/tables/map"),
  create: (data: CreateTableInput) => api.post<Table>("/tables", data),
  update: (id: string, data: UpdateTableInput) => api.patch<Table>(`/tables/${id}`, data),
  remove: (id: string) => api.delete<SuccessResponse>(`/tables/${id}`),
};
