"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  ConfirmDialog,
  CustomerName,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SimpleSelect,
} from "@/components/common";
import { DataTable } from "@/components/data-table";
import { TableMap, TableMapLegend, applyTableUpdate } from "@/components/table-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAsync } from "@/hooks/use-async";
import { useFallbackPolling, useRealtimeEvent } from "@/hooks/use-realtime";
import { areasApi } from "@/lib/api/areas";
import { errorMessage } from "@/lib/api/client";
import { tablesApi } from "@/lib/api/tables";
import type { Area, Table as TableT, TableStatus } from "@/lib/api/types";
import { TABLE_STATUS_LABEL, fmtDate, money } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<TableStatus, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  OCCUPIED: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
};

export default function MesasPage() {
  const areas = useAsync(() => areasApi.list(), []);
  const tables = useAsync(() => tablesApi.list(), []);
  const map = useAsync(() => tablesApi.map(), []);

  const [areaFilter, setAreaFilter] = React.useState("ALL");
  const [areaDialog, setAreaDialog] = React.useState<{ open: boolean; area?: Area }>({ open: false });
  const [tableDialog, setTableDialog] = React.useState<{ open: boolean; table?: TableT }>({ open: false });
  const [deleteArea, setDeleteArea] = React.useState<Area | null>(null);
  const [deleteTable, setDeleteTable] = React.useState<TableT | null>(null);

  const reloadAll = React.useCallback(() => {
    void areas.reload();
    void tables.reload();
    void map.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRealtimeEvent("table.updated", (t) => {
    tables.setData((prev) => (prev ? prev.map((x) => (x.id === t.id ? t : x)) : prev));
    map.setData((prev) => (prev ? applyTableUpdate(prev, t) : prev));
  });
  useFallbackPolling(() => {
    void tables.reload();
    void map.reload();
  });

  const areaOptions = (areas.data ?? []).map((a) => ({ value: a.id, label: a.name }));
  const visibleTables = (tables.data ?? []).filter((t) => areaFilter === "ALL" || t.areaId === areaFilter);

  return (
    <>
      <PageHeader
        title="Mesas y áreas"
        description="Estructura del local: áreas (salón, terraza…) y sus mesas."
        actions={
          <>
            <Button variant="outline" onClick={() => setAreaDialog({ open: true })}>
              <Plus /> Nueva área
            </Button>
            <Button onClick={() => setTableDialog({ open: true })} disabled={!areas.data?.length}>
              <Plus /> Nueva mesa
            </Button>
          </>
        }
      />

      <Tabs defaultValue="mapa">
        <TabsList>
          <TabsTrigger value="mapa">Mapa</TabsTrigger>
          <TabsTrigger value="mesas">Mesas</TabsTrigger>
          <TabsTrigger value="areas">Áreas</TabsTrigger>
        </TabsList>

        <TabsContent value="mapa" className="pt-3">
          <Card>
            <CardHeader>
              <TableMapLegend />
              <p className="text-sm text-muted-foreground">
                El estado lo maneja el pedido: la mesa queda ocupada al abrir un pedido y libre al cobrarlo.
              </p>
            </CardHeader>
            <CardContent>
              {map.loading && !map.data ? (
                <LoadingState rows={3} />
              ) : map.error && !map.data ? (
                <ErrorState message={map.error} onRetry={map.reload} />
              ) : (
                <TableMap areas={map.data ?? []} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mesas" className="space-y-3 pt-3">
          {tables.loading && !tables.data ? (
            <LoadingState />
          ) : tables.error && !tables.data ? (
            <ErrorState message={tables.error} onRetry={tables.reload} />
          ) : !tables.data?.length ? (
            <EmptyState
              title="No hay mesas"
              description={areas.data?.length ? "Crea la primera mesa." : "Primero crea un área."}
              action={
                areas.data?.length ? (
                  <Button onClick={() => setTableDialog({ open: true })}>
                    <Plus /> Nueva mesa
                  </Button>
                ) : (
                  <Button onClick={() => setAreaDialog({ open: true })}>
                    <Plus /> Nueva área
                  </Button>
                )
              }
            />
          ) : (
            <DataTable
              data={visibleTables}
              rowKey={(t) => t.id}
              searchText={(t) => [
                t.name,
                t.areaName,
                t.seats,
                TABLE_STATUS_LABEL[t.status],
                t.activeOrder?.customerName,
                t.activeOrder ? `#${t.activeOrder.number}` : null,
                t.activeOrder ? money(t.activeOrder.total) : null,
              ]}
              searchPlaceholder="Buscar mesa, área, estado o cliente…"
              emptyMessage="No hay mesas en esta área."
              toolbar={
                <SimpleSelect
                  ariaLabel="Filtrar por área"
                  className="w-56"
                  value={areaFilter}
                  options={[{ value: "ALL", label: "Todas las áreas" }, ...areaOptions]}
                  onChange={setAreaFilter}
                />
              }
              columns={[
                { header: "Mesa", className: "font-medium", cell: (t) => t.name },
                { header: "Área", cell: (t) => t.areaName },
                { header: "Puestos", cell: (t) => t.seats ?? "—" },
                {
                  header: "Estado",
                  cell: (t) => (
                    <Badge variant="secondary" className={cn("border-transparent", STATUS_BADGE[t.status])}>
                      {TABLE_STATUS_LABEL[t.status]}
                    </Badge>
                  ),
                },
                {
                  header: "Pedido abierto",
                  cell: (t) =>
                    t.activeOrder ? (
                      <span className="flex min-w-0 flex-col">
                        <CustomerName name={t.activeOrder.customerName} className="font-medium" />
                        <span className="text-xs text-muted-foreground tabular-nums">
                          #{t.activeOrder.number} · {money(t.activeOrder.total)}
                        </span>
                      </span>
                    ) : (
                      "—"
                    ),
                },
                {
                  header: null,
                  className: "w-12",
                  cell: (t) => (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${t.name}`}>
                            <MoreHorizontal />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTableDialog({ open: true, table: t })}>
                          <Pencil /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleteTable(t)}>
                          <Trash2 /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ),
                },
              ]}
            />
          )}
        </TabsContent>

        <TabsContent value="areas" className="pt-3">
          {areas.loading && !areas.data ? (
            <LoadingState />
          ) : areas.error && !areas.data ? (
            <ErrorState message={areas.error} onRetry={areas.reload} />
          ) : !areas.data?.length ? (
            <EmptyState
              title="No hay áreas"
              description="Crea áreas como Salón, Terraza o Barra."
              action={
                <Button onClick={() => setAreaDialog({ open: true })}>
                  <Plus /> Nueva área
                </Button>
              }
            />
          ) : (
            <DataTable
              data={areas.data}
              rowKey={(a) => a.id}
              searchText={(a) => [a.name, fmtDate(a.createdAt)]}
              searchPlaceholder="Buscar área…"
              columns={[
                { header: "Área", className: "font-medium", cell: (a) => a.name },
                { header: "Mesas", cell: (a) => a.tablesCount },
                { header: "Creada", cell: (a) => fmtDate(a.createdAt) },
                {
                  header: "Acciones",
                  align: "right",
                  className: "w-28",
                  cell: (a) => (
                    <>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Editar ${a.name}`}
                        onClick={() => setAreaDialog({ open: true, area: a })}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Eliminar ${a.name}`}
                        onClick={() => setDeleteArea(a)}
                      >
                        <Trash2 />
                      </Button>
                    </>
                  ),
                },
              ]}
            />
          )}
        </TabsContent>
      </Tabs>

      <AreaDialog
        state={areaDialog}
        onClose={() => setAreaDialog({ open: false })}
        onSaved={reloadAll}
      />
      <TableDialog
        state={tableDialog}
        areaOptions={areaOptions}
        defaultAreaId={areaFilter !== "ALL" ? areaFilter : areaOptions[0]?.value}
        onClose={() => setTableDialog({ open: false })}
        onSaved={reloadAll}
      />
      <ConfirmDialog
        open={!!deleteArea}
        onOpenChange={(o) => !o && setDeleteArea(null)}
        title={`¿Eliminar el área ${deleteArea?.name ?? ""}?`}
        description="Solo se puede eliminar un área sin mesas."
        confirmLabel="Eliminar"
        destructive
        onConfirm={async () => {
          if (!deleteArea) return;
          try {
            await areasApi.remove(deleteArea.id);
            toast.success("Área eliminada");
            reloadAll();
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }}
      />
      <ConfirmDialog
        open={!!deleteTable}
        onOpenChange={(o) => !o && setDeleteTable(null)}
        title={`¿Eliminar la mesa ${deleteTable?.name ?? ""}?`}
        description="No se puede eliminar una mesa con un pedido abierto."
        confirmLabel="Eliminar"
        destructive
        onConfirm={async () => {
          if (!deleteTable) return;
          try {
            await tablesApi.remove(deleteTable.id);
            toast.success("Mesa eliminada");
            reloadAll();
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }}
      />
    </>
  );
}

function AreaDialog({
  state,
  onClose,
  onSaved,
}: {
  state: { open: boolean; area?: Area };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    if (state.open) setName(state.area?.name ?? "");
  }, [state.open, state.area]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("El nombre es obligatorio");
    setSaving(true);
    try {
      if (state.area) await areasApi.update(state.area.id, name.trim());
      else await areasApi.create(name.trim());
      toast.success(state.area ? "Área actualizada" : "Área creada");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent size="sm">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{state.area ? "Editar área" : "Nueva área"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="areaName">Nombre</Label>
            <Input id="areaName" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
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

function TableDialog({
  state,
  areaOptions,
  defaultAreaId,
  onClose,
  onSaved,
}: {
  state: { open: boolean; table?: TableT };
  areaOptions: { value: string; label: string }[];
  defaultAreaId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [areaId, setAreaId] = React.useState("");
  const [seats, setSeats] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!state.open) return;
    setName(state.table?.name ?? "");
    setAreaId(state.table?.areaId ?? defaultAreaId ?? "");
    setSeats(state.table?.seats ? String(state.table.seats) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, state.table]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("El nombre es obligatorio");
    if (!areaId) return toast.error("Elige un área");
    const seatsNum = seats.trim() ? parseInt(seats, 10) : undefined;
    if (seatsNum !== undefined && (!Number.isInteger(seatsNum) || seatsNum < 1))
      return toast.error("Puestos debe ser un entero mayor a 0");
    setSaving(true);
    try {
      const body = { name: name.trim(), areaId, ...(seatsNum !== undefined ? { seats: seatsNum } : {}) };
      if (state.table) await tablesApi.update(state.table.id, body);
      else await tablesApi.create(body);
      toast.success(state.table ? "Mesa actualizada" : "Mesa creada");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{state.table ? "Editar mesa" : "Nueva mesa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="tableName">Nombre</Label>
            <Input
              id="tableName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Mesa 1"
              maxLength={40}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tableArea">Área</Label>
            <SimpleSelect id="tableArea" value={areaId} options={areaOptions} onChange={setAreaId} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tableSeats">Puestos (opcional)</Label>
            <Input
              id="tableSeats"
              inputMode="numeric"
              value={seats}
              onChange={(e) => setSeats(e.target.value.replace(/\D/g, ""))}
            />
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
