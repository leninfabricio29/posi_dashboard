import { api } from "./client";
import type { Printer, PrinterInput, SuccessResponse } from "./types";

export const printersApi = {
  list: () => api.get<Printer[]>("/printers"),
  create: (data: PrinterInput) => api.post<Printer>("/printers", data),
  update: (id: string, data: Partial<PrinterInput>) => api.patch<Printer>(`/printers/${id}`, data),
  remove: (id: string) => api.delete<SuccessResponse>(`/printers/${id}`),
};
