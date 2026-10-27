"use client";

import * as React from "react";
import { Banknote, Calculator, Landmark, Plus, Shuffle, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { CustomerName, SimpleSelect } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/lib/api/client";
import { ordersApi } from "@/lib/api/orders";
import type { Order, PaymentInput, PaymentMethod } from "@/lib/api/types";
import { money, parseAmount, round2, toCents } from "@/lib/format";
import { orderPlace } from "@/lib/orders";
import { onOrderPaidHere } from "@/lib/printing/auto";
import { cn } from "cn";

type PayMode = "CASH" | "TRANSFER" | "MIXED";

// Denominaciones comunes de billetes y monedas
const QUICK_AMOUNTS = [
  { value: 5, label: "$5" },
  { value: 10, label: "$10" },
  { value: 20, label: "$20" },
  { value: 50, label: "$50" },
  { value: 100, label: "$100" },
  { value: 200, label: "$200" },
  { value: 500, label: "$500" },
  { value: 1000, label: "$1000" },
];

interface Row {
  method: PaymentMethod;
  amount: string;
  reference: string;
}

const METHOD_OPTIONS = [
  { value: "CASH" as const, label: "Efectivo" },
  { value: "TRANSFER" as const, label: "Transferencia" },
];

export function PaymentDialog({
  order,
  open,
  onOpenChange,
  onPaid,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid: (order: Order) => void;
}) {
  const total = order.total;
  const [mode, setMode] = React.useState<PayMode>("CASH");
  // "Efectivo recibido": mientras el usuario no lo escriba, sigue la parte en efectivo del modo actual
  // (en mixto, la fila de efectivo). Al cambiar de modo vuelve a seguirla.
  const [received, setReceivedRaw] = React.useState("");
  const [receivedTouched, setReceivedTouched] = React.useState(false);
  const setReceived = React.useCallback((value: string) => {
    setReceivedRaw(value);
    setReceivedTouched(true);
  }, []);
  const [reference, setReference] = React.useState("");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [showCalculator, setShowCalculator] = React.useState(false);
  const [calculatorValue, setCalculatorValue] = React.useState(0);

  React.useEffect(() => {
    if (!open) return;
    setMode("CASH");
    setReceivedRaw("");
    setReceivedTouched(false);
    setReference("");
    setRows([
      { method: "TRANSFER", amount: "", reference: "" },
      { method: "CASH", amount: total.toFixed(2), reference: "" },
    ]);
    setShowCalculator(false);
    setCalculatorValue(0);
  }, [open, total]);

  // ---- Construcción de pagos según el modo ----
  // En mixto, las filas de efectivo son lo que el cliente ENTREGA: si sobra, es vuelto.
  // Al backend solo se envía lo aplicado a la venta (total − transferencias), porque la suma debe ser exacta.
  const mixedTransferCents = rows
    .filter((r) => r.method === "TRANSFER")
    .reduce((s, r) => s + toCents(parseAmount(r.amount) || 0), 0);
  const mixedCashGivenCents = rows
    .filter((r) => r.method === "CASH")
    .reduce((s, r) => s + toCents(parseAmount(r.amount) || 0), 0);

  const payments: PaymentInput[] = React.useMemo(() => {
    if (mode === "CASH") return [{ method: "CASH", amount: round2(total) }];
    if (mode === "TRANSFER") return [{ method: "TRANSFER", amount: round2(total), reference: reference.trim() }];
    const transfers: PaymentInput[] = rows
      .filter((r) => r.method === "TRANSFER")
      .map((r) => ({ method: "TRANSFER" as const, amount: round2(parseAmount(r.amount) || 0), reference: r.reference.trim() }))
      .filter((p) => p.amount > 0);
    const cashAppliedCents = Math.min(mixedCashGivenCents, Math.max(0, toCents(total) - mixedTransferCents));
    return cashAppliedCents > 0 ? [...transfers, { method: "CASH" as const, amount: cashAppliedCents / 100 }] : transfers;
  }, [mode, total, reference, rows, mixedTransferCents, mixedCashGivenCents]);

  const cashDue = payments.filter((p) => p.method === "CASH").reduce((s, p) => s + p.amount, 0);
  const sumCents = payments.reduce((s, p) => s + toCents(p.amount), 0);
  const totalCents = toCents(total);
  const diffCents = totalCents - sumCents;
  const defaultReceived = mode === "MIXED" ? mixedCashGivenCents / 100 : cashDue;
  const receivedValue = receivedTouched ? received : defaultReceived > 0 ? defaultReceived.toFixed(2) : "";
  const receivedNum = parseAmount(receivedValue);
  const change = cashDue > 0 && Number.isFinite(receivedNum) ? round2(receivedNum - cashDue) : 0;

  const errors: string[] = [];
  if (payments.length === 0) errors.push("Ingresa al menos un pago");
  if (mode === "MIXED" && mixedTransferCents > totalCents)
    errors.push(`Las transferencias exceden el total en ${money((mixedTransferCents - totalCents) / 100)}; el vuelto solo se da en efectivo`);
  else if (diffCents !== 0)
    errors.push(diffCents > 0 ? `Faltan ${money(diffCents / 100)} para cubrir el total` : `Los pagos exceden el total en ${money(-diffCents / 100)}`);
  if (payments.some((p) => p.method === "TRANSFER" && !p.reference))
    errors.push("Cada transferencia necesita su código");
  if (mode === "MIXED" && rows.some((r) => r.amount && !Number.isFinite(parseAmount(r.amount))))
    errors.push("Hay montos inválidos");
  if (cashDue > 0 && (!Number.isFinite(receivedNum) || toCents(receivedNum) < toCents(cashDue)))
    errors.push(`El efectivo recibido debe ser al menos ${money(cashDue)}`);

  function setRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  /** Agregar monto a la calculadora */
  function addToCalculator(amount: number) {
    const newValue = calculatorValue + amount;
    setCalculatorValue(newValue);
    setReceived(newValue.toFixed(2));
  }

  /** Resetear calculadora */
  function resetCalculator() {
    setCalculatorValue(0);
    setReceivedTouched(false);
  }

  /** Establecer monto exacto en calculadora */
  function setExactAmount(amount: number) {
    setCalculatorValue(amount);
    setReceived(amount.toFixed(2));
  }

  /** Calcular el siguiente billete mayor más cercano */
  function roundUpToNextBill() {
    const target = cashDue > 0 ? cashDue : total;
    const nextBill = QUICK_AMOUNTS.find((a) => a.value >= target);
    if (nextBill) {
      setExactAmount(nextBill.value);
    }
  }

  /** En mixto, completa la fila de efectivo con lo que falte. */
  function fillCashRemainder() {
    setRows((prev) => {
      const nonCash = prev.filter((r) => r.method === "TRANSFER").reduce((s, r) => s + (parseAmount(r.amount) || 0), 0);
      const remaining = Math.max(0, round2(total - nonCash));
      const hasCash = prev.some((r) => r.method === "CASH");
      const next = hasCash
        ? prev.map((r) => (r.method === "CASH" ? { ...r, amount: remaining.toFixed(2) } : r))
        : [...prev, { method: "CASH" as const, amount: remaining.toFixed(2), reference: "" }];
      setReceivedTouched(false);
      return next;
    });
  }

  async function submit() {
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    setSaving(true);
    try {
      const paid = await ordersApi.pay(order.id, payments);
      toast.success(`Pedido #${paid.number} cobrado`, {
        description: change > 0 ? `Vuelto: ${money(change)}` : undefined,
        duration: change > 0 ? 10000 : 4000,
      });
      onPaid(paid);
      onOpenChange(false);
      // Recibo automático: el recibido/vuelto solo existen aquí (el backend no los guarda).
      onOrderPaidHere(paid, cashDue > 0 && Number.isFinite(receivedNum) ? { received: round2(receivedNum), change } : undefined);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const modeBtn = (m: PayMode, label: string, Icon: typeof Banknote) => (
    <Button type="button" variant={mode === m ? "default" : "outline"} onClick={() => {
        setMode(m);
        setReceivedTouched(false);
        setShowCalculator(false);
        setCalculatorValue(0);
      }} className="flex-1">
      <Icon /> {label}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Cobrar pedido #{order.number}</DialogTitle>
          <DialogDescription>
            {orderPlace(order)} · <CustomerName name={order.customerName} />
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="text-sm text-muted-foreground">Total a cobrar</p>
          <p className="text-3xl font-semibold tabular-nums">{money(total)}</p>
          <p className="text-xs text-muted-foreground">
            Subtotal {money(order.subtotal)} · IVA {money(order.tax)}
          </p>
        </div>

        <div className="flex gap-2">
          {modeBtn("CASH", "Efectivo", Banknote)}
          {modeBtn("TRANSFER", "Transferencia", Landmark)}
          {modeBtn("MIXED", "Mixto", Shuffle)}
        </div>

        {mode === "TRANSFER" && (
          <div className="space-y-1.5">
            <Label htmlFor="transferRef">Código de la transferencia</Label>
            <Input
              id="transferRef"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej. 123456789"
              autoFocus
              maxLength={100}
            />
          </div>
        )}

        {mode === "MIXED" && (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[130px_1fr_auto] items-start gap-2">
                <SimpleSelect
                  ariaLabel={`Método del pago ${i + 1}`}
                  value={r.method}
                  options={METHOD_OPTIONS}
                  onChange={(m) => setRow(i, { method: m })}
                />
                <div className="space-y-1.5">
                  <Input
                    aria-label={`Monto del pago ${i + 1}`}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={r.amount}
                    onChange={(e) => setRow(i, { amount: e.target.value })}
                  />
                  {r.method === "TRANSFER" && (
                    <Input
                      aria-label={`Código de la transferencia ${i + 1}`}
                      placeholder="Código de la transferencia"
                      value={r.reference}
                      onChange={(e) => setRow(i, { reference: e.target.value })}
                      maxLength={100}
                    />
                  )}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Quitar pago"
                  onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                  disabled={rows.length <= 1}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRows((prev) => [...prev, { method: "TRANSFER", amount: "", reference: "" }])}
              >
                <Plus /> Agregar pago
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={fillCashRemainder}>
                Completar con efectivo
              </Button>
            </div>
          </div>
        )}

        {cashDue > 0 && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cashReceived">Efectivo recibido</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cashReceived"
                      inputMode="decimal"
                      value={receivedValue}
                      onChange={(e) => {
                        setReceived(e.target.value);
                        const val = parseAmount(e.target.value);
                        if (Number.isFinite(val)) setCalculatorValue(val);
                      }}
                      onFocus={(e) => e.currentTarget.select()}
                      className="text-lg font-semibold"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => setShowCalculator(!showCalculator)}
                      title={showCalculator ? "Ocultar calculadora" : "Mostrar calculadora"}
                    >
                      <Calculator className="size-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">A cobrar: {money(cashDue)}</p>
                </div>
                <div className="flex flex-col items-end justify-center rounded-lg bg-background p-3">
                  <span className="text-sm text-muted-foreground">Cambio</span>
                  <span className={cn("text-3xl font-bold tabular-nums", change < 0 && "text-destructive")}>
                    {money(Math.max(0, change))}
                  </span>
                  {change < 0 && (
                    <Badge variant="destructive" className="mt-1">
                      Falta {money(Math.abs(change))}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Quick Amount Buttons */}
              {showCalculator && (
                <div className="mt-4 space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Calculadora rápida</Label>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={roundUpToNextBill}
                        title="Redondear al siguiente billete"
                      >
                        Redondear
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={resetCalculator}
                        title="Reiniciar"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Calculator Display */}
                  <div className="rounded-lg bg-primary/5 p-3 ring-1 ring-primary/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total acumulado:</span>
                      <span className="text-2xl font-bold tabular-nums">{money(calculatorValue)}</span>
                    </div>
                  </div>

                  {/* Bill Buttons Grid */}
                  <div className="grid grid-cols-4 gap-2">
                    {QUICK_AMOUNTS.map((amount) => (
                      <Button
                        key={amount.value}
                        type="button"
                        variant="outline"
                        onClick={() => addToCalculator(amount.value)}
                        className={cn(
                          "h-14 flex-col font-bold transition-all hover:scale-105",
                          amount.value >= 100 && "bg-success/5 hover:bg-success/10 border-success/30"
                        )}
                      >
                        <span className="text-lg">{amount.label}</span>
                        <span className="text-[10px] text-muted-foreground">+ Agregar</span>
                      </Button>
                    ))}
                  </div>

                  {/* Exact Amount Button */}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setExactAmount(cashDue)}
                    className="w-full"
                  >
                    <Calculator className="size-4" />
                    Monto exacto ({money(cashDue)})
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === "MIXED" && (
          <p className={cn("text-sm", diffCents === 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>
            Recibido: {money((mixedTransferCents + mixedCashGivenCents) / 100)} de {money(total)}
            {diffCents === 0 && mixedCashGivenCents / 100 > cashDue && ` · vuelto ${money(mixedCashGivenCents / 100 - cashDue)}`}
          </p>
        )}

        {errors.length > 0 && (
          <ul className="list-inside list-disc text-sm text-destructive" aria-live="polite">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}

        <DialogFooter sticky>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || errors.length > 0}>
            {saving ? "Cobrando…" : `Cobrar ${money(total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
