"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Clock,
  Landmark,
  Package,
  Receipt,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  CustomerName,
  EmptyState,
  ErrorState,
  OrderStatusBadge,
  PageHeader,
  SkeletonDashboardStats,
  SkeletonTableMap,
  SkeletonOrdersList,
  StatCard,
} from "@/components/common";
import { TableMap, TableMapLegend } from "@/components/table-map";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentCashRegister } from "@/hooks/queries/use-cash-register";
import { useActiveOrders } from "@/hooks/queries/use-orders";
import { useSalesReport } from "@/hooks/queries/use-reports";
import { useTableMap } from "@/hooks/queries/use-tables";
import { fmtLongDate, fmtTime, money, ymd } from "@/lib/format";
import { orderPlace } from "@/lib/orders";
import { cn } from "cn";

export default function InicioPage() {
  const { user } = useAuth();
  const router = useRouter();
  const today = ymd(new Date());

  // TanStack Query hooks
  const { data: report, isLoading: reportLoading, error: reportError } = useSalesReport(today, today);
  const { data: cashData, isLoading: cashLoading } = useCurrentCashRegister();
  const { data: orders, isLoading: ordersLoading, error: ordersError } = useActiveOrders();
  const { data: tableMap, isLoading: mapLoading, error: mapError } = useTableMap();

  const register = cashData?.register ?? null;
  const t = report?.totals;

  // Calcular métricas adicionales
  const orderStats = React.useMemo(() => {
    if (!orders) return { total: 0, amount: 0 };
    return {
      total: orders.length,
      amount: orders.reduce((sum, o) => sum + Number(o.total ?? 0), 0),
    };
  }, [orders]);

  const tableStats = React.useMemo(() => {
    if (!tableMap) return { occupied: 0, available: 0, total: 0 };
    const tables = tableMap.flatMap((area) => area.tables);
    return {
      occupied: tables.filter((t) => t.status === "OCCUPIED").length,
      available: tables.filter((t) => t.status === "AVAILABLE").length,
      total: tables.length,
    };
  }, [tableMap]);

  return (
    <>
      <PageHeader
        title={`Hola, ${user?.name?.split(" ")[0] ?? ""}`}
        description={<span className="inline-block first-letter:uppercase">{fmtLongDate(new Date())}</span>}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/pedidos" />}>
              <Receipt className="size-4" /> Ver pedidos
            </Button>
            <Button size="sm" nativeButton={false} render={<Link href="/pedidos?nuevo=1" />}>
              <Receipt className="size-4" /> Nuevo pedido
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      {reportError ? (
        <ErrorState message={reportError instanceof Error ? reportError.message : String(reportError)} />
      ) : reportLoading ? (
        <SkeletonDashboardStats />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Ventas de hoy"
            value={money(t?.total ?? 0)}
            hint={`${t?.count ?? 0} ventas`}
            icon={<Receipt className="size-4" />}
          />
          <StatCard
            label="Efectivo"
            value={money(t?.cash ?? 0)}
            icon={<Banknote className="size-4" />}
            hint={`${((t?.cash ?? 0) / (t?.total || 1) * 100).toFixed(0)}% del total`}
          />
          <StatCard
            label="Transferencias"
            value={money(t?.transfer ?? 0)}
            icon={<Landmark className="size-4" />}
            hint={`${((t?.transfer ?? 0) / (t?.total || 1) * 100).toFixed(0)}% del total`}
          />
          <StatCard
            label="Ticket promedio"
            value={money(t?.averageTicket ?? 0)}
            hint={`IVA ${money(t?.tax ?? 0)}`}
            icon={<ShoppingBag className="size-4" />}
          />
        </div>
      )}

      {/* Main Grid: 2 columns on desktop */}
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        {/* Left Column: Quick Stats + Cash Register */}
        <div className="space-y-4 lg:col-span-1 lg:space-y-6">
          {/* Quick Stats */}
          <Card elevated>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Estado de operación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href="/pedidos"
                className="flex items-center justify-between rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-500/10 p-2">
                    <Clock className="size-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Pedidos abiertos</p>
                    <p className="text-xs text-muted-foreground">
                      {money(orderStats.amount)} por cobrar
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-base font-bold">
                  {ordersLoading ? "…" : orderStats.total}
                </Badge>
              </Link>

              <div className="flex items-center justify-between rounded-lg bg-primary/5 p-3 ring-1 ring-primary/10">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Users className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Mesas ocupadas</p>
                    <p className="text-xs text-muted-foreground">
                      {mapLoading ? "Cargando…" : `${tableStats.occupied} de ${tableStats.total} · ${tableStats.available} libres`}
                    </p>
                  </div>
                </div>
                <Badge className="text-base font-bold tabular-nums">
                  {tableStats.occupied}/{tableStats.total}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Cash Register */}
          <Card elevated>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="size-4" /> Caja registradora
              </CardTitle>
              <CardDescription>Estado de la caja del día</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {cashLoading ? (
                <div className="space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-16 animate-pulse rounded bg-muted" />
                </div>
              ) : register ? (
                <>
                  <div className="rounded-lg bg-success/10 p-3 ring-1 ring-success/20">
                    <div className="flex items-center gap-2">
                      <span className="size-2 animate-pulse rounded-full bg-success" />
                      <p className="text-sm font-medium text-success">Caja abierta</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Desde {fmtTime(register.openedAt)} por {register.openedBy.name}
                    </p>
                  </div>

                  <dl className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Monto inicial</dt>
                      <dd className="tabular-nums font-medium">{money(register.initialAmount)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Ventas efectivo</dt>
                      <dd className="tabular-nums font-medium">{money(register.sales.cash)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Movimientos</dt>
                      <dd className="tabular-nums font-medium">{money((register.movements || []).reduce((sum, m) => sum + (m.amount || 0), 0))}</dd>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <dt className="font-semibold">Efectivo esperado</dt>
                      <dd className="tabular-nums font-semibold text-primary">{money(register.expectedCash)}</dd>
                    </div>
                  </dl>

                  <Button variant="outline" className="w-full" nativeButton={false} render={<Link href="/caja" />}>
                    Administrar caja <ArrowRight className="size-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="rounded-lg bg-warning/10 p-3 ring-1 ring-warning/20">
                    <p className="text-sm font-medium text-warning">Caja cerrada</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Abre la caja para comenzar a registrar ventas
                    </p>
                  </div>
                  <Button className="w-full" nativeButton={false} render={<Link href="/caja" />}>
                    <Wallet className="size-4" /> Abrir caja
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Active Orders + Table Map */}
        <div className="space-y-4 lg:col-span-2 lg:space-y-6">
          {/* Active Orders */}
          <Card elevated>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Pedidos abiertos
                    <Badge variant="secondary">{orderStats.total}</Badge>
                  </CardTitle>
                  <CardDescription>Guardados y pendientes de cobro</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/pedidos" />}
                >
                  Ver todos <ArrowUpRight className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <SkeletonOrdersList />
              ) : ordersError ? (
                <ErrorState message={ordersError instanceof Error ? ordersError.message : String(ordersError)} />
              ) : !orders?.length ? (
                <EmptyState
                  title="Sin pedidos abiertos"
                  description="Los pedidos nuevos aparecerán aquí en tiempo real"
                  icon={<Package className="size-8" />}
                />
              ) : (
                <div className="space-y-2">
                  {orders.slice(0, 6).map((o) => (
                    <Link
                      key={o.id}
                      href={`/pedidos?pedido=${o.id}`}
                      className={cn(
                        "group flex items-center justify-between gap-4 rounded-lg border p-3 transition-all hover:border-primary/50 hover:bg-muted/50",
                        "hover:shadow-sm"
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">
                          #{o.number}
                        </div>
                        <div className="min-w-0 flex-1">
                          <CustomerName name={o.customerName} className="block font-semibold" />
                          <p className="text-xs text-muted-foreground">
                            {orderPlace(o)} · {fmtTime(o.createdAt)} · {o.items.length} producto{o.items.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <OrderStatusBadge status={o.status} />
                        <div className="text-right">
                          <p className="font-bold tabular-nums">{money(o.total)}</p>
                        </div>
                        <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </Link>
                  ))}
                  {orders.length > 6 && (
                    <Button
                      variant="outline"
                      className="w-full"
                      nativeButton={false}
                      render={<Link href="/pedidos" />}
                    >
                      Ver todos los pedidos ({orders.length})
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Table Map */}
          <Card elevated>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mapa de mesas</CardTitle>
                  <CardDescription className="mt-1.5">
                    <TableMapLegend />
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/mesas" />}
                >
                  Configurar <ArrowUpRight className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {mapLoading ? (
                <SkeletonTableMap />
              ) : mapError ? (
                <ErrorState message={mapError instanceof Error ? mapError.message : String(mapError)} />
              ) : (
                <TableMap
                  areas={tableMap ?? []}
                  onSelect={(table) =>
                    router.push(
                      table.activeOrder ? `/pedidos?pedido=${table.activeOrder.id}` : `/pedidos?mesa=${table.id}`
                    )
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
