"use client";

import * as React from "react";
import { Save } from "lucide-react";
import { toast } from "@/lib/toast";
import { ErrorState, LoadingState, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAsync } from "@/hooks/use-async";
import { errorMessage } from "@/lib/api/client";
import { restaurantApi } from "@/lib/api/restaurant";
import type { Restaurant } from "@/lib/api/types";
import { parseAmount } from "@/lib/format";
import { invalidateRestaurantCache } from "@/lib/printing/auto";

export default function ConfiguracionPage() {
  const restaurant = useAsync(() => restaurantApi.get(), []);
  return (
    <>
      <PageHeader title="Configuración" description="Datos del restaurante que aparecen en reportes y tickets." />
      {restaurant.loading && !restaurant.data ? (
        <LoadingState rows={6} className="max-w-xl" />
      ) : restaurant.error && !restaurant.data ? (
        <ErrorState message={restaurant.error} onRetry={restaurant.reload} />
      ) : restaurant.data ? (
        <RestaurantForm initial={restaurant.data} onSaved={(r) => restaurant.setData(r)} />
      ) : null}
    </>
  );
}

function RestaurantForm({ initial, onSaved }: { initial: Restaurant; onSaved: (r: Restaurant) => void }) {
  const [name, setName] = React.useState(initial.name);
  const [ruc, setRuc] = React.useState(initial.ruc ?? "");
  const [address, setAddress] = React.useState(initial.address ?? "");
  const [phone, setPhone] = React.useState(initial.phone ?? "");
  const [taxRate, setTaxRate] = React.useState(String(initial.taxRate));
  const [pricesIncludeTax, setPricesIncludeTax] = React.useState(initial.pricesIncludeTax);
  const [saving, setSaving] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const rate = parseAmount(taxRate);
    if (!name.trim()) return toast.error("El nombre es obligatorio");
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) return toast.error("La tasa de IVA debe estar entre 0 y 100");
    if (ruc.trim() && !/^\d{13}$/.test(ruc.trim())) return toast.error("El RUC debe tener 13 dígitos");
    setSaving(true);
    try {
      const saved = await restaurantApi.update({
        name: name.trim(),
        ruc: ruc.trim(),
        address: address.trim(),
        phone: phone.trim(),
        taxRate: rate,
        pricesIncludeTax,
      });
      invalidateRestaurantCache();
      onSaved(saved);
      toast.success("Configuración guardada");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid max-w-xl gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Datos del restaurante</CardTitle>
          <CardDescription>Se muestran en el encabezado del cierre de caja.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="rName">Nombre</Label>
            <Input id="rName" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rRuc">RUC</Label>
            <Input
              id="rRuc"
              inputMode="numeric"
              value={ruc}
              onChange={(e) => setRuc(e.target.value.replace(/\D/g, "").slice(0, 13))}
              placeholder="13 dígitos"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rAddress">Dirección</Label>
            <Input id="rAddress" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rPhone">Teléfono</Label>
            <Input id="rPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Impuestos</CardTitle>
          <CardDescription>Se aplican al crear o modificar pedidos (no cambian pedidos ya registrados).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="rTax">Tasa de IVA (%)</Label>
            <Input
              id="rTax"
              inputMode="decimal"
              className="w-32"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <Label htmlFor="rIncludes">Los precios incluyen IVA</Label>
              <p className="text-xs text-muted-foreground">
                Activado: el precio del producto es el precio final. Desactivado: el IVA se suma al precio.
              </p>
            </div>
            <Switch id="rIncludes" checked={pricesIncludeTax} onCheckedChange={setPricesIncludeTax} />
          </div>
        </CardContent>
      </Card>
      <div>
        <Button type="submit" disabled={saving}>
          <Save /> {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
