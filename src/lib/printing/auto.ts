/**
 * Impresión automática de tickets de pedidos (comanda, adicional/anulado y recibo).
 * Solo se usa en el navegador, desde handlers o efectos (nunca en render).
 */
import { printersApi } from "@/lib/api/printers";
import { restaurantApi } from "@/lib/api/restaurant";
import type { Order, OrderItemInput, PaperWidth, Printer, Restaurant } from "@/lib/api/types";
import { autoPrint, pickCashierPrinter } from "./actions";
import { type OrderChanges, hasChanges, kitchenLinesOf, linesFromInput } from "./order-diff";
import { getPrintSettings } from "./settings";
import { buildKitchenTicket, buildReceiptTicket } from "./tickets";

// ---------- Cachés en memoria ----------

let printersCache: Promise<Printer[]> | null = null;
let restaurantCache: Promise<Restaurant | null> | null = null;

function getPrinters(): Promise<Printer[]> {
  printersCache ??= printersApi.list().catch(() => {
    printersCache = null; // reintentar en la próxima impresión
    return [];
  });
  return printersCache;
}

/** Llamar al guardar cambios en la página Impresoras. */
export function invalidatePrintersCache() {
  printersCache = null;
}

function getRestaurant(): Promise<Restaurant | null> {
  restaurantCache ??= restaurantApi.get().catch(() => {
    restaurantCache = null;
    return null;
  });
  return restaurantCache;
}

/** Llamar al guardar la configuración del restaurante. */
export function invalidateRestaurantCache() {
  restaurantCache = null;
}

/** Impresora de cocina: KITCHEN predeterminada activa, si no la primera KITCHEN activa. */
export function pickKitchenPrinter(printers: Printer[] | undefined): Printer | undefined {
  const active = (printers ?? []).filter((p) => p.isActive && p.purpose === "KITCHEN");
  return active.find((p) => p.isDefault) ?? active[0];
}

async function kitchenWidth(): Promise<PaperWidth> {
  const printers = await getPrinters();
  // Sin impresora de cocina registrada se usa la de caja (suele ser la misma física); si no hay ninguna, 58 mm.
  return (pickKitchenPrinter(printers) ?? pickCashierPrinter(printers))?.paperWidth ?? 58;
}

async function receiptWidth(): Promise<PaperWidth> {
  return pickCashierPrinter(await getPrinters())?.paperWidth ?? 58;
}

// ---------- Registro de lo que ESTA pestaña ya gestionó (evita doble impresión por tiempo real) ----------

const HANDLED_TTL_MS = 30_000;
const handled = new Map<string, number>();
const CHANNEL_NAME = "triada-print";
let channel: BroadcastChannel | null = null;

const handledKey = (o: Pick<Order, "id" | "updatedAt">) => `${o.id}@${o.updatedAt}`;

function prune(now: number) {
  for (const [k, t] of handled) if (now - t > HANDLED_TTL_MS) handled.delete(k);
}

function getChannel(): BroadcastChannel | null {
  if (channel || typeof BroadcastChannel === "undefined") return channel;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (e: MessageEvent<unknown>) => {
    const key = typeof e.data === "string" ? e.data : null;
    if (key) handled.set(key, Date.now());
  };
  return channel;
}

/** Marca una versión del pedido como gestionada aquí (y avisa a las otras pestañas del navegador). */
function markHandled(o: Pick<Order, "id" | "updatedAt">) {
  const now = Date.now();
  prune(now);
  const key = handledKey(o);
  handled.set(key, now);
  getChannel()?.postMessage(key);
}

/** ¿Esta pestaña (u otra de este navegador) ya gestionó esta versión del pedido hace poco? */
export function wasHandledLocally(o: Pick<Order, "id" | "updatedAt">): boolean {
  getChannel();
  prune(Date.now());
  return handled.has(handledKey(o));
}

/** Escucha avisos de otras pestañas (la estación de impresión lo llama al activarse). */
export function listenHandledFromOtherTabs() {
  getChannel();
}

// ---------- Impresión de tickets ----------

function orderLabel(kind: string, o: Pick<Order, "number">) {
  return `${kind} #${o.number}`;
}

/** Comanda completa del pedido. */
export async function printKitchenOrder(order: Order, opts: { reprint?: boolean; manual?: boolean } = {}) {
  const lines = kitchenLinesOf(order.items);
  if (!lines.length) return false;
  const width = await kitchenWidth();
  const { copies } = getPrintSettings();
  const bytes = buildKitchenTicket({ kind: "COMANDA", order, added: lines, reprint: opts.reprint }, width, copies);
  return autoPrint(bytes, orderLabel("Comanda", order), { manual: opts.manual });
}

/** Adicional / anulado con solo los cambios. */
export async function printOrderChanges(order: Order, changes: OrderChanges) {
  if (!hasChanges(changes)) return false;
  const width = await kitchenWidth();
  const { copies } = getPrintSettings();
  const bytes = buildKitchenTicket(
    { kind: "ADICIONAL", order, added: changes.added, removed: changes.removed },
    width,
    copies
  );
  return autoPrint(bytes, orderLabel(changes.added.length ? "Adicional" : "Anulado", order));
}

/** Recibo de venta (pedido PAID con `sale`). */
export async function printReceipt(
  order: Order,
  opts: { cash?: { received: number; change: number }; reprint?: boolean; manual?: boolean; fallbackName?: string } = {}
) {
  if (!order.sale) return false;
  const [width, restaurant] = await Promise.all([receiptWidth(), getRestaurant()]);
  const bytes = buildReceiptTicket(
    { order, restaurant, cash: opts.cash, reprint: opts.reprint, fallbackName: opts.fallbackName },
    width
  );
  return autoPrint(bytes, orderLabel("Recibo", order), { manual: opts.manual });
}

// ---------- Disparadores desde el panel (tras éxito de la petición) ----------

/** Pedido creado en este panel → comanda (si está activado). */
export function onOrderCreatedHere(order: Order) {
  markHandled(order);
  if (getPrintSettings().autoPrintKitchen) void printKitchenOrder(order);
}

/** Productos agregados desde este panel → adicional con lo enviado (cantidades exactas). */
export function onItemsAddedHere(order: Order, input: OrderItemInput[], names?: Map<string, string>) {
  markHandled(order);
  if (!getPrintSettings().autoPrintAdditions) return;
  void printOrderChanges(order, { added: linesFromInput(input, order.items, names), removed: [] });
}

/** Cantidad cambiada / producto quitado desde este panel → adicional (aumento) o anulado (disminución). */
export function onItemsChangedHere(order: Order, changes: OrderChanges) {
  markHandled(order);
  if (getPrintSettings().autoPrintAdditions) void printOrderChanges(order, changes);
}

/** Pedido cobrado en este panel → recibo. */
export function onOrderPaidHere(order: Order, cash?: { received: number; change: number }) {
  markHandled(order);
  if (getPrintSettings().autoPrintReceipt) void printReceipt(order, { cash });
}
