"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Plus, RefreshCw } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { DatePicker } from "@/components/date-pickers";
import {
  CustomerName,
  EmptyState,
  ErrorState,
  LoadingState,
  OrderStatusBadge,
  PageHeader,
  SimpleSelect,
} from "@/components/common";
import { OrderDetailSheet } from "@/components/orders/order-detail-sheet";
import { OrderEditorDialog } from "@/components/orders/order-editor-dialog";
import { OrderWizardMobile } from "@/components/orders/order-wizard-mobile";
import { TableMap, TableMapLegend, applyTableUpdate } from "@/components/table-map";
import { useIsMobile } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAsync } from "@/hooks/use-async";
import { useFallbackPolling, useRealtimeEvent } from "@/hooks/use-realtime";
import { cashApi } from "@/lib/api/cash-register";
import { ordersApi } from "@/lib/api/orders";
import { tablesApi } from "@/lib/api/tables";
import type { Order, OrderStatus } from "@/lib/api/types";
import { ORDER_STATUS_LABEL, fmtDateTime, fmtTime, money, ymd } from "@/lib/format";
import { customerLabel, orderPlace, upsertActiveOrder } from "@/lib/orders";

const STATUS_FILTER = [
  { value: "ALL", label: "Todos" },
  { value: "OPEN", label: "Abiertos" },
  { value: "PAID", label: "Pagados" },
];

function PedidosContent() {
  const router = useRouter();
  const params = useSearchParams();
  const isMobile = useIsMobile();

  const active = useAsync(() => ordersApi.active(), []);
  const map = useAsync(() => tablesApi.map(), []);
  const cash = useAsync(() => cashApi.current(), []);
  const cashOpen = !!cash.data?.register;

  const [tab, setTab] = React.useState<string>("activos");
  const [historyDate, setHistoryDate] = React.useState(() => new Date());
  const [historyStatus, setHistoryStatus] = React.useState<string>("ALL");
  const history = useAsync(
    () =>
      ordersApi.list({
        from: ymd(historyDate),
        to: ymd(historyDate),
        status: historyStatus === "ALL" ? undefined : (historyStatus as OrderStatus),
      }),
    [historyDate, historyStatus],
    tab === "historial"
  );

  const [selected, setSelected] = React.useState<Order | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [initialTableId, setInitialTableId] = React.useState<string | null>(null);

  // Parámetros de URL: ?nuevo=1, ?mesa=<id>, ?pedido=<id>
  React.useEffect(() => {
    const mesa = params.get("mesa");
    const pedido = params.get("pedido");
    if (params.get("nuevo") || mesa) {
      setInitialTableId(mesa);
      setCreating(true);
    }
    if (pedido) {
      ordersApi
        .get(pedido)
        .then((o) => {
          setSelected(o);
          setSheetOpen(true);
        })
        .catch(() => {});
    }
    if (params.size) router.replace("/pedidos");
  }, [params, router]);

  const applyOrder = React.useCallback(
    (o: Order) => {
      active.setData((prev) => (prev ? upsertActiveOrder(prev, o) : prev));
      history.setData((prev) => (prev ? prev.map((x) => (x.id === o.id ? o : x)) : prev));
      setSelected((cur) => (cur && cur.id === o.id ? o : cur));
    },
    // setData son estables
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useRealtimeEvent("order.created", applyOrder);
  useRealtimeEvent("order.updated", applyOrder);
  useRealtimeEvent("table.updated", (t) => map.setData((prev) => (prev ? applyTableUpdate(prev, t) : prev)));
  useRealtimeEvent("cash.updated", () => void cash.reload());
  useFallbackPolling(() => {
    void active.reload();
    void map.reload();
    void cash.reload();
  });

  function openOrder(o: Order) {
    setSelected(o);
    setSheetOpen(true);
  }

  function onSaved(o: Order) {
    applyOrder(o);
    void map.reload();
    if (o.status === "PAID") void cash.reload();
  }

  async function openTable(tableId: string, activeOrderId?: string) {
    if (activeOrderId) {
      const found = active.data?.find((o) => o.id === activeOrderId);
      if (found) return openOrder(found);
      try {
        openOrder(await ordersApi.get(activeOrderId));
      } catch {
        /* ignorar */
      }
      return;
    }
    setInitialTableId(tableId);
    setCreating(true);
  }

  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Toma pedidos, modifícalos mientras estén abiertos y cóbralos."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                void active.reload();
                void map.reload();
                void cash.reload();
              }}
            >
              <RefreshCw /> Actualizar
            </Button>
            <Button
              onClick={() => {
                setInitialTableId(null);
                setCreating(true);
              }}
            >
              <Plus /> Nuevo pedido
            </Button>
          </>
        }
      />

      {cash.data && !cashOpen && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            No hay caja abierta. Puedes tomar pedidos, pero no cobrarlos hasta{" "}
            <Link href="/caja" className="font-medium underline">
              abrir la caja
            </Link>
            .
          </span>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList>
          <TabsTrigger value="activos">Abiertos {active.data ? `(${active.data.length})` : ""}</TabsTrigger>
          <TabsTrigger value="mapa">Mapa de mesas</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="activos" className="pt-3">
          {active.loading && !active.data ? (
            <LoadingState rows={4} />
          ) : active.error && !active.data ? (
            <ErrorState message={active.error} onRetry={active.reload} />
          ) : !active.data?.length ? (
            <EmptyState
              title="No hay pedidos abiertos"
              description="Crea un pedido nuevo desde aquí o tocando una mesa libre del mapa."
              action={
                <Button onClick={() => setCreating(true)}>
                  <Plus /> Nuevo pedido
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {active.data.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => openOrder(o)}
                  className="rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg font-semibold">#{o.number}</span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <CustomerName name={o.customerName} className="block text-base font-semibold" />
                  <p className="text-sm font-medium text-muted-foreground">{orderPlace(o)}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtTime(o.createdAt)} · {o.userName} · {o.items.reduce((s, i) => s + i.quantity, 0)} ítems
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {o.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}
                  </p>
                  <p className="mt-2 text-right text-lg font-semibold tabular-nums">{money(o.total)}</p>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mapa" className="pt-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Toca una mesa libre para crear un pedido u ocupada para verlo</CardTitle>
              <TableMapLegend />
            </CardHeader>
            <CardContent>
              {map.loading && !map.data ? (
                <LoadingState rows={3} />
              ) : map.error && !map.data ? (
                <ErrorState message={map.error} onRetry={map.reload} />
              ) : (
                <TableMap areas={map.data ?? []} onSelect={(t) => openTable(t.id, t.activeOrder?.id)} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial" className="space-y-3 pt-3">
          <div className="flex flex-wrap gap-2">
            <DatePicker value={historyDate} onChange={setHistoryDate} />
            <SimpleSelect
              ariaLabel="Filtrar por estado"
              className="w-52"
              value={historyStatus}
              options={STATUS_FILTER}
              onChange={setHistoryStatus}
            />
          </div>
          {history.loading && !history.data ? (
            <LoadingState rows={5} />
          ) : history.error && !history.data ? (
            <ErrorState message={history.error} onRetry={history.reload} />
          ) : !history.data?.length ? (
            <EmptyState title="Sin pedidos" description="No hay pedidos para la fecha y filtro elegidos." />
          ) : (
            <DataTable
              data={history.data}
              rowKey={(o) => o.id}
              onRowClick={openOrder}
              searchText={(o) => [
                `#${o.number}`,
                fmtDateTime(o.createdAt),
                orderPlace(o),
                customerLabel(o),
                o.userName,
                ORDER_STATUS_LABEL[o.status],
                money(o.total),
              ]}
              searchPlaceholder="Buscar por número, mesa, cliente o usuario…"
              columns={[
                { header: "#", className: "font-medium", cell: (o) => `#${o.number}` },
                { header: "Fecha", cell: (o) => fmtDateTime(o.createdAt) },
                { header: "Cliente", className: "font-medium", cell: (o) => <CustomerName name={o.customerName} /> },
                { header: "Mesa", cell: (o) => orderPlace(o) },
                { header: "Usuario", cell: (o) => o.userName },
                { header: "Estado", cell: (o) => <OrderStatusBadge status={o.status} /> },
                { header: "Total", align: "right", className: "tabular-nums", cell: (o) => money(o.total) },
              ]}
            />
          )}
        </TabsContent>
      </Tabs>

      {isMobile ? (
        <OrderWizardMobile
          open={creating}
          onOpenChange={setCreating}
          mode={{ kind: "create", initialTableId }}
          onSaved={(o) => {
            onSaved(o);
            setTab("activos");
          }}
        />
      ) : (
        <OrderEditorDialog
          open={creating}
          onOpenChange={setCreating}
          mode={{ kind: "create", initialTableId }}
          onSaved={(o) => {
            onSaved(o);
            setTab("activos");
          }}
        />
      )}
        
      <OrderDetailSheet
        order={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onChange={onSaved}
        cashOpen={cashOpen}
      />
    </>
  );
}

export default function PedidosPage() {
  return (
    <React.Suspense fallback={<LoadingState rows={6} />}>
      <PedidosContent />
    </React.Suspense>
  );
}
