"use client";

import * as React from "react";
import { Clock, Users } from "lucide-react";
import { CustomerName } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Table, TableMapArea, TableStatus } from "@/lib/api/types";
import { TABLE_STATUS_LABEL, money } from "@/lib/format";
import { cn } from "cn";

const STATUS_STYLE: Record<TableStatus, string> = {
  AVAILABLE:
    "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
  OCCUPIED:
    "border-amber-400 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-100",
};

const DOT: Record<TableStatus, string> = {
  AVAILABLE: "bg-emerald-500",
  OCCUPIED: "bg-amber-500",
};

const STATUS_BADGE: Record<TableStatus, "status-available" | "status-occupied"> = {
  AVAILABLE: "status-available",
  OCCUPIED: "status-occupied",
};

export function TableMapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      {(Object.keys(TABLE_STATUS_LABEL) as TableStatus[]).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-full", DOT[s])} />
          {TABLE_STATUS_LABEL[s]}
        </span>
      ))}
    </div>
  );
}

export function TableMap({
  areas,
  onSelect,
  selectedId,
  compact,
  disableStatuses,
}: {
  areas: TableMapArea[];
  onSelect?: (table: Table) => void;
  selectedId?: string | null;
  compact?: boolean;
  disableStatuses?: TableStatus[];
}) {
  const [activeArea, setActiveArea] = React.useState(areas[0]?.id || "");

  if (areas.length === 0 || areas.every((a) => a.tables.length === 0)) {
    return <p className="text-sm text-muted-foreground">No hay mesas registradas. Créalas en el módulo Mesas.</p>;
  }

  const hasMultipleAreas = areas.length > 1;

  if (!hasMultipleAreas) {
    return <TableAreaGrid area={areas[0]} onSelect={onSelect} selectedId={selectedId} compact={compact} disableStatuses={disableStatuses} />;
  }

  return (
    <Tabs value={activeArea} onValueChange={setActiveArea} className="w-full">
      <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(areas.length, 5)}, 1fr)` }}>
        {areas.map((area) => {
          const occupiedCount = area.tables.filter((t) => t.status === "OCCUPIED").length;
          return (
            <TabsTrigger key={area.id} value={area.id} className="relative">
              <span>{area.name}</span>
              {occupiedCount > 0 && (
                <Badge variant="default" className="absolute -right-1 -top-1 size-5 flex items-center justify-center rounded-full p-0 text-xs">
                  {occupiedCount}
                </Badge>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {areas.map((area) => (
        <TabsContent key={area.id} value={area.id} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold">{area.name}</h3>
              <p className="text-sm text-muted-foreground">
                {area.tables.length} mesas · {area.tables.filter((t) => t.status === "OCCUPIED").length} ocupadas
              </p>
            </div>
          </div>
          <TableAreaGrid area={area} onSelect={onSelect} selectedId={selectedId} compact={compact} disableStatuses={disableStatuses} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function TableAreaGrid({
  area,
  onSelect,
  selectedId,
  compact,
  disableStatuses,
}: {
  area: TableMapArea;
  onSelect?: (table: Table) => void;
  selectedId?: string | null;
  compact?: boolean;
  disableStatuses?: TableStatus[];
}) {
  return (
    <div
      className={cn(
        "grid gap-2",
        compact ? "grid-cols-[repeat(auto-fill,minmax(92px,1fr))]" : "grid-cols-[repeat(auto-fill,minmax(130px,1fr))]"
      )}
    >
      {area.tables.map((t) => {
        const disabled = disableStatuses?.includes(t.status);
        const timeElapsed = t.activeOrder ? Math.floor((Date.now() - new Date(t.activeOrder.createdAt).getTime()) / 1000 / 60) : 0;

        return (
          <button
            key={t.id}
            type="button"
            disabled={disabled || !onSelect}
            onClick={() => onSelect?.(t)}
            className={cn(
              "group flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-all disabled:cursor-default",
              STATUS_STYLE[t.status],
              disabled && "opacity-45",
              selectedId === t.id && "ring-3 ring-primary/60 shadow-lg",
              !disabled && !selectedId && "hover:shadow-md hover:-translate-y-0.5"
            )}
            aria-pressed={selectedId === t.id}
            aria-label={`Mesa ${t.name}, ${TABLE_STATUS_LABEL[t.status]}${
              t.activeOrder ? `, ${t.activeOrder.customerName?.trim() || "Sin nombre"}` : ""
            }`}
          >
            <div className="flex w-full items-center justify-between gap-1">
              <span className="font-bold text-lg">{t.name}</span>
              {t.seats ? (
                <span className="inline-flex items-center gap-0.5 text-xs opacity-70">
                  <Users className="size-3" />
                  {t.seats}
                </span>
              ) : null}
            </div>

            <Badge variant={STATUS_BADGE[t.status]} className="text-xs">
              {TABLE_STATUS_LABEL[t.status]}
            </Badge>

            {t.activeOrder && (
              <div className="w-full min-w-0 space-y-0.5 pt-1">
                <CustomerName
                  name={t.activeOrder.customerName}
                  className={cn("block font-semibold leading-tight", compact ? "text-xs" : "text-sm")}
                />
                <div className="flex items-center justify-between gap-1 text-xs tabular-nums">
                  <span className="opacity-70">#{t.activeOrder.number}</span>
                  <span className="font-semibold">{money(t.activeOrder.total)}</span>
                </div>
                {!compact && (
                  <div className="flex items-center gap-1 text-xs opacity-70">
                    <Clock className="size-3" />
                    {timeElapsed} min · {t.activeOrder.itemsCount} prod.
                  </div>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Aplica un `table.updated` al mapa local (o lo agrega si la mesa no estaba). */
export function applyTableUpdate(areas: TableMapArea[], table: Table): TableMapArea[] {
  let found = false;
  const next = areas.map((a) => {
    const idx = a.tables.findIndex((t) => t.id === table.id);
    if (idx === -1) return a;
    found = true;
    if (a.id !== table.areaId) return { ...a, tables: a.tables.filter((t) => t.id !== table.id) };
    const tables = a.tables.slice();
    tables[idx] = table;
    return { ...a, tables };
  });
  if (found && next.some((a) => a.tables.some((t) => t.id === table.id))) return next;
  return next.map((a) => (a.id === table.areaId ? { ...a, tables: [...a.tables, table] } : a));
}
