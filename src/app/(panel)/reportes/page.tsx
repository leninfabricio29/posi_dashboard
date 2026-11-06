"use client";

import * as React from "react";
import { startOfWeek } from "date-fns";
import { Banknote, FileDown, Landmark, Receipt, ShoppingBag } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "@/lib/toast";
import { CustomerName, EmptyState, ErrorState, LoadingState, PageHeader, StatCard } from "@/components/common";
import { DataTable } from "@/components/data-table";
import { DateRangePicker } from "@/components/date-pickers";
import { SaleDetailSheet } from "@/components/orders/sale-detail-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth-provider";
import { useAsync } from "@/hooks/use-async";
import { reportsApi } from "@/lib/api/reports";
import { fmtDate, fmtDateTime, money, ymd } from "@/lib/format";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const BAR_COLOR = "#2563eb";

function dayLabel(date: string) {
  return format(parseISO(date), "EEE d", { locale: es });
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { date: string; total: number; count: number; cash: number; transfer: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 font-medium capitalize">{format(parseISO(d.date), "EEEE d 'de' MMMM", { locale: es })}</p>
      <p className="tabular-nums">Total: {money(d.total)}</p>
      <p className="text-muted-foreground tabular-nums">
        {d.count} ventas · Efectivo {money(d.cash)} · Transf. {money(d.transfer)}
      </p>
    </div>
  );
}

export default function ReportesPage() {
  const { user } = useAuth();
  const [range, setRange] = React.useState(() => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: new Date() }));
  const from = ymd(range.from);
  const to = ymd(range.to);
  const report = useAsync(() => reportsApi.sales(from, to), [from, to]);
  const [saleOrderId, setSaleOrderId] = React.useState<string | null>(null);
  const closeSale = React.useCallback(() => setSaleOrderId(null), []);
  const r = report.data;

  async function exportPdf() {
    if (!r) return;
    try {
      const { buildSalesReportPdf } = await import("@/lib/pdf/sales-report");
      const { doc, filename } = buildSalesReportPdf(r, user?.restaurantName ?? "Restaurante");
      doc.save(filename);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar el PDF");
    }
  }

  const maxProduct = Math.max(1, ...(r?.topProducts.map((p) => p.total) ?? [1]));

  return (
    <>
      <PageHeader
        title="Reportes de ventas"
        description="Elige un rango de fechas (zona horaria de Ecuador, ambos días incluidos)."
        actions={
          <>
            <DateRangePicker value={range} onChange={setRange} />
            <Button onClick={exportPdf} disabled={!r}>
              <FileDown /> Exportar PDF
            </Button>
          </>
        }
      />

      {report.loading && !r ? (
        <LoadingState rows={8} />
      ) : report.error && !r ? (
        <ErrorState message={report.error} onRetry={report.reload} />
      ) : !r ? null : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Ventas totales"
              value={money(r.totals.total)}
              hint={`${r.totals.count} ventas · Subtotal ${money(r.totals.subtotal)} · IVA ${money(r.totals.tax)}`}
              icon={<Receipt className="size-4" />}
            />
            <StatCard label="Efectivo" value={money(r.totals.cash)} icon={<Banknote className="size-4" />} />
            <StatCard label="Transferencias" value={money(r.totals.transfer)} icon={<Landmark className="size-4" />} />
            <StatCard label="Ticket promedio" value={money(r.totals.averageTicket)} icon={<ShoppingBag className="size-4" />} />
          </div>

          <Tabs defaultValue="dia">
            <TabsList>
              <TabsTrigger value="dia">Por día</TabsTrigger>
              <TabsTrigger value="semana">Por semana</TabsTrigger>
            </TabsList>
            <TabsContent value="dia" className="space-y-4 pt-3">
              <Card>
                <CardHeader>
                  <CardTitle>Ventas por día</CardTitle>
                  <CardDescription>
                    Del {fmtDate(range.from)} al {fmtDate(range.to)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {r.totals.count === 0 ? (
                    <EmptyState title="Sin ventas en el rango" />
                  ) : (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={r.byDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                          <XAxis
                            dataKey="date"
                            tickFormatter={dayLabel}
                            tickLine={false}
                            axisLine={false}
                            fontSize={11}
                            minTickGap={12}
                            stroke="currentColor"
                            className="text-muted-foreground"
                          />
                          <YAxis
                            tickFormatter={(v: number) => `$${v}`}
                            tickLine={false}
                            axisLine={false}
                            fontSize={11}
                            width={56}
                            stroke="currentColor"
                            className="text-muted-foreground"
                          />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: "currentColor", fillOpacity: 0.06 }} />
                          <Bar dataKey="total" name="Total" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Detalle diario</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={r.byDay}
                    rowKey={(d) => d.date}
                    rowClassName={(d) => (d.count === 0 ? "text-muted-foreground" : undefined)}
                    searchText={(d) => [
                      format(parseISO(d.date), "EEEE dd/MM/yyyy", { locale: es }),
                      money(d.cash),
                      money(d.transfer),
                      money(d.total),
                    ]}
                    searchPlaceholder="Buscar por día o fecha (ej. lunes, 05/10)…"
                    columns={[
                      {
                        header: "Fecha",
                        className: "capitalize",
                        cell: (d) => format(parseISO(d.date), "EEE dd/MM/yyyy", { locale: es }),
                      },
                      { header: "Ventas", align: "right", className: "tabular-nums", cell: (d) => d.count },
                      { header: "Efectivo", align: "right", className: "tabular-nums", cell: (d) => money(d.cash) },
                      { header: "Transferencia", align: "right", className: "tabular-nums", cell: (d) => money(d.transfer) },
                      { header: "Total", align: "right", className: "font-medium tabular-nums", cell: (d) => money(d.total) },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="semana" className="pt-3">
              <Card>
                <CardHeader>
                  <CardTitle>Ventas por semana (lunes a domingo)</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={r.byWeek}
                    rowKey={(w) => w.weekStart}
                    searchText={(w) => [
                      fmtDate(parseISO(w.weekStart)),
                      fmtDate(parseISO(w.weekEnd)),
                      money(w.cash),
                      money(w.transfer),
                      money(w.total),
                    ]}
                    searchPlaceholder="Buscar semana por fecha…"
                    columns={[
                      {
                        header: "Semana",
                        cell: (w) => (
                          <>
                            {fmtDate(parseISO(w.weekStart))} – {fmtDate(parseISO(w.weekEnd))}
                          </>
                        ),
                      },
                      { header: "Ventas", align: "right", className: "tabular-nums", cell: (w) => w.count },
                      { header: "Efectivo", align: "right", className: "tabular-nums", cell: (w) => money(w.cash) },
                      { header: "Transferencia", align: "right", className: "tabular-nums", cell: (w) => money(w.transfer) },
                      { header: "Total", align: "right", className: "font-medium tabular-nums", cell: (w) => money(w.total) },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top productos</CardTitle>
                <CardDescription>Los 10 con mayor venta</CardDescription>
              </CardHeader>
              <CardContent>
                {r.topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos.</p>
                ) : (
                  <ol className="space-y-2.5">
                    {r.topProducts.map((p, i) => (
                      <li key={p.productId} className="space-y-1">
                        <div className="flex justify-between gap-2 text-sm">
                          <span className="truncate">
                            <span className="text-muted-foreground">{i + 1}.</span> {p.name}{" "}
                            <span className="text-xs text-muted-foreground">({p.quantity} u.)</span>
                          </span>
                          <span className="font-medium tabular-nums">{money(p.total)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full"
                            style={{ width: `${(p.total / maxProduct) * 100}%`, background: BAR_COLOR }}
                          />
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Ventas por usuario</CardTitle>
                <CardDescription>Quién registró el cobro</CardDescription>
              </CardHeader>
              <CardContent>
                {r.byUser.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos.</p>
                ) : (
                  <DataTable
                    data={r.byUser}
                    rowKey={(u) => u.userId}
                    searchText={(u) => [u.name, money(u.total)]}
                    searchPlaceholder="Buscar usuario…"
                    columns={[
                      { header: "Usuario", cell: (u) => u.name },
                      { header: "Ventas", align: "right", className: "tabular-nums", cell: (u) => u.count },
                      { header: "Total", align: "right", className: "font-medium tabular-nums", cell: (u) => money(u.total) },
                    ]}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ventas ({r.sales.length})</CardTitle>
              <CardDescription>Haz clic en una venta para ver los productos, el cliente y los pagos.</CardDescription>
            </CardHeader>
            <CardContent>
              {r.sales.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin ventas en el rango.</p>
              ) : (
                <DataTable
                  data={r.sales}
                  rowKey={(s) => s.id}
                  onRowClick={(s) => setSaleOrderId(s.orderId)}
                  searchText={(s) => [
                    fmtDateTime(s.createdAt),
                    `#${s.orderNumber}`,
                    s.customerName,
                    s.tableName ?? "Para llevar",
                    s.userName,
                    money(s.cash),
                    money(s.transfer),
                    money(s.total),
                  ]}
                  searchPlaceholder="Buscar por pedido, cliente, mesa, usuario o fecha…"
                  columns={[
                    { header: "Fecha", cell: (s) => fmtDateTime(s.createdAt) },
                    { header: "Pedido", cell: (s) => `#${s.orderNumber}` },
                    { header: "Cliente", cell: (s) => <CustomerName name={s.customerName} /> },
                    { header: "Mesa", cell: (s) => s.tableName ?? "Para llevar" },
                    { header: "Usuario", cell: (s) => s.userName },
                    { header: "Efectivo", align: "right", className: "tabular-nums", cell: (s) => money(s.cash) },
                    { header: "Transferencia", align: "right", className: "tabular-nums", cell: (s) => money(s.transfer) },
                    { header: "Total", align: "right", className: "font-medium tabular-nums", cell: (s) => money(s.total) },
                  ]}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
      <SaleDetailSheet orderId={saleOrderId} onClose={closeSale} />
    </>
  );
}
