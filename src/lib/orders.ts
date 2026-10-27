import type { Order, Restaurant } from "@/lib/api/types";
import { round2 } from "@/lib/format";

export interface CartLine {
  productId: string;
  name: string;
  price: number;
  taxable: boolean;
  quantity: number;
  notes: string;
}

/**
 * Estimación local de totales (el backend es quien calcula el valor final).
 * Replica la regla del contrato: precios con o sin IVA incluido.
 */
export function estimateTotals(lines: CartLine[], restaurant?: Pick<Restaurant, "taxRate" | "pricesIncludeTax"> | null) {
  const rate = (restaurant?.taxRate ?? 0) / 100;
  const includes = restaurant?.pricesIncludeTax ?? true;
  let total = 0;
  let tax = 0;
  let subtotal = 0;
  for (const l of lines) {
    const lineTotal = round2(l.price * l.quantity);
    if (includes) {
      total += lineTotal;
      if (l.taxable && rate > 0) tax += lineTotal - lineTotal / (1 + rate);
    } else {
      subtotal += lineTotal;
      if (l.taxable) tax += lineTotal * rate;
    }
  }
  tax = round2(tax);
  if (includes) {
    total = round2(total);
    subtotal = round2(total - tax);
  } else {
    subtotal = round2(subtotal);
    total = round2(subtotal + tax);
  }
  return { subtotal, tax, total };
}

/** Un pedido está activo (abierto, sin cobrar) solo con status OPEN. */
export function isActiveOrder(o: Pick<Order, "status">) {
  return o.status === "OPEN";
}

/** Solo los pedidos abiertos se pueden modificar (agregar, cambiar cantidad, quitar). */
export function isEditableOrder(o: Pick<Order, "status">) {
  return o.status === "OPEN";
}

/** Lugar del pedido: "Área · Mesa" o "Para llevar" (el cliente se muestra aparte). */
export function orderPlace(o: Pick<Order, "tableName" | "areaName">) {
  if (o.tableName) return o.areaName ? `${o.areaName} · ${o.tableName}` : o.tableName;
  return "Para llevar";
}

export const CUSTOMER_NAME_MAX = 80;

/** Nombre del cliente como texto (búsquedas, PDF): "Sin nombre" si es un pedido antiguo. */
export function customerLabel(o: Pick<Order, "customerName">) {
  return o.customerName?.trim() || "Sin nombre";
}

/** Inserta/actualiza un pedido en la lista de activos (lo quita si ya no está activo). */
export function upsertActiveOrder(list: Order[], order: Order): Order[] {
  const rest = list.filter((o) => o.id !== order.id);
  if (!isActiveOrder(order)) return rest;
  return [order, ...rest].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
