"use client";

import * as React from "react";
import { Minus, Plus, Search, ShoppingBag, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { ErrorState, LoadingState } from "@/components/common";
import { CustomerNameDialog } from "@/components/orders/customer-name-dialog";
import { TableMap, TableMapLegend } from "@/components/table-map";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAsync } from "@/hooks/use-async";
import { errorMessage } from "@/lib/api/client";
import { ordersApi } from "@/lib/api/orders";
import { productsApi } from "@/lib/api/products";
import { restaurantApi } from "@/lib/api/restaurant";
import { tablesApi } from "@/lib/api/tables";
import type { Order, Product } from "@/lib/api/types";
import { money } from "@/lib/format";
import { type CartLine, estimateTotals, orderPlace } from "@/lib/orders";
import { onItemsAddedHere, onOrderCreatedHere } from "@/lib/printing/auto";
import { cn } from "@/lib/utils";

type Mode = { kind: "create"; initialTableId?: string | null } | { kind: "add"; order: Order };

export function OrderEditorDialog({
  open,
  onOpenChange,
  mode,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  onSaved: (order: Order) => void;
}) {
  const isCreate = mode.kind === "create";
  const products = useAsync(() => productsApi.list({ available: true }), [open], open);
  const map = useAsync(() => tablesApi.map(), [open], open && isCreate);
  const restaurant = useAsync(() => restaurantApi.get(), [open], open);

  const [search, setSearch] = React.useState("");
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [target, setTarget] = React.useState<"table" | "takeaway">("table");
  const [tableId, setTableId] = React.useState<string | null>(null);
  const [askName, setAskName] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const initialTableId = mode.kind === "create" ? mode.initialTableId ?? null : null;
  React.useEffect(() => {
    if (!open) return;
    setSearch("");
    setCart([]);
    setNotes("");
    setAskName(false);
    setTableId(initialTableId);
    setTarget("table");
  }, [open, initialTableId]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (products.data ?? []).filter((p) => p.available);
    if (!q) return list;
    return list.filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
  }, [products.data, search]);

  const selectedTable = React.useMemo(() => {
    for (const a of map.data ?? []) {
      const t = a.tables.find((x) => x.id === tableId);
      if (t) return t;
    }
    return null;
  }, [map.data, tableId]);

  function addProduct(p: Product) {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.productId === p.id && !l.notes);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { productId: p.id, name: p.name, price: p.price, taxable: p.taxable, quantity: 1, notes: "" }];
    });
  }

  function updateLine(i: number, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function removeLine(i: number) {
    setCart((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totals = estimateTotals(cart, restaurant.data);

  /** Valida el carrito; devuelve los items listos para enviar o null. */
  function validItems() {
    if (!cart.length) {
      toast.error("Agrega al menos un producto");
      return null;
    }
    if (cart.some((l) => !Number.isInteger(l.quantity) || l.quantity < 1)) {
      toast.error("Las cantidades deben ser enteros mayores o iguales a 1");
      return null;
    }
    return cart.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      ...(l.notes.trim() ? { notes: l.notes.trim() } : {}),
    }));
  }

  /** "Guardar pedido": al crear, primero pide el nombre del cliente. */
  function submit() {
    if (!validItems()) return;
    if (mode.kind === "create") {
      if (target === "table" && !tableId) {
        toast.error("Elige una mesa o marca el pedido como para llevar");
        return;
      }
      setAskName(true);
      return;
    }
    void save();
  }

  async function save(customerName?: string) {
    const items = validItems();
    if (!items) return;
    setSaving(true);
    try {
      let order: Order;
      if (mode.kind === "create") {
        if (!customerName) return;
        order = await ordersApi.create({
          items,
          customerName,
          ...(target === "table" && tableId ? { tableId } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        });
        toast.success(`Pedido #${order.number} guardado`);
        onOrderCreatedHere(order);
      } else {
        order = await ordersApi.addItems(mode.order.id, items);
        toast.success(`Productos agregados al pedido #${order.number}`);
        onItemsAddedHere(order, items, new Map(cart.map((l) => [l.productId, l.name])));
      }
      setAskName(false);
      onSaved(order);
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent size="2xl">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Nuevo pedido" : `Agregar productos al pedido #${mode.order.number}`}</DialogTitle>
          <DialogDescription>
            {isCreate ? "Elige la mesa (o para llevar), agrega productos y guarda. El pedido queda abierto hasta cobrarlo." : orderPlace(mode.order)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <div className="min-w-0 space-y-5">
            {isCreate && (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant={target === "table" ? "default" : "outline"}
                    onClick={() => setTarget("table")}
                  >
                    <UtensilsCrossed /> En mesa
                  </Button>
                  <Button
                    type="button"
                    variant={target === "takeaway" ? "default" : "outline"}
                    onClick={() => setTarget("takeaway")}
                  >
                    <ShoppingBag /> Para llevar
                  </Button>
                  {target === "table" && (
                    <span className="text-sm text-indigo-600 ">
                      {selectedTable ? `Mesa elegida: ${selectedTable.areaName} · ${selectedTable.name}` : "Ninguna mesa elegida"}
                    </span>
                  )}
                </div>
                {target === "table" ? (
                  map.loading && !map.data ? (
                    <LoadingState rows={2} />
                  ) : map.error && !map.data ? (
                    <ErrorState message={map.error} onRetry={map.reload} />
                  ) : (
                    <div className="space-y-2 rounded-lg border p-3">
                      <TableMapLegend />
                      <TableMap
                        compact
                        areas={map.data ?? []}
                        selectedId={tableId}
                        disableStatuses={["OCCUPIED"]}
                        onSelect={(t) => setTableId(t.id)}
                      />
                    </div>
                  )
                ) : (
                  <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    Pedido para llevar. Al guardar te pediremos el nombre del cliente.
                  </p>
                )}
              </section>
            )}

            <section className="space-y-2">
              <Label htmlFor="productSearch">Productos</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="productSearch"
                  className="pl-8"
                  placeholder="Buscar producto…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {products.loading && !products.data ? (
                <LoadingState rows={4} />
              ) : products.error && !products.data ? (
                <ErrorState message={products.error} onRetry={products.reload} />
              ) : filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No hay productos disponibles.</p>
              ) : (
                <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {filtered.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      className="flex items-start justify-between gap-2 rounded-lg border p-2.5 text-left hover:bg-muted"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{p.name}</span>
                        {p.description && (
                          <span className="line-clamp-1 text-xs text-muted-foreground">{p.description}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-sm font-medium tabular-nums">{money(p.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <h3 className="font-medium">Detalle ({cart.reduce((s, l) => s + l.quantity, 0)} ítems)</h3>
            {cart.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Toca un producto para agregarlo.</p>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {cart.map((l, i) => (
                  <li key={i} className="space-y-1.5 rounded-md border bg-background p-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{l.name}</span>
                      <span className="text-sm tabular-nums">{money(l.price * l.quantity)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        aria-label="Restar"
                        onClick={() => (l.quantity > 1 ? updateLine(i, { quantity: l.quantity - 1 }) : removeLine(i))}
                      >
                        <Minus />
                      </Button>
                      <Input
                        aria-label={`Cantidad de ${l.name}`}
                        className="h-7 w-14 text-center"
                        inputMode="numeric"
                        value={String(l.quantity)}
                        onChange={(e) => {
                          const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                          updateLine(i, { quantity: Number.isFinite(n) ? n : 0 });
                        }}
                        onBlur={() => l.quantity < 1 && updateLine(i, { quantity: 1 })}
                      />
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        aria-label="Sumar"
                        onClick={() => updateLine(i, { quantity: l.quantity + 1 })}
                      >
                        <Plus />
                      </Button>
                      <span className="text-xs text-muted-foreground">× {money(l.price)}</span>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="ml-auto"
                        aria-label={`Quitar ${l.name}`}
                        onClick={() => removeLine(i)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <Input
                      aria-label={`Nota para ${l.name}`}
                      className="h-7 text-xs"
                      placeholder="Nota (ej. sin cebolla)"
                      value={l.notes}
                      maxLength={140}
                      onChange={(e) => updateLine(i, { notes: e.target.value })}
                    />
                  </li>
                ))}
              </ul>
            )}
            {isCreate && (
              <div className="space-y-1.5">
                <Label htmlFor="orderNotes">Notas del pedido</Label>
                <Textarea id="orderNotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
              </div>
            )}
            <dl className="space-y-1 border-t pt-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{money(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">IVA {restaurant.data ? `${restaurant.data.taxRate}%` : ""}</dt>
                <dd className="tabular-nums">{money(totals.tax)}</dd>
              </div>
              <div className={cn("flex justify-between text-base font-semibold")}>
                <dt>{isCreate ? "Total estimado" : "Total a agregar"}</dt>
                <dd className="tabular-nums">{money(totals.total)}</dd>
              </div>
              <p className="text-xs text-muted-foreground">El total final lo calcula el servidor.</p>
            </dl>
          </aside>
        </div>

        <DialogFooter sticky>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || cart.length === 0}>
            {saving ? "Guardando…" : isCreate ? "Guardar pedido" : "Agregar al pedido"}
          </Button>
        </DialogFooter>
        {isCreate && (
        <CustomerNameDialog
          open={askName}
          onOpenChange={setAskName}
          place={target === "table" && selectedTable ? `Mesa ${selectedTable.name}` : "Para llevar"}
          itemsCount={cart.reduce((s, l) => s + l.quantity, 0)}
          total={totals.total}
          saving={saving}
          onConfirm={(name) => void save(name)}
        />
        )}
      </DialogContent>
    </Dialog>
  );
}
