"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money } from "@/lib/format";
import { CUSTOMER_NAME_MAX } from "@/lib/orders";

/**
 * Paso final al crear un pedido: pide el nombre del cliente (obligatorio).
 * Solo al confirmar se llama a `onConfirm` con el nombre recortado.
 */
export function CustomerNameDialog({
  open,
  onOpenChange,
  place,
  itemsCount,
  total,
  saving,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mesa elegida o "Para llevar". */
  place: string;
  itemsCount: number;
  total: number;
  saving: boolean;
  onConfirm: (customerName: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setError(null);
  }, [open]);

  function confirm(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Ingresa el nombre del cliente");
      return;
    }
    onConfirm(trimmed.slice(0, CUSTOMER_NAME_MAX));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent size="sm">
        <form onSubmit={confirm} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>¿A nombre de quién?</DialogTitle>
            <DialogDescription>
              {place} · {itemsCount} {itemsCount === 1 ? "producto" : "productos"} · {money(total)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="orderCustomerName">Nombre del cliente</Label>
            <Input
              id="orderCustomerName"
              autoFocus
              required
              autoComplete="off"
              maxLength={CUSTOMER_NAME_MAX}
              placeholder="Ej. Juan Pérez"
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
              {saving ? "Guardando…" : "Guardar pedido"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
