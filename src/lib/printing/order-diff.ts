/**
 * Diferencias entre dos estados de un pedido, para imprimir adicionales/anulados en cocina.
 * Lógica pura (sin navegador) para poder probarla aislada.
 */
import type { OrderItem, OrderItemInput } from "@/lib/api/types";

/** Una línea de cocina: "cant x producto" + notas. */
export interface KitchenLine {
  quantity: number;
  productName: string;
  notes: string | null;
}

export interface OrderChanges {
  /** Productos agregados o aumentos de cantidad (solo la diferencia). */
  added: KitchenLine[];
  /** Productos quitados o disminuciones de cantidad (solo la diferencia). */
  removed: KitchenLine[];
}

type DiffItem = Pick<OrderItem, "id" | "productId" | "productName" | "quantity" | "notes">;

const cleanNotes = (n: string | null | undefined) => n?.trim() || null;
const keyOf = (it: Pick<OrderItem, "productId" | "notes">) => `${it.productId}\u0000${cleanNotes(it.notes) ?? ""}`;

export function hasChanges(c: OrderChanges) {
  return c.added.length > 0 || c.removed.length > 0;
}

/** Líneas de cocina de todos los items de un pedido (comanda completa). */
export function kitchenLinesOf(items: DiffItem[]): KitchenLine[] {
  return items
    .filter((it) => it.quantity > 0)
    .map((it) => ({ quantity: it.quantity, productName: it.productName, notes: cleanNotes(it.notes) }));
}

/**
 * Compara items antes/después:
 *  1. Empareja por id de item: la diferencia de cantidad es adicional (+) o anulado (−).
 *  2. Lo que quedó sin pareja (items nuevos, quitados o recreados por el backend) se compensa por
 *     producto + notas, para que un item "recreado" con la misma cantidad no se imprima dos veces.
 */
export function diffOrderItems(before: DiffItem[], after: DiffItem[]): OrderChanges {
  const added: KitchenLine[] = [];
  const removed: KitchenLine[] = [];
  const beforeById = new Map(before.map((it) => [it.id, it]));
  const afterIds = new Set(after.map((it) => it.id));

  // Restos sin pareja por id, agrupados por producto + notas (cantidad neta y nombre).
  const rest = new Map<string, { qty: number; productName: string; notes: string | null }>();
  const addRest = (it: DiffItem, sign: 1 | -1) => {
    const k = keyOf(it);
    const cur = rest.get(k) ?? { qty: 0, productName: it.productName, notes: cleanNotes(it.notes) };
    cur.qty += sign * it.quantity;
    rest.set(k, cur);
  };

  for (const it of after) {
    const prev = beforeById.get(it.id);
    if (!prev) {
      addRest(it, 1);
      continue;
    }
    const delta = it.quantity - prev.quantity;
    const line = { productName: it.productName, notes: cleanNotes(it.notes) };
    if (delta > 0) added.push({ quantity: delta, ...line });
    else if (delta < 0) removed.push({ quantity: -delta, ...line });
  }
  for (const it of before) if (!afterIds.has(it.id)) addRest(it, -1);

  for (const r of rest.values()) {
    if (r.qty > 0) added.push({ quantity: r.qty, productName: r.productName, notes: r.notes });
    else if (r.qty < 0) removed.push({ quantity: -r.qty, productName: r.productName, notes: r.notes });
  }
  return { added, removed };
}

/**
 * Líneas exactas de lo que se acaba de agregar desde el panel (cantidades enviadas al backend).
 * El nombre se toma de los items del pedido devuelto (o de `names` si se conoce).
 */
export function linesFromInput(
  input: OrderItemInput[],
  orderItems: Pick<OrderItem, "productId" | "productName">[],
  names?: Map<string, string>
): KitchenLine[] {
  return input
    .filter((i) => i.quantity > 0)
    .map((i) => ({
      quantity: i.quantity,
      productName:
        names?.get(i.productId) ?? orderItems.find((o) => o.productId === i.productId)?.productName ?? "Producto",
      notes: cleanNotes(i.notes),
    }));
}
