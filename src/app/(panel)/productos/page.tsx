"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader, SimpleSelect } from "@/components/common";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAsync } from "@/hooks/use-async";
import { errorMessage } from "@/lib/api/client";
import { productsApi } from "@/lib/api/products";
import type { Product, ProductInput } from "@/lib/api/types";
import { money, parseAmount, round2 } from "@/lib/format";

const AVAIL_FILTER = [
  { value: "ALL", label: "Todos" },
  { value: "YES", label: "Disponibles" },
  { value: "NO", label: "No disponibles" },
];

export default function ProductosPage() {
  const products = useAsync(() => productsApi.list(), []);
  const [avail, setAvail] = React.useState("ALL");
  const [dialog, setDialog] = React.useState<{ open: boolean; product?: Product }>({ open: false });
  const [toDelete, setToDelete] = React.useState<Product | null>(null);
  const [toggling, setToggling] = React.useState<string | null>(null);

  const list = React.useMemo(
    () =>
      (products.data ?? []).filter((p) => avail === "ALL" || (avail === "YES" ? p.available : !p.available)),
    [products.data, avail]
  );

  function replace(p: Product) {
    products.setData((prev) =>
      prev ? prev.map((x) => (x.id === p.id ? p : x)).sort((a, b) => a.name.localeCompare(b.name, "es")) : prev
    );
  }

  async function toggle(p: Product, field: "available" | "taxable", value: boolean) {
    setToggling(p.id + field);
    try {
      replace(await productsApi.update(p.id, { [field]: value }));
      toast.success(
        field === "available"
          ? `${p.name}: ${value ? "disponible" : "no disponible"}`
          : `${p.name}: ${value ? "grava IVA" : "no grava IVA"}`
      );
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setToggling(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Productos"
        description="Carta del restaurante. El administrador decide si cada producto grava IVA."
        actions={
          <Button onClick={() => setDialog({ open: true })}>
            <Plus /> Nuevo producto
          </Button>
        }
      />

      {products.loading && !products.data ? (
        <LoadingState rows={6} />
      ) : products.error && !products.data ? (
        <ErrorState message={products.error} onRetry={products.reload} />
      ) : !products.data?.length ? (
        <EmptyState
          title="No hay productos"
          description="Crea el primer producto de la carta."
          action={
            <Button onClick={() => setDialog({ open: true })}>
              <Plus /> Nuevo producto
            </Button>
          }
        />
      ) : (
        <DataTable
          data={list}
          rowKey={(p) => p.id}
          rowClassName={(p) => (p.available ? undefined : "opacity-60")}
          searchText={(p) => [p.name, p.description, money(p.price)]}
          searchPlaceholder="Buscar producto por nombre o descripción…"
          emptyMessage="No hay productos con ese filtro de disponibilidad."
          toolbar={
            <SimpleSelect ariaLabel="Disponibilidad" className="w-44" value={avail} options={AVAIL_FILTER} onChange={setAvail} />
          }
          columns={[
            {
              header: "Producto",
              className: "max-w-xs whitespace-normal",
              cell: (p) => (
                <>
                  <span className="font-medium">{p.name}</span>
                  {p.description && <span className="block text-xs text-muted-foreground">{p.description}</span>}
                </>
              ),
            },
            { header: "Precio", align: "right", className: "tabular-nums", cell: (p) => money(p.price) },
            {
              header: "Grava IVA",
              align: "center",
              cell: (p) => (
                <Switch
                  aria-label={`Grava IVA ${p.name}`}
                  checked={p.taxable}
                  disabled={toggling === p.id + "taxable"}
                  onCheckedChange={(v) => toggle(p, "taxable", v)}
                />
              ),
            },
            {
              header: "Disponible",
              align: "center",
              cell: (p) => (
                <Switch
                  aria-label={`Disponible ${p.name}`}
                  checked={p.available}
                  disabled={toggling === p.id + "available"}
                  onCheckedChange={(v) => toggle(p, "available", v)}
                />
              ),
            },
            {
              header: "Acciones",
              align: "right",
              className: "w-24",
              cell: (p) => (
                <>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Editar ${p.name}`}
                    onClick={() => setDialog({ open: true, product: p })}
                  >
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${p.name}`} onClick={() => setToDelete(p)}>
                    <Trash2 />
                  </Button>
                </>
              ),
            },
          ]}
        />
      )}

      <ProductDialog
        state={dialog}
        onClose={() => setDialog({ open: false })}
        onSaved={(p, created) => {
          if (created)
            products.setData((prev) => [...(prev ?? []), p].sort((a, b) => a.name.localeCompare(b.name, "es")));
          else replace(p);
        }}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`¿Eliminar ${toDelete?.name ?? ""}?`}
        description="Si el producto ya tiene ventas no se puede eliminar; en ese caso márcalo como no disponible."
        confirmLabel="Eliminar"
        destructive
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await productsApi.remove(toDelete.id);
            products.setData((prev) => prev?.filter((x) => x.id !== toDelete.id));
            toast.success("Producto eliminado");
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }}
      />
    </>
  );
}

function ProductDialog({
  state,
  onClose,
  onSaved,
}: {
  state: { open: boolean; product?: Product };
  onClose: () => void;
  onSaved: (p: Product, created: boolean) => void;
}) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [taxable, setTaxable] = React.useState(true);
  const [available, setAvailable] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!state.open) return;
    const p = state.product;
    setName(p?.name ?? "");
    setDescription(p?.description ?? "");
    setPrice(p ? p.price.toFixed(2) : "");
    setTaxable(p?.taxable ?? true);
    setAvailable(p?.available ?? true);
  }, [state.open, state.product]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const priceNum = parseAmount(price);
    if (!name.trim()) return toast.error("El nombre es obligatorio");
    if (!Number.isFinite(priceNum) || priceNum < 0) return toast.error("Ingresa un precio válido");
    if ((price.trim().split(/[.,]/)[1]?.length ?? 0) > 2)
      return toast.error("El precio admite máximo 2 decimales");
    const body: ProductInput = {
      name: name.trim(),
      price: round2(priceNum),
      taxable,
      available,
      ...(description.trim() ? { description: description.trim() } : {}),
    };
    setSaving(true);
    try {
      const saved = state.product
        ? await productsApi.update(state.product.id, {
            ...body,
            // al editar, enviar descripción vacía para poder borrarla
            description: description.trim(),
          })
        : await productsApi.create(body);
      onSaved(saved, !state.product);
      toast.success(state.product ? "Producto actualizado" : "Producto creado");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent size="md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{state.product ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="pName">Nombre</Label>
            <Input id="pName" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pDesc">Descripción (opcional)</Label>
            <Textarea id="pDesc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pPrice">Precio (USD)</Label>
            <Input
              id="pPrice"
              inputMode="decimal"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onBlur={() => {
                const n = parseAmount(price);
                if (Number.isFinite(n) && n >= 0) setPrice(round2(n).toFixed(2));
              }}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="pTaxable">Grava IVA</Label>
              <p className="text-xs text-muted-foreground">Si se aplica IVA a este producto.</p>
            </div>
            <Switch id="pTaxable" checked={taxable} onCheckedChange={setTaxable} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="pAvailable">Disponible</Label>
              <p className="text-xs text-muted-foreground">Los no disponibles no aparecen al tomar pedidos.</p>
            </div>
            <Switch id="pAvailable" checked={available} onCheckedChange={setAvailable} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
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
