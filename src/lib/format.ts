import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { OrderStatus, PrinterConnection, PrinterPurpose, Role, TableStatus } from "@/lib/api/types";

const currency = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" });
const number2 = new Intl.NumberFormat("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function money(value: number | null | undefined): string {
  return currency.format(Number(value ?? 0));
}

export function num2(value: number | null | undefined): string {
  return number2.format(Number(value ?? 0));
}

/** Redondeo a 2 decimales (half-up) para montos enviados al backend. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toCents(value: number): number {
  return Math.round(value * 100);
}

/** Parsea un input numérico aceptando coma o punto decimal. */
export function parseAmount(value: string): number {
  const n = Number(String(value).replace(",", ".").trim());
  return Number.isFinite(n) ? n : NaN;
}

export function toDate(value: string | Date): Date {
  return typeof value === "string" ? parseISO(value) : value;
}

export function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return format(toDate(value), "dd/MM/yyyy HH:mm", { locale: es });
}

export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return format(toDate(value), "dd/MM/yyyy", { locale: es });
}

export function fmtTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return format(toDate(value), "HH:mm", { locale: es });
}

export function fmtLongDate(value: string | Date): string {
  return format(toDate(value), "EEEE d 'de' MMMM yyyy", { locale: es });
}

/** Formato YYYY-MM-DD en hora local (para query from/to). */
export function ymd(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  CASHIER: "Cajero",
  WAITER: "Mesero",
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  OPEN: "Abierto",
  PAID: "Pagado",
  CANCELLED: "Anulado",
};

export const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  CANCELLED: "bg-zinc-200 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300",
};

export const TABLE_STATUS_LABEL: Record<TableStatus, string> = {
  AVAILABLE: "Libre",
  OCCUPIED: "Ocupada",
};

export const PRINTER_CONNECTION_LABEL: Record<PrinterConnection, string> = {
  BLUETOOTH: "Bluetooth",
  NETWORK: "Red (IP)",
  USB: "USB",
};

export const PRINTER_PURPOSE_LABEL: Record<PrinterPurpose, string> = {
  CASHIER: "Caja",
  KITCHEN: "Cocina",
  BAR: "Bar",
};
