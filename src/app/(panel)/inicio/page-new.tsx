"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Banknote, Landmark, Receipt, ShoppingBag, Wallet } from "lucide-react";
import { CustomerName, EmptyState, ErrorState, OrderStatusBadge, PageHeader, SkeletonDashboardStats, SkeletonCard, SkeletonOrdersList, SkeletonTableMap } from "@/components/common";
import { StatCard } from "@/components/ui/stat-card";
import { useAuth } from "@/components/auth-provider";
import { TableMap, TableMapLegend } from "@/components/table-map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveOrders } from "@/hooks/queries/use-orders";
import { useCurrentCashRegister } from "@/hooks/queries/use-cash-register";
import { useSalesReport } from "@/hooks/queries/use-reports";
import { useTableMap } from "@/hooks/queries/use-tables";
import { useFallbackPolling } from "@/hooks/use-realtime";
import { fmtLongDate, fmtTime, money, ymd } from "@/lib/format";
import { orderPlace } from "@/lib/orders";
import { Button } from "@base-ui/react";

export default function InicioPage() {
  const { user } = useAuth();
  const router = useRouter();
  const today = ymd(new Date());

  // TanStack Query hooks - con caché automático y sincronización en tiempo real
  const { data: reportData, isLoading: reportLoading, error: reportError } = useSalesReport(today, today);
  const { data: cashData, isLoading: cashLoading, error: cashError } = useCurrentCashRegister();
  const { data: ordersData, isLoading: ordersLoading, error: ordersError } = useActiveOrders();
  const { data: mapData, isLoading: mapLoading, error: mapError } = useTableMap();

  // Fallback polling solo si WebSocket no está conectado
  useFallbackPolling(() => {
    // TanStack Query refetch automático - mucho más eficiente que reload manual
  });

  const register = cashData?.register ?? null;
  const t = reportData?.totals;

  return (
    <>
      <PageHeader
        title={`Hola, ${user?.name?.split(" ")[0] ?? ""} 👋`}
        description={<span className="capitalize">{fmtLongDate(new Date())}</span>}
        actions={
          <Button nativeButton={false} render={<Link href="/pedidos?nuevo=1" />}>
            <Receipt /> Nuevo pedido
          </Button>
        }
      />

      {/* Stats Cards con loading states mejorados */}
      {reportError && !reportData ? (
        <ErrorState message={String(reportError)} onRetry={() => window.location.reload()} />
      ) : reportLoading || !t ? (
        <SkeletonDashboardStats />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Ventas de hoy"
            value={money(t.total)}
            hint={`${t.count} ventas`}
            icon={<Receipt className="size-5" />}
          />
          <StatCard label="Efectivo" value={money(t.cash)} icon={<Banknote className="size-5" />} />
          <StatCard label="Transferencias" value={money(t.transfer)} icon={<Landmark className="size-5" />} />
          <StatCard
            label="Ticket promedio"
            value={money(t.averageTicket)}
            hint={`IVA ${money(t.tax)}`}
            icon={<ShoppingBag className="size-5" />}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Estado de Caja */}
        <Card className="shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="size-5" /> Caja
            </CardTitle>
            <CardDescription>Estado de la caja del día</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cashLoading && !cashData ? (
              <SkeletonCard contentRows={4} />
            ) : cashError && !cashData ? (
              <ErrorState message={String(cashError)} onRetry={() => window.location.reload()} />
            ) : register ? (
              <>
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3">
                  <p className="text-sm font-medium">
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      Abierta
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Desde {fmtTime(register.openedAt)} por {register.openedBy.name}
                  </p>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <dt className="text-muted-foreground">Monto inicial</dt>
                  <dd className="text-right tabular-nums font-medium">{money(register.initialAmount)}</dd>
                  <dt className="text-muted-foreground">Ventas</dt>
                  <dd className="text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                    {money(register.sales.total)}
                  </dd>
                  <dt className="font-semibold">Efectivo esperado</dt>
                  <dd className="text-right font-bold tabular-nums text-lg">{money(register.expectedCash)}</dd>
                </dl>

                <Button  className="w-full" nativeButton={false} render={<Link href="/caja" />}>
                  Ir a caja <ArrowRight className="ml-2" />
                </Button>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="rounded-full bg-muted size-12 mx-auto flex items-center justify-center mb-3">
                  <Wallet className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  No hay caja abierta. Ábrela para poder cobrar pedidos.
                </p>
                <Button className="w-full" nativeButton={false} render={<Link href="/caja" />}>
                  Abrir caja
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pedidos Activos */}
        <Card className="lg:col-span-2 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-lg">Pedidos abiertos</span>
              {ordersData && ordersData.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">({ordersData.length})</span>
              )}
            </CardTitle>
            <CardDescription>Guardados y pendientes de cobro</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersLoading && !ordersData ? (
              <SkeletonOrdersList count={8} />
            ) : ordersError && !ordersData ? (
              <ErrorState message={String(ordersError)} onRetry={() => window.location.reload()} />
            ) : !ordersData?.length ? (
              <EmptyState title="Sin pedidos abiertos" description="Los pedidos nuevos aparecerán aquí." />
            ) : (
              <div className="space-y-2">
                <ul className="divide-y rounded-lg border">
                  {ordersData.slice(0, 8).map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/pedidos?pedido=${o.id}`}
                        className="flex items-center justify-between gap-3 p-3 hover:bg-muted/50 transition-colors"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="font-semibold text-base">#{o.number}</span>{" "}
                          <CustomerName name={o.customerName} className="font-semibold text-base" />
                          <span className="block text-sm text-muted-foreground">
                            {orderPlace(o)} · {fmtTime(o.createdAt)}
                          </span>
                        </span>
                        <span className="flex items-center gap-3">
                          <OrderStatusBadge status={o.status} />
                          <span className="text-right font-semibold tabular-nums min-w-[4.5rem]">
                            {money(o.total)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>

                {ordersData.length > 8 && (
                  <Button className="w-full" nativeButton={false} render={<Link href="/pedidos" />}>
                    Ver todos los pedidos ({ordersData.length})
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mapa de Mesas */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Mapa de mesas</CardTitle>
          <CardDescription>
            <TableMapLegend />
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mapLoading && !mapData ? (
            <SkeletonTableMap areas={2} tablesPerArea={8} />
          ) : mapError && !mapData ? (
            <ErrorState message={String(mapError)} onRetry={() => window.location.reload()} />
          ) : (
            <TableMap
              areas={mapData ?? []}
              onSelect={(table) =>
                router.push(table.activeOrder ? `/pedidos?pedido=${table.activeOrder.id}` : `/pedidos?mesa=${table.id}`)
              }
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
