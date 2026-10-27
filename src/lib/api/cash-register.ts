import { api } from "./client";
import type { CashRegisterListItem, CashRegisterSummary, MovementType } from "./types";

export const cashApi = {
  current: () => api.get<{ register: CashRegisterSummary | null }>("/cash-register/current"),
  open: (initialAmount: number, notes?: string) =>
    api.post<CashRegisterSummary>("/cash-register/open", { initialAmount, notes }),
  movement: (type: MovementType, amount: number, reason: string) =>
    api.post<CashRegisterSummary>("/cash-register/movements", { type, amount, reason }),
  close: (countedCash: number, notes?: string) =>
    api.post<CashRegisterSummary>("/cash-register/close", { countedCash, notes }),
  history: (query?: { from?: string; to?: string }) =>
    api.get<CashRegisterListItem[]>("/cash-register/history", query),
  summary: (id: string) => api.get<CashRegisterSummary>(`/cash-register/${id}/summary`),
};
