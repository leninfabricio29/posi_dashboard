import { api } from "./client";
import type { SalesReport } from "./types";

export const reportsApi = {
  sales: (from: string, to: string) => api.get<SalesReport>("/reports/sales", { from, to }),
};
