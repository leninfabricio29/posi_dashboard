"use client";

import * as React from "react";
import { AlertTriangle, Inbox, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRealtime } from "@/hooks/use-realtime";
import { ORDER_STATUS_CLASS, ORDER_STATUS_LABEL } from "@/lib/format";
import type { OrderStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function LoadingState({ rows = 5, className, variant = "default" }: { 
  rows?: number; 
  className?: string;
  variant?: "default" | "list" | "card" | "table";
}) {
  if (variant === "list") {
    return (
      <div className={cn("divide-y rounded-lg border", className)} aria-busy="true" aria-label="Cargando">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 p-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Cargando">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={cn("rounded-xl border overflow-hidden", className)} aria-busy="true" aria-label="Cargando">
        <div className="bg-muted/50 border-b p-3">
          <div className="flex gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={`header-${i}`} className="h-4 flex-1" />
            ))}
          </div>
        </div>
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-3">
              <div className="flex gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={`cell-${i}-${j}`} className="h-4 flex-1" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("space-y-2", className)} aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
    >
      <AlertTriangle className="size-8 text-destructive" />
      <div>
        <p className="font-medium">No se pudo cargar la información</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw /> Reintentar
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <div className="text-muted-foreground">{icon ?? <Inbox className="size-8" />}</div>
      <div>
        <p className="font-medium">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = React.useState(false);
  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Procesando…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface Option<V extends string = string> {
  value: V;
  label: string;
}

/** Select simple sobre el Select de shadcn (Base UI) que muestra la etiqueta del valor elegido. */
export function SimpleSelect<V extends string>({
  id,
  value,
  onChange,
  options,
  placeholder = "Seleccionar…",
  className,
  disabled,
  ariaLabel,
}: {
  id?: string;
  value: V | "" | null;
  onChange: (value: V) => void;
  options: Option<V>[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <Select
      items={options}
      value={value || null}
      onValueChange={(v) => {
        if (v !== null && v !== undefined) onChange(v as V);
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={cn("w-full", className)} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function RealtimeIndicator({ className }: { className?: string }) {
  const { connected } = useRealtime();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        connected
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
          : "bg-zinc-200 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300",
        className
      )}
      title={connected ? "Conectado en tiempo real" : "Sin conexión en tiempo real: se actualiza cada 15 s"}
    >
      {connected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
      {connected ? "En vivo" : "Sin conexión"}
    </span>
  );
}

/** Nombre del cliente del pedido; "Sin nombre" en gris para pedidos antiguos (customerName null). */
export function CustomerName({ name, className }: { name: string | null | undefined; className?: string }) {
  const trimmed = name?.trim();
  if (!trimmed) return <span className={cn("font-normal italic text-muted-foreground", className)}>Sin nombre</span>;
  return <span className={cn("truncate", className)} title={trimmed}>{trimmed}</span>;
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", ORDER_STATUS_CLASS[status])}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

// Re-exportar StatCard mejorado
export { StatCard } from "@/components/ui/stat-card";

// Re-exportar skeleton components
export {
  SkeletonStatCard,
  SkeletonOrderCard,
  SkeletonTableCard,
  SkeletonListItem,
  SkeletonTable,
  SkeletonForm,
  SkeletonCard,
  SkeletonDashboardStats,
  SkeletonTableMap,
  SkeletonOrdersList,
  SkeletonDialog,
  SkeletonProductCard,
  SkeletonProductGrid,
  SkeletonDashboardPage,
  SkeletonShimmer,
} from "@/components/ui/skeleton-components";
