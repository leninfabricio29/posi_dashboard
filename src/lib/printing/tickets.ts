import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { CashRegisterSummary, Order, PaperWidth, Restaurant } from "@/lib/api/types";
import {
  type Align,
  type TextSize,
  EscPosBuilder,
  amount,
  center,
  columnsFor,
  padLeft,
  padRight,
  rule,
  toAscii,
  twoCols,
  wrap,
} from "./escpos";
import type { KitchenLine } from "./order-diff";

function dt(value: string | null | undefined) {
  if (!value) return "-";
  return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: es });
}

/** Ticket de prueba de impresión. */
export function buildTestTicket(restaurantName: string, width: PaperWidth): Uint8Array {
  const n = columnsFor(width);
  return new EscPosBuilder()
    .init()
    .align("center")
    .bold(true)
    .size(2)
    .line(restaurantName || "Restaurante")
    .size(1)
    .bold(false)
    .line("PRUEBA DE IMPRESION")
    .line(format(new Date(), "dd/MM/yyyy HH:mm:ss"))
    .align("left")
    .line(rule(n))
    .line(twoCols("Ancho de papel", `${width} mm`, n))
    .line(twoCols("Columnas", String(n), n))
    .line(rule(n))
    .line("0123456789".repeat(Math.ceil(n / 10)).slice(0, n))
    .line("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    .line("Acentos: a e i o u n (normalizados)")
    .align("center")
    .line(rule(n, "="))
    .line("Si lees esto, la impresora")
    .line("funciona correctamente.")
    .line("Sistema POS")
    .cut()
    .build();
}

/** Texto del cierre de caja formateado al ancho de la impresora. */
export function buildCashCloseLines(s: CashRegisterSummary, width: PaperWidth): string[] {
  const n = columnsFor(width);
  const L: string[] = [];
  L.push(rule(n, "="));
  L.push(twoCols("Apertura", dt(s.openedAt), n));
  L.push(twoCols("Abrio", s.openedBy.name, n));
  L.push(twoCols("Monto inicial", amount(s.initialAmount), n));
  L.push(twoCols("Cierre", dt(s.closedAt), n));
  L.push(twoCols("Cerro", s.closedBy?.name ?? "-", n));
  L.push(rule(n));
  L.push("VENTAS");
  L.push(twoCols("Cantidad de ventas", String(s.sales.count), n));
  L.push(twoCols("Subtotal", amount(s.sales.subtotal), n));
  L.push(twoCols("IVA", amount(s.sales.tax), n));
  L.push(twoCols("TOTAL VENTAS", amount(s.sales.total), n));
  L.push(twoCols("Efectivo", amount(s.sales.cash), n));
  L.push(twoCols("Transferencia", amount(s.sales.transfer), n));
  if (s.transfers.length) {
    L.push(rule(n));
    L.push("TRANSFERENCIAS");
    for (const t of s.transfers) {
      L.push(twoCols(`#${t.orderNumber} ${t.reference}`, amount(t.amount), n));
    }
  }
  L.push(rule(n));
  L.push("MOVIMIENTOS DE CAJA");
  const movs = s.movements;
  if (!movs.length) L.push("Sin ingresos ni egresos");
  for (const m of movs) {
    const sign = m.type === "INCOME" ? "+" : "-";
    const lines = wrap(`${m.type === "INCOME" ? "Ingreso" : "Egreso"}: ${m.reason}`, n - 12);
    L.push(twoCols(lines[0] ?? "", `${sign}${amount(m.amount)}`, n));
    lines.slice(1).forEach((l) => L.push("  " + l));
  }
  L.push(twoCols("Total ingresos", amount(s.incomes), n));
  L.push(twoCols("Total egresos", amount(s.expenses), n));
  L.push(rule(n));
  L.push(twoCols("Efectivo esperado", amount(s.expectedCash), n));
  L.push(twoCols("Efectivo contado", s.countedCash === null ? "-" : amount(s.countedCash), n));
  L.push(twoCols("Diferencia", s.difference === null ? "-" : amount(s.difference), n));
  if (s.closingNotes) {
    L.push(rule(n));
    wrap(`Notas: ${s.closingNotes}`, n).forEach((l) => L.push(l));
  }
  L.push(rule(n, "="));
  return L;
}

export function buildCashCloseTicket(s: CashRegisterSummary, width: PaperWidth): Uint8Array {
  const n = columnsFor(width);
  const b = new EscPosBuilder().init().align("center").bold(true).size(2).line(s.restaurant.name).size(1).bold(false);
  if (s.restaurant.ruc) b.line(`RUC: ${s.restaurant.ruc}`);
  if (s.restaurant.address) wrap(s.restaurant.address, n).forEach((l) => b.line(center(l, n).trim()));
  if (s.restaurant.phone) b.line(`Tel: ${s.restaurant.phone}`);
  b.bold(true).line(s.status === "CLOSED" ? "CIERRE DE CAJA" : "CORTE DE CAJA (ABIERTA)").bold(false);
  b.align("left").lines(buildCashCloseLines(s, width));
  b.line("").line("Firma: " + "_".repeat(Math.max(8, n - 7)));
  b.align("center").line(`Impreso ${format(new Date(), "dd/MM/yyyy HH:mm")}`);
  return b.cut().build();
}

// ---------------------------------------------------------------------------
// Tickets de pedidos: comanda / adicional (cocina) y recibo (venta).
// Se arman como filas de texto (fáciles de probar y previsualizar) y luego se pasan a ESC/POS.
// ---------------------------------------------------------------------------

/** Una fila del ticket: el texto ya viene ajustado al ancho que le corresponde según su tamaño. */
export interface TicketRow {
  text: string;
  align?: Align;
  bold?: boolean;
  size?: TextSize;
}

/** Columnas disponibles para una fila según el tamaño de letra (doble ancho = la mitad). */
function colsFor(n: number, size: TextSize = 1) {
  return size === 2 ? Math.floor(n / 2) : n;
}

/** Filas → bytes ESC/POS (con inicialización y corte). */
export function renderTicket(rows: TicketRow[]): Uint8Array {
  const b = new EscPosBuilder().init();
  for (const r of rows) {
    b.align(r.align ?? "left")
      .bold(!!r.bold)
      .size(r.size ?? 1)
      .line(r.text);
  }
  return b.size(1).bold(false).align("left").cut().build();
}

/** Varias copias en un solo trabajo (cada una con su corte). */
export function repeatTicket(bytes: Uint8Array, copies: number): Uint8Array {
  const n = Math.max(1, Math.min(3, Math.round(copies)));
  if (n === 1) return bytes;
  const out = new Uint8Array(bytes.length * n);
  for (let i = 0; i < n; i++) out.set(bytes, i * bytes.length);
  return out;
}

/** Vista previa en texto plano (para pruebas): marca las filas grandes. */
export function ticketToText(rows: TicketRow[], width: PaperWidth): string {
  const n = columnsFor(width);
  return rows
    .map((r) => {
      const cols = colsFor(n, r.size);
      const t = toAscii(r.text);
      const body = r.align === "center" ? center(t, cols) : r.align === "right" ? padLeft(t, cols) : t;
      return r.size === 2 ? `${body}   [x2]` : r.size === "tall" ? `${body}   [alto]` : body;
    })
    .join("\n");
}

/** "2 x Producto" con sangría colgante para nombres largos; notas debajo con sangría. */
function itemRows(prefix: string, l: KitchenLine, n: number, size: TextSize, bold: boolean): TicketRow[] {
  const head = toAscii(`${prefix}${l.quantity} x `);
  const indent = " ".repeat(Math.min(head.length, 8));
  const nameLines = wrap(l.productName, Math.max(8, n - head.length));
  const rows: TicketRow[] = [];
  nameLines.forEach((t, i) => rows.push({ text: i === 0 ? head + t : indent + t, size, bold }));
  if (!nameLines.length) rows.push({ text: head.trimEnd(), size, bold });
  if (l.notes) wrap(`> ${l.notes}`, n - 4).forEach((t) => rows.push({ text: "    " + t }));
  return rows;
}

function orderPlaceAscii(o: Pick<Order, "tableName" | "areaName">) {
  if (!o.tableName) return "PARA LLEVAR";
  const name = o.tableName.trim();
  const table = /^mesa\b/i.test(name) ? name : `Mesa ${name}`;
  return o.areaName ? `${table} (${o.areaName})` : table;
}

export type KitchenTicketKind = "COMANDA" | "ADICIONAL";

export interface KitchenTicketInput {
  kind: KitchenTicketKind;
  order: Pick<Order, "number" | "tableName" | "areaName" | "customerName" | "userName" | "notes" | "createdAt" | "updatedAt">;
  /** Productos a preparar (comanda: todos; adicional: solo lo agregado). */
  added: KitchenLine[];
  /** Solo adicional: productos quitados o disminuidos. */
  removed?: KitchenLine[];
  /** Marca "REIMPRESION" (botón manual). */
  reprint?: boolean;
  /** Fecha/hora a mostrar (por defecto: creación para la comanda, última modificación para el adicional). */
  at?: string;
}

/** Comanda / adicional de cocina SIN precios. */
export function buildKitchenRows(input: KitchenTicketInput, width: PaperWidth): TicketRow[] {
  const n = columnsFor(width);
  const { order } = input;
  const removed = input.removed ?? [];
  const title = input.kind === "COMANDA" ? "COMANDA" : input.added.length ? "ADICIONAL" : "ANULADO";
  const rows: TicketRow[] = [
    { text: title, align: "center", bold: true, size: 2 },
    { text: `#${order.number}`, align: "center", bold: true, size: 2 },
  ];
  if (input.reprint) rows.push({ text: "** REIMPRESION **", align: "center", bold: true });
  rows.push({ text: dt(input.at ?? (input.kind === "COMANDA" ? order.createdAt : order.updatedAt)), align: "center" });
  rows.push({ text: rule(n) });
  wrap(orderPlaceAscii(order), n).forEach((t) => rows.push({ text: t, bold: true, size: "tall" }));
  wrap(`Cliente: ${order.customerName?.trim() || "-"}`, n).forEach((t) => rows.push({ text: t }));
  wrap(`Mesero: ${order.userName || "-"}`, n).forEach((t) => rows.push({ text: t }));
  rows.push({ text: rule(n, "=") });
  for (const l of input.added) rows.push(...itemRows("", l, n, "tall", true));
  if (removed.length) {
    if (input.added.length) rows.push({ text: rule(n) });
    for (const l of removed) rows.push(...itemRows("ANULADO: ", l, n, "tall", true));
  }
  if (input.kind === "COMANDA" && order.notes?.trim()) {
    rows.push({ text: rule(n) });
    wrap(`NOTAS: ${order.notes.trim()}`, n).forEach((t) => rows.push({ text: t, bold: true }));
  }
  rows.push({ text: rule(n, "=") });
  return rows;
}

export function buildKitchenTicket(input: KitchenTicketInput, width: PaperWidth, copies = 1): Uint8Array {
  return repeatTicket(renderTicket(buildKitchenRows(input, width)), copies);
}

export interface ReceiptInput {
  order: Order;
  restaurant: Pick<Restaurant, "name" | "ruc" | "address" | "phone" | "taxRate"> | null;
  /** Nombre a usar si no se pudo leer el restaurante. */
  fallbackName?: string;
  /** Efectivo recibido y vuelto (calculados en el diálogo de cobro). */
  cash?: { received: number; change: number };
  reprint?: boolean;
}

/** "Etiqueta ...... $0.00" con etiqueta larga partida en varias filas (sangría en las siguientes). */
function amountRows(label: string, value: string, n: number, indent = "  "): string[] {
  const v = toAscii(value);
  const labelCols = Math.max(8, n - v.length - 1);
  const first = wrap(label, labelCols);
  if (!first.length) return [padLeft(v, n)];
  const restText = first.slice(1).join(" ");
  const rest = restText ? wrap(restText, n - indent.length) : [];
  return [padRight(first[0], labelCols) + " " + v, ...rest.map((p) => indent + p)];
}

/** Recibo de venta (no es factura electrónica). */
export function buildReceiptRows(input: ReceiptInput, width: PaperWidth): TicketRow[] {
  const n = columnsFor(width);
  const { order, restaurant } = input;
  const sale = order.sale;
  const rows: TicketRow[] = [];
  const name = restaurant?.name || input.fallbackName || "Restaurante";
  wrap(name, colsFor(n, 2)).forEach((t) => rows.push({ text: t, align: "center", bold: true, size: 2 }));
  if (restaurant?.ruc) rows.push({ text: `RUC: ${restaurant.ruc}`, align: "center" });
  if (restaurant?.address) wrap(restaurant.address, n).forEach((t) => rows.push({ text: t, align: "center" }));
  if (restaurant?.phone) rows.push({ text: `Tel: ${restaurant.phone}`, align: "center" });
  if (input.reprint) rows.push({ text: "** REIMPRESION **", align: "center", bold: true });
  rows.push({ text: rule(n) });
  rows.push({ text: twoCols("Pedido", `#${order.number}`, n), bold: true });
  rows.push({ text: twoCols("Fecha", dt(sale?.createdAt ?? order.updatedAt), n) });
  rows.push({ text: twoCols("Mesa", orderPlaceAscii(order), n) });
  wrap(`Cliente: ${order.customerName?.trim() || "-"}`, n).forEach((t) => rows.push({ text: t }));
  wrap(`Cajero: ${sale?.userName || "-"}`, n).forEach((t) => rows.push({ text: t }));
  rows.push({ text: rule(n) });
  for (const it of order.items) {
    amountRows(`${it.quantity} x ${it.productName}`, amount(it.subtotal), n, "    ").forEach((t) => rows.push({ text: t }));
    if (it.quantity > 1) rows.push({ text: `    c/u ${amount(it.price)}` });
  }
  rows.push({ text: rule(n) });
  const taxLabel = restaurant && restaurant.taxRate > 0 ? `IVA ${restaurant.taxRate}%` : "IVA";
  rows.push({ text: twoCols("Subtotal", amount(sale?.subtotal ?? order.subtotal), n) });
  rows.push({ text: twoCols(taxLabel, amount(sale?.tax ?? order.tax), n) });
  rows.push({ text: twoCols("TOTAL", amount(sale?.total ?? order.total), colsFor(n, 2)), bold: true, size: 2 });
  if (sale?.payments.length) {
    rows.push({ text: rule(n) });
    for (const p of sale.payments) {
      rows.push({ text: twoCols(p.method === "CASH" ? "Efectivo" : "Transferencia", amount(p.amount), n) });
      if (p.method === "TRANSFER" && p.reference) {
        wrap(`Cod: ${p.reference}`, n - 2).forEach((t) => rows.push({ text: "  " + t }));
      }
    }
    if (input.cash && input.cash.received > 0) {
      rows.push({ text: twoCols("Recibido", amount(input.cash.received), n) });
      if (input.cash.change > 0) rows.push({ text: twoCols("Vuelto", amount(input.cash.change), n), bold: true });
    }
  }
  rows.push({ text: rule(n, "=") });
  rows.push({ text: "Gracias por su visita", align: "center", bold: true });
  rows.push({ text: "Documento no valido como factura", align: "center" });
  return rows;
}

export function buildReceiptTicket(input: ReceiptInput, width: PaperWidth): Uint8Array {
  return renderTicket(buildReceiptRows(input, width));
}
