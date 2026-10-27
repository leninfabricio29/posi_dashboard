"use client";

import * as React from "react";
import { Calculator, Minus, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/api/client";
import { cashApi } from "@/lib/api/cash-register";
import type { CashRegisterSummary } from "@/lib/api/types";
import { money, parseAmount, round2, toCents } from "@/lib/format";
import { cn } from "cn";

const BILLS = [
  { value: 100, label: "$100", color: "bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-700" },
  { value: 50, label: "$50", color: "bg-orange-100 dark:bg-orange-950 border-orange-300 dark:border-orange-700" },
  { value: 20, label: "$20", color: "bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-700" },
  { value: 10, label: "$10", color: "bg-purple-100 dark:bg-purple-950 border-purple-300 dark:border-purple-700" },
  { value: 5, label: "$5", color: "bg-pink-100 dark:bg-pink-950 border-pink-300 dark:border-pink-700" },
  { value: 1, label: "$1", color: "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600" },
];

const COINS = [
  { value: 1, label: "$1" },
  { value: 0.5, label: "50¢" },
  { value: 0.25, label: "25¢" },
  { value: 0.1, label: "10¢" },
  { value: 0.05, label: "5¢" },
  { value: 0.01, label: "1¢" },
];

type Counts = Record<string, number>;

function denomKey(kind: "b" | "c", v: number) {
  return `${kind}${v}`;
}

// Debe vivir fuera de CloseRegisterDialog: si se define dentro, React lo recrea en cada render
// y el input pierde el foco tras cada dígito.
function DenomCounter({
  label,
  color,
  value,
  qty,
  onStep,
  onSet,
}: {
  label: string;
  color?: string;
  value: number;
  qty: number;
  onStep: (delta: number) => void;
  onSet: (qty: number) => void;
}) {
  const total = qty * value;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border-2 p-3 transition-all",
        color || "bg-muted/30 border-border",
        qty > 0 && "ring-2 ring-primary/20"
      )}
    >
      <div className="flex-1">
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">
          {qty > 0 ? `${qty} × ${money(value)} = ` : ""}
          <span className={cn("font-semibold", qty > 0 && "text-foreground")}>{money(total)}</span>
        </p>
      </div>
      <div className="flex items-center gap-1">
       
        <Input
          className="h-9 w-16 text-center font-bold"
          inputMode="numeric"
          aria-label={`Cantidad de ${label}`}
          value={qty || ""}
          placeholder="0"
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const val = parseInt(e.target.value.replace(/\D/g, ""), 10);
            onSet(Number.isFinite(val) ? val : 0);
          }}
        />
       
      </div>
    </div>
  );
}

export function CloseRegisterDialog({
  register,
  open,
  onOpenChange,
  onClosed,
}: {
  register: CashRegisterSummary;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onClosed: (summary: CashRegisterSummary) => void;
}) {
  const [useDenoms, setUseDenoms] = React.useState(true); // True por defecto
  const [counts, setCounts] = React.useState<Counts>({});
  const [counted, setCounted] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setUseDenoms(true);
    setCounts({});
    setCounted("");
    setNotes("");
  }, [open]);

  const denomTotal = React.useMemo(() => {
    let cents = 0;
    for (const { value } of BILLS) {
      cents += (counts[denomKey("b", value)] || 0) * Math.round(value * 100);
    }
    for (const { value } of COINS) {
      cents += (counts[denomKey("c", value)] || 0) * Math.round(value * 100);
    }
    return cents / 100;
  }, [counts]);

  function updateCount(key: string, delta: number) {
    setCounts((prev) => {
      const current = prev[key] || 0;
      const newVal = Math.max(0, current + delta);
      return { ...prev, [key]: newVal };
    });
  }

  function setCount(key: string, value: number) {
    setCounts((prev) => ({ ...prev, [key]: Math.max(0, value) }));
  }

  function resetCounts() {
    setCounts({});
  }

  const countedNum = useDenoms ? denomTotal : parseAmount(counted);
  const valid = Number.isFinite(countedNum) && countedNum >= 0 && (useDenoms || counted.trim() !== "");
  const difference = valid ? (toCents(countedNum) - toCents(register.expectedCash)) / 100 : null;

  async function submit() {
    if (!valid) return toast.error("Ingresa el efectivo contado");
    setSaving(true);
    try {
      const closed = await cashApi.close(round2(countedNum), notes.trim() || undefined);
      toast.success("Caja cerrada");
      onClosed(closed);
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function counterProps(kind: "b" | "c", value: number) {
    const key = denomKey(kind, value);
    return {
      qty: counts[key] || 0,
      value,
      onStep: (delta: number) => updateCount(key, delta),
      onSet: (qty: number) => setCount(key, qty),
    };
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Cerrar caja</DialogTitle>
          <DialogDescription>Cuenta el efectivo físico de la caja. Las transferencias no se cuentan.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Expected Cash Summary */}
          <div className="rounded-lg bg-primary/5 p-4 ring-1 ring-primary/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Efectivo esperado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Inicial {money(register.initialAmount)} + ventas {money(register.sales.cash)} + ingresos{" "}
                  {money(register.incomes)} − egresos {money(register.expenses)}
                </p>
              </div>
              <p className="text-3xl font-bold tabular-nums">{money(register.expectedCash)}</p>
            </div>
          </div>

          {/* Count Method Toggle */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <Calculator className="size-4 text-muted-foreground" />
              <Label htmlFor="useDenoms" className="cursor-pointer">
                Contar por denominaciones
              </Label>
            </div>
            <Switch id="useDenoms" checked={useDenoms} onCheckedChange={setUseDenoms} />
          </div>

          {useDenoms ? (
            <>
              {/* Denomination Counter */}
              <div className="space-y-4">
                {/* Running Total Display */}
                <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border-2 border-primary bg-background p-4 shadow-sm">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total contado</p>
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const pieces = Object.values(counts).reduce((sum, qty) => sum + qty, 0);
                        return `${pieces} ${pieces === 1 ? "pieza" : "piezas"} contadas`;
                      })()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={resetCounts}
                      disabled={Object.keys(counts).length === 0}
                    >
                      <RotateCcw className="size-4" />
                      Reiniciar
                    </Button>
                    <p className="text-4xl font-bold tabular-nums">{money(denomTotal)}</p>
                  </div>
                </div>

                {/* Bills */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold uppercase text-muted-foreground">Billetes</h4>
                    <span className="text-sm text-muted-foreground">
                      {money(
                        BILLS.reduce((sum, { value }) => sum + (counts[denomKey("b", value)] || 0) * value, 0)
                      )}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {BILLS.map((bill) => (
                      <DenomCounter key={bill.value} label={bill.label} color={bill.color} {...counterProps("b", bill.value)} />
                    ))}
                  </div>
                </div>

                {/* Coins */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold uppercase text-muted-foreground">Monedas</h4>
                    <span className="text-sm text-muted-foreground">
                      {money(
                        COINS.reduce((sum, { value }) => sum + (counts[denomKey("c", value)] || 0) * value, 0)
                      )}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {COINS.map((coin) => (
                      <DenomCounter key={coin.value} label={coin.label} {...counterProps("c", coin.value)} />
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="countedCash">Efectivo contado (USD)</Label>
              <Input
                id="countedCash"
                inputMode="decimal"
                placeholder="0.00"
                value={counted}
                onChange={(e) => setCounted(e.target.value)}
                autoFocus
                className="text-lg font-semibold"
              />
            </div>
          )}

          {/* Difference Summary */}
          <div className="grid grid-cols-2 gap-4 rounded-lg border-2 p-4">
            <div>
              <p className="text-sm text-muted-foreground">Contado</p>
              <p className="text-2xl font-bold tabular-nums">{valid ? money(countedNum) : "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Diferencia</p>
              <div className="flex items-center justify-end gap-2">
                <p
                  className={cn(
                    "text-2xl font-bold tabular-nums",
                    difference !== null && difference < 0 && "text-destructive",
                    difference !== null && difference > 0 && "text-success"
                  )}
                >
                  {difference === null ? "—" : `${difference > 0 ? "+" : ""}${money(difference)}`}
                </p>
                {difference !== null && difference !== 0 && (
                  <Badge variant={difference < 0 ? "destructive" : "success"}>
                    {difference < 0 ? "Faltante" : "Sobrante"}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="closeNotes">Notas de cierre (opcional)</Label>
            <Textarea
              id="closeNotes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={300}
              placeholder="Ej: Turno completo sin novedades"
            />
          </div>
        </div>

        <DialogFooter sticky>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || !valid} size="lg">
            {saving ? "Cerrando…" : "Cerrar caja "}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
