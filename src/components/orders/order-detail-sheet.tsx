"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ChefHat, CreditCard, Loader2, Minus, Pencil, Plus, ReceiptText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog, CustomerName, OrderStatusBadge } from "@/components/common";
import { OrderEditorDialog } from "@/components/orders/order-editor-dialog";
import { OrderWizardMobile } from "@/components/orders/order-wizard-mobile";
import { PaymentDialog } from "@/components/orders/payment-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-media-query";
import { errorMessage } from "@/lib/api/client";
import { ordersApi } from "@/lib/api/orders";
import type { Order, OrderItem } from "@/lib/api/types";
import { fmtDateTime, money } from "@/lib/format";
import { CUSTOMER_NAME_MAX, isEditableOrder, orderPlace } from "@/lib/orders";
import { onItemsChangedHere, printKitchenOrder, printReceipt } from "@/lib/printing/auto";

const LAST_ITEM_HINT = "El pedido debe tener al menos un producto";

export function OrderDetailSheet({
  order,
  open,
  onOpenChange,
  onChange,
  cashOpen,
}: {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (order: Order) => void;
  cashOpen: boolean;
}) {
  const isMobile = useIsMobile();
  /** id del item cuya cantidad se está actualizando (evita doble click en −/+). */
  const [qtyBusy, setQtyBusy] = React.useState<string | null>(null);
  const [removeItem, setRemoveItem] = React.useState<OrderItem | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [paying, setPaying] = React.useState(false);
  const [editingName, setEditingName] = React.useState(false);
  const [reprinting, setReprinting] = React.useState<"kitchen" | "receipt" | null>(null);

  if (!order) return null;
  const editable = isEditableOrder(order);
  const busy = qtyBusy !== null;
  const onlyOne = order.items.length <= 1;

  async function changeQuantity(item: OrderItem, quantity: number) {
    if (!order || quantity < 1 || qtyBusy) return;
    setQtyBusy(item.id);
    try {
      const updated = await ordersApi.updateItemQuantity(order.id, item.id, quantity);
      onChange(updated);
      const delta = quantity - item.quantity;
      const line = { quantity: Math.abs(delta), productName: item.productName, notes: item.notes };
      if (delta !== 0) {
        onItemsChangedHere(updated, delta > 0 ? { added: [line], removed: [] } : { added: [], removed: [line] });
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setQtyBusy(null);
    }
  }

  async function reprint(kind: "kitchen" | "receipt") {
    if (!order || reprinting) return;
    setReprinting(kind);
    try {
      if (kind === "kitchen") await printKitchenOrder(order, { reprint: true, manual: true });
      else await printReceipt(order, { reprint: true, manual: true });
    } finally {
      setReprinting(null);
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              Pedido #{order.number} <OrderStatusBadge status={order.status} />
            </SheetTitle>
            <div className="flex min-w-0 items-center gap-1 text-base font-medium">
              <span className="shrink-0">{orderPlace(order)}</span>
              <span className="shrink-0 text-muted-foreground">·</span>
              <CustomerName name={order.customerName} className="min-w-0" />
              {editable && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="shrink-0"
                  aria-label="Editar nombre del cliente"
                  title="Editar nombre del cliente"
                  onClick={() => setEditingName(true)}
                >
                  <Pencil />
                </Button>
              )}
            </div>
            <SheetDescription>
              {fmtDateTime(order.createdAt)} · {order.userName}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-6">
            {order.notes && <p className="rounded-md bg-muted p-2 text-sm">Nota: {order.notes}</p>}

            <ul className="divide-y rounded-lg border">
              {order.items.length === 0 && <li className="p-3 text-sm text-muted-foreground">Sin productos</li>}
              {order.items.map((it) => (
                <li key={it.id} className="flex items-start gap-2 p-2.5">
                  {!editable && <span className="w-8 shrink-0 text-sm font-medium tabular-nums">{it.quantity}×</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{it.productName}</span>
                    <span className="block text-xs text-muted-foreground">
                      {money(it.price)} c/u{it.taxable ? " · grava IVA" : ""}
                    </span>
                    {it.notes && <span className="block text-xs italic text-muted-foreground">“{it.notes}”</span>}
                    {editable && (
                      <span className="mt-1.5 inline-flex items-center gap-1" role="group" aria-label={`Cantidad de ${it.productName}`}>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label={`Restar uno a ${it.productName}`}
                          title={it.quantity <= 1 ? "Para quitar el producto usa el botón de eliminar" : undefined}
                          onClick={() => changeQuantity(it, it.quantity - 1)}
                          disabled={busy || it.quantity <= 1}
                        >
                          <Minus />
                        </Button>
                        <span className="flex w-8 justify-center text-sm font-medium tabular-nums" aria-live="polite">
                          {qtyBusy === it.id ? <Loader2 className="size-4 animate-spin" /> : it.quantity}
                        </span>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label={`Sumar uno a ${it.productName}`}
                          onClick={() => changeQuantity(it, it.quantity + 1)}
                          disabled={busy}
                        >
                          <Plus />
                        </Button>
                      </span>
                    )}
                  </span>
                  <span className="text-sm tabular-nums">{money(it.subtotal)}</span>
                  {editable &&
                    (onlyOne ? (
                      <Tooltip>
                        <TooltipTrigger render={<span tabIndex={0} className="inline-flex" />}>
                          <Button size="icon-sm" variant="ghost" aria-label={`Quitar ${it.productName}`} disabled>
                            <Trash2 />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{LAST_ITEM_HINT}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Quitar ${it.productName}`}
                        onClick={() => setRemoveItem(it)}
                        disabled={busy}
                      >
                        <Trash2 />
                      </Button>
                    ))}
                </li>
              ))}
            </ul>

            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{money(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">IVA</dt>
                <dd className="tabular-nums">{money(order.tax)}</dd>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(order.total)}</dd>
              </div>
            </dl>

            {order.sale && (
              <div className="space-y-1 rounded-lg border p-3 text-sm">
                <p className="font-medium">Pagos ({fmtDateTime(order.sale.createdAt)} · {order.sale.userName})</p>
                {order.sale.payments.map((p) => (
                  <div key={p.id} className="flex justify-between">
                    <span>
                      {p.method === "CASH" ? "Efectivo" : `Transferencia (${p.reference})`}
                    </span>
                    <span className="tabular-nums">{money(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {order.items.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => reprint("kitchen")} disabled={reprinting !== null}>
                  {reprinting === "kitchen" ? <Loader2 className="animate-spin" /> : <ChefHat />} Reimprimir comanda
                </Button>
                {order.status === "PAID" && order.sale && (
                  <Button variant="outline" size="sm" onClick={() => reprint("receipt")} disabled={reprinting !== null}>
                    {reprinting === "receipt" ? <Loader2 className="animate-spin" /> : <ReceiptText />} Reimprimir recibo
                  </Button>
                )}
              </div>
            )}

            {editable && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setAdding(true)} disabled={busy}>
                    <Plus /> Agregar productos
                  </Button>
                </div>

                {!cashOpen && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>
                      No hay caja abierta: no se puede cobrar.{" "}
                      <Link href="/caja" className="font-medium underline">
                        Abrir caja
                      </Link>
                    </span>
                  </div>
                )}
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => setPaying(true)}
                  disabled={busy || !cashOpen || order.items.length === 0}
                >
                  <CreditCard /> Cobrar {money(order.total)}
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!removeItem}
        onOpenChange={(o) => !o && setRemoveItem(null)}
        title="¿Quitar producto?"
        description={removeItem ? `${removeItem.quantity}× ${removeItem.productName}` : undefined}
        confirmLabel="Quitar"
        destructive
        onConfirm={async () => {
          if (!removeItem) return;
          try {
            const updated = await ordersApi.removeItem(order.id, removeItem.id);
            onChange(updated);
            toast.success("Producto quitado");
            onItemsChangedHere(updated, {
              added: [],
              removed: [{ quantity: removeItem.quantity, productName: removeItem.productName, notes: removeItem.notes }],
            });
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }}
      />
      {isMobile ? (
        <OrderWizardMobile
          open={adding}
          onOpenChange={setAdding}
          mode={{ kind: "add", order }}
          onSaved={onChange}
        />
      ) : (
        <OrderEditorDialog
          open={adding}
          onOpenChange={setAdding}
          mode={{ kind: "add", order }}
          onSaved={onChange}
        />
      )}
      <PaymentDialog order={order} open={paying} onOpenChange={setPaying} onPaid={onChange} />
      <EditCustomerNameDialog order={order} open={editingName} onOpenChange={setEditingName} onSaved={onChange} />
    </>
  );
}

/** Corrige el nombre del cliente de un pedido abierto (PATCH /orders/:id). */
function EditCustomerNameDialog({
  order,
  open,
  onOpenChange,
  onSaved,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (order: Order) => void;
}) {
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName(order.customerName ?? "");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Ingresa el nombre del cliente");
      return;
    }
    setSaving(true);
    try {
      const updated = await ordersApi.update(order.id, { customerName: trimmed.slice(0, CUSTOMER_NAME_MAX) });
      onSaved(updated);
      toast.success("Nombre del cliente actualizado");
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent size="sm">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Nombre del cliente</DialogTitle>
            <DialogDescription>
              Pedido #{order.number} · {orderPlace(order)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="editCustomerName">Nombre del cliente</Label>
            <Input
              id="editCustomerName"
              autoFocus
              required
              autoComplete="off"
              maxLength={CUSTOMER_NAME_MAX}
              value={name}
              aria-invalid={error ? true : undefined}
              validationState={error ? "error" : undefined}
              helperText={error ?? undefined}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
