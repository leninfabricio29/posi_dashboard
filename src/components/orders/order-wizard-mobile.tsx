"use client";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { ErrorState, LoadingState } from "@/components/common";
import { CustomerNameDialog } from "@/components/orders/customer-name-dialog";
import { TableMap, TableMapLegend } from "@/components/table-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAvailableProducts } from "@/hooks/queries/use-products";
import { useRestaurant } from "@/hooks/queries/use-restaurant";
import { useTableMap } from "@/hooks/queries/use-tables";
import { useCreateOrder, useAddOrderItems } from "@/hooks/queries/use-orders";
import type { Order } from "@/lib/api/types";
import { money } from "@/lib/format";
import { type CartLine, estimateTotals, orderPlace } from "@/lib/orders";
import { onItemsAddedHere, onOrderCreatedHere } from "@/lib/printing/auto";
import { cn } from "cn";

type Mode = { kind: "create"; initialTableId?: string | null } | { kind: "add"; order: Order };
type Step = "type" | "products" | "confirm";

interface WizardStep {
  id: Step;
  label: string;
  description: string;
}

const STEPS: WizardStep[] = [
  { id: "type", label: "Tipo", description: "Mesa o para llevar" },
  { id: "products", label: "Productos", description: "Selecciona los items" },
  { id: "confirm", label: "Confirmar", description: "Revisa tu pedido" },
];

export function OrderWizardMobile({
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
  const [currentStep, setCurrentStep] = React.useState<Step>("type");

  // Queries
  const { data: products, isLoading: productsLoading, error: productsError } = useAvailableProducts();
  const { data: tableMap, isLoading: mapLoading, error: mapError } = useTableMap();
  const { data: restaurant } = useRestaurant();

  // Mutations
  const createOrder = useCreateOrder();
  const addItems = useAddOrderItems();

  // Form state
  const [search, setSearch] = React.useState("");
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [target, setTarget] = React.useState<"table" | "takeaway">("table");
  const [tableId, setTableId] = React.useState<string | null>(null);
  const [askName, setAskName] = React.useState(false);
  const [notes, setNotes] = React.useState("");

  const initialTableId = mode.kind === "create" ? mode.initialTableId ?? null : null;

  // Reset on open
  React.useEffect(() => {
    if (!open) return;
    setCurrentStep(isCreate ? "type" : "products");
    setSearch("");
    setCart([]);
    setNotes("");
    setAskName(false);
    setTableId(initialTableId);
    setTarget("table");
  }, [open, isCreate, initialTableId]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products ?? [];
    if (!q) return list;
    return list.filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
  }, [products, search]);

  const selectedTable = React.useMemo(() => {
    for (const a of tableMap ?? []) {
      const t = a.tables.find((x) => x.id === tableId);
      if (t) return t;
    }
    return null;
  }, [tableMap, tableId]);

  function addProduct(p: NonNullable<typeof products>[number]) {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.productId === p.id && !l.notes);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { productId: p.id, name: p.name, price: p.price, taxable: p.taxable, quantity: 1, notes: "" }];
    });
    toast.success(`${p.name} agregado`, { duration: 1000 });
  }

  function updateLine(i: number, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function removeLine(i: number) {
    setCart((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totals = estimateTotals(cart, restaurant);

  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const canGoNext = React.useMemo(() => {
    if (currentStep === "type") {
      return target === "takeaway" || (target === "table" && tableId !== null);
    }
    if (currentStep === "products") {
      return cart.length > 0;
    }
    return false;
  }, [currentStep, target, tableId, cart.length]);

  function goNext() {
    if (currentStep === "type") {
      setCurrentStep("products");
    } else if (currentStep === "products") {
      setCurrentStep("confirm");
    }
  }

  function goBack() {
    if (currentStep === "products") {
      setCurrentStep(isCreate ? "type" : "products");
    } else if (currentStep === "confirm") {
      setCurrentStep("products");
    }
  }

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
    try {
      let order: Order;
      if (mode.kind === "create") {
        if (!customerName) return;
        const result = await createOrder.mutateAsync({
          items,
          customerName,
          ...(target === "table" && tableId ? { tableId } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        });
        // El hook muestra "Pedido #N guardado"
        order = result;
        onOrderCreatedHere(order);
      } else {
        const result = await addItems.mutateAsync({ orderId: mode.order.id, items });
        // El hook muestra "Productos agregados al pedido #N"
        order = result;
        onItemsAddedHere(order, items, new Map(cart.map((l) => [l.productId, l.name])));
      }
      setAskName(false);
      onSaved(order);
      onOpenChange(false);
    } catch {
      // Error handling is done by the mutation hooks
    }
  }

  const isSaving = createOrder.isPending || addItems.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !isSaving && onOpenChange(o)}>
      <DialogContent className="h-[95svh] max-w-full p-0 sm:max-w-lg">
        {/* Header with Progress */}
        <DialogHeader className="border-b p-4 pb-3">
          <DialogTitle className="text-lg">
            {isCreate ? "Nuevo pedido" : `Agregar a pedido #${mode.order.number}`}
          </DialogTitle>
          {isCreate && (
            <div className="flex items-center gap-2 pt-2">
              {STEPS.map((step, i) => (
                <React.Fragment key={step.id}>
                  <div className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                        i < stepIndex
                          ? "border-primary bg-primary text-primary-foreground"
                          : i === stepIndex
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-muted-foreground/30 text-muted-foreground"
                      )}
                    >
                      {i < stepIndex ? <Check className="size-4" /> : i + 1}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        i === stepIndex ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ChevronRight
                      className={cn(
                        "size-4 shrink-0 -translate-y-2",
                        i < stepIndex ? "text-primary" : "text-muted-foreground/30"
                      )}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </DialogHeader>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Type Selection */}
          {currentStep === "type" && isCreate && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">¿Dónde se servirá el pedido?</h3>
                <p className="text-sm text-muted-foreground">Selecciona el tipo de pedido</p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setTarget("table")}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border-2 p-4 transition-all",
                    target === "table"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg",
                      target === "table" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <UtensilsCrossed className="size-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold">En mesa</p>
                    <p className="text-xs text-muted-foreground">Servir en una mesa del restaurante</p>
                  </div>
                  {target === "table" && (
                    <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="size-4" />
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setTarget("takeaway")}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border-2 p-4 transition-all",
                    target === "takeaway"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg",
                      target === "takeaway" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <ShoppingBag className="size-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold">Para llevar</p>
                    <p className="text-xs text-muted-foreground">Pedido para recoger</p>
                  </div>
                  {target === "takeaway" && (
                    <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="size-4" />
                    </div>
                  )}
                </button>
              </div>

              {target === "table" && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium">Selecciona una mesa</h4>
                    {selectedTable && (
                      <p className="text-sm text-muted-foreground">
                        {selectedTable.areaName} · {selectedTable.name}
                      </p>
                    )}
                  </div>
                  {mapLoading ? (
                    <LoadingState rows={2} />
                  ) : mapError ? (
                    <ErrorState message={mapError instanceof Error ? mapError.message : String(mapError)} />
                  ) : (
                    <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                      <TableMapLegend />
                      <TableMap
                        compact
                        areas={tableMap ?? []}
                        selectedId={tableId}
                        disableStatuses={["OCCUPIED"]}
                        onSelect={(t) => setTableId(t.id)}
                      />
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">Al guardar te pediremos el nombre del cliente.</p>
            </div>
          )}

          {/* Step 2: Products */}
          {currentStep === "products" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Selecciona productos</h3>
                <p className="text-sm text-muted-foreground">
                  {cart.length > 0 ? `${cart.reduce((s, l) => s + l.quantity, 0)} productos en el carrito` : "Busca y agrega productos"}
                </p>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar producto…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Cart Summary (collapsible) */}
              {cart.length > 0 && (
                <div className="rounded-lg border bg-primary/5 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {cart.reduce((s, l) => s + l.quantity, 0)} productos
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cart.length} {cart.length === 1 ? "línea" : "líneas"}
                      </p>
                    </div>
                    <p className="text-lg font-bold">{money(totals.total)}</p>
                  </div>
                </div>
              )}

              {/* Product List */}
              {productsLoading ? (
                <LoadingState rows={4} />
              ) : productsError ? (
                <ErrorState message={productsError instanceof Error ? productsError.message : String(productsError)} />
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {search ? "No se encontraron productos" : "No hay productos disponibles"}
                </p>
              ) : (
                <div className="space-y-2">
                  {filtered.map((p) => {
                    const inCart = cart.find((l) => l.productId === p.id && !l.notes);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProduct(p)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all",
                          inCart
                            ? "border-primary/50 bg-primary/5"
                            : "hover:border-primary/30 hover:bg-muted/50"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{p.name}</p>
                          {p.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold tabular-nums">{money(p.price)}</span>
                          {inCart && (
                            <Badge variant="default" className="min-w-[24px] justify-center">
                              {inCart.quantity}
                            </Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {currentStep === "confirm" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Revisa tu pedido</h3>
                <p className="text-sm text-muted-foreground">Verifica los productos antes de confirmar</p>
              </div>

              {isCreate && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground">TIPO DE PEDIDO</p>
                  <p className="mt-1 font-medium">
                    {target === "table"
                      ? `Mesa: ${selectedTable?.areaName} · ${selectedTable?.name}`
                      : "Para llevar"}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">PRODUCTOS</p>
                {cart.map((l, i) => (
                  <div key={i} className="rounded-lg border bg-background p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">{l.name}</span>
                      <span className="font-semibold tabular-nums">{money(l.price * l.quantity)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        onClick={() => (l.quantity > 1 ? updateLine(i, { quantity: l.quantity - 1 }) : removeLine(i))}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <Input
                        className="h-8 w-16 text-center"
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
                        onClick={() => updateLine(i, { quantity: l.quantity + 1 })}
                      >
                        <Plus className="size-3" />
                      </Button>
                      <span className="text-xs text-muted-foreground">× {money(l.price)}</span>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="ml-auto text-destructive"
                        onClick={() => removeLine(i)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Nota (ej. sin cebolla)"
                      value={l.notes}
                      maxLength={140}
                      onChange={(e) => updateLine(i, { notes: e.target.value })}
                    />
                  </div>
                ))}
              </div>

              {isCreate && (
                <div className="space-y-1.5">
                  <Label htmlFor="orderNotes">Notas del pedido (opcional)</Label>
                  <Textarea
                    id="orderNotes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={300}
                    placeholder="Instrucciones especiales..."
                  />
                </div>
              )}

              <div className="rounded-lg border bg-primary/5 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">{money(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA ({restaurant?.taxRate ?? 0}%)</span>
                  <span className="tabular-nums">{money(totals.tax)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-lg font-bold">
                  <span>Total</span>
                  <span className="tabular-nums">{money(totals.total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Navigation */}
        <div className="border-t p-4 space-y-2">
          {currentStep !== "confirm" ? (
            <div className="flex gap-2">
              {currentStep !== "type" && (
                <Button type="button" variant="outline" onClick={goBack} className="flex-1">
                  <ArrowLeft className="size-4" /> Atrás
                </Button>
              )}
              <Button type="button" onClick={goNext} disabled={!canGoNext} className="flex-1">
                Siguiente <ArrowRight className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={goBack} disabled={isSaving} className="flex-1">
                <ArrowLeft className="size-4" /> Atrás
              </Button>
              <Button type="button" onClick={submit} disabled={isSaving || cart.length === 0} className="flex-1">
                {isSaving ? "Guardando…" : isCreate ? "Guardar pedido" : "Agregar productos"}
              </Button>
            </div>
          )}
        </div>
        {isCreate && (
          <CustomerNameDialog
            open={askName}
            onOpenChange={setAskName}
            place={target === "table" && selectedTable ? `Mesa ${selectedTable.name}` : "Para llevar"}
            itemsCount={cart.reduce((s, l) => s + l.quantity, 0)}
            total={totals.total}
            saving={isSaving}
            onConfirm={(name) => void save(name)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
