"use client";

import * as React from "react";
import { subDays } from "date-fns";
import { ArrowDownCircle, ArrowUpCircle, Banknote, Landmark, Lock, Receipt, Wallet } from "lucide-react";
import { toast } from "@/lib/toast";
import { CloseRegisterDialog } from "@/components/cash/close-register-dialog";
import { CashReportActions } from "@/components/cash/report-actions";
import { ConfirmDialog, CustomerName, EmptyState, ErrorState, LoadingState, PageHeader, StatCard } from "@/components/common";
import { SaleDetailSheet } from "@/components/orders/sale-detail-sheet";
import { DataTable } from "@/components/data-table";
import { DateRangePicker } from "@/components/date-pickers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAsync } from "@/hooks/use-async";
import { useFallbackPolling, useRealtimeEvent } from "@/hooks/use-realtime";
import { cashApi } from "@/lib/api/cash-register";
import { errorMessage } from "@/lib/api/client";
import { printersApi } from "@/lib/api/printers";
import type { CashRegisterSummary, MovementType, PaperWidth } from "@/lib/api/types";
import { fmtDateTime, fmtTime, money, parseAmount, round2, ymd } from "@/lib/format";
import { pickCashierPrinter, printCashCloseTicket } from "@/lib/printing/actions";
import { cn } from "@/lib/utils";

export default function CajaPage() {
  const current = useAsync(() => cashApi.current(), []);
  const printers = useAsync(() => printersApi.list(), []);
  const paperWidth: PaperWidth = pickCashierPrinter(printers.data)?.paperWidth ?? 58;
  const [lastClosed, setLastClosed] = React.useState<CashRegisterSummary | null>(null);
  const [askPrint, setAskPrint] = React.useState<CashRegisterSummary | null>(null);
  const [tab, setTab] = React.useState("actual");

  useRealtimeEvent("cash.updated", () => void current.reload());
  useRealtimeEvent("order.updated", (o) => {
    if (o.status === "PAID") void current.reload();
  });
  useFallbackPolling(() => void current.reload());

  const register = current.data?.register ?? null;

  return (
    <>
      <PageHeader title="Caja" description="Apertura, movimientos de efectivo y cierre con reporte." />
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList>
          <TabsTrigger value="actual">Caja actual</TabsTrigger>
          <TabsTrigger value="historial">Historial de cierres</TabsTrigger>
        </TabsList>
        <TabsContent value="actual" className="space-y-4 pt-3">
          {lastClosed && (
            <Card className="border-emerald-300 dark:border-emerald-500/40">
              <CardHeader>
                <CardTitle>Caja cerrada · {fmtDateTime(lastClosed.closedAt)}</CardTitle>
                <CardDescription>
                  Esperado {money(lastClosed.expectedCash)} · Contado {money(lastClosed.countedCash)} · Diferencia{" "}
                  <span className={cn((lastClosed.difference ?? 0) < 0 && "text-destructive")}>
                    {money(lastClosed.difference)}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-2">
                <CashReportActions getSummary={() => lastClosed} paperWidth={paperWidth} />
                <Button variant="ghost" onClick={() => setLastClosed(null)}>
                  Ocultar
                </Button>
              </CardContent>
            </Card>
          )}
          {current.loading && !current.data ? (
            <LoadingState rows={6} />
          ) : current.error && !current.data ? (
            <ErrorState message={current.error} onRetry={current.reload} />
          ) : register ? (
            <OpenRegisterView
              register={register}
              paperWidth={paperWidth}
              onChange={(s) => current.setData({ register: s })}
              onClosed={(s) => {
                setLastClosed(s);
                current.setData({ register: null });
                // Se pregunta si imprimir en la térmica; el PDF queda disponible en los botones del cierre.
                setAskPrint(s);
              }}
            />
          ) : (
            <OpenRegisterForm onOpened={(s) => current.setData({ register: s })} />
          )}
        </TabsContent>
        <TabsContent value="historial" className="pt-3">
          {tab === "historial" && <HistoryView paperWidth={paperWidth} />}
        </TabsContent>
      </Tabs>
      <ConfirmDialog
        open={!!askPrint}
        onOpenChange={(o) => !o && setAskPrint(null)}
        title="¿Imprimir cierre?"
        description={`Se imprimirá el reporte del cierre en la impresora térmica (${paperWidth} mm).`}
        confirmLabel="Sí, imprimir"
        cancelLabel="No imprimir"
        onConfirm={async () => {
          if (askPrint) await printCashCloseTicket(askPrint, paperWidth);
          setAskPrint(null);
        }}
      />
    </>
  );
}

function OpenRegisterForm({ onOpened }: { onOpened: (s: CashRegisterSummary) => void }) {
  const [amount, setAmount] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Presets comunes de monto inicial
  const PRESETS = [50, 100, 200, 300, 500];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseAmount(amount || "0");
    if (!Number.isFinite(n) || n < 0) return toast.error("Monto inicial inválido");
    setSaving(true);
    try {
      const s = await cashApi.open(round2(n), notes.trim() || undefined);
      toast.success("Caja abierta");
      onOpened(s);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="size-4" /> No hay caja abierta
        </CardTitle>
        <CardDescription>Abre la caja con el efectivo inicial (fondo de cambio) para empezar a cobrar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="initialAmount">Monto inicial (USD)</Label>
            <Input
              id="initialAmount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              className="text-lg font-semibold"
            />
            
            {/* Preset Buttons */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Montos rápidos:</p>
              <div className="grid grid-cols-5 gap-2">
                {PRESETS.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={parseAmount(amount) === preset ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAmount(preset.toFixed(2))}
                    className="h-12 flex-col"
                  >
                    <span className="text-lg font-bold">${preset}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="openNotes">Notas (opcional)</Label>
            <Textarea
              id="openNotes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={300}
              placeholder="Ej: Turno mañana, responsable Juan"
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={saving}>
            <Wallet className="size-5" /> {saving ? "Abriendo…" : "Abrir caja"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function OpenRegisterView({
  register: r,
  paperWidth,
  onChange,
  onClosed,
}: {
  register: CashRegisterSummary;
  paperWidth: PaperWidth;
  onChange: (s: CashRegisterSummary) => void;
  onClosed: (s: CashRegisterSummary) => void;
}) {
  const [saleOrderId, setSaleOrderId] = React.useState<string | null>(null);
  const closeSale = React.useCallback(() => setSaleOrderId(null), []);
  const [movement, setMovement] = React.useState<MovementType | null>(null);
  const [closing, setClosing] = React.useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <span className="size-2.5 rounded-full bg-emerald-500" /> Caja abierta
          </CardTitle>
          <CardDescription>
            Desde {fmtDateTime(r.openedAt)} por {r.openedBy.name} · Monto inicial {money(r.initialAmount)}
            {r.notes ? ` · ${r.notes}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setMovement("INCOME")}>
            <ArrowDownCircle /> Registrar ingreso
          </Button>
          <Button variant="outline" onClick={() => setMovement("EXPENSE")}>
            <ArrowUpCircle /> Registrar egreso
          </Button>
          <Button variant="destructive" onClick={() => setClosing(true)}>
            <Lock /> Cerrar caja
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Ventas"
          value={money(r.sales.total)}
          hint={`${r.sales.count} ventas · IVA ${money(r.sales.tax)}`}
          icon={<Receipt className="size-4" />}
        />
        <StatCard label="Efectivo (ventas)" value={money(r.sales.cash)} icon={<Banknote className="size-4" />} />
        <StatCard label="Transferencias" value={money(r.sales.transfer)} icon={<Landmark className="size-4" />} />
        <StatCard
          label="Efectivo esperado"
          value={money(r.expectedCash)}
          hint={`+${money(r.incomes)} ingresos · −${money(r.expenses)} egresos`}
          icon={<Wallet className="size-4" />}
          className="border-primary/40"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos y egresos</CardTitle>
          </CardHeader>
          <CardContent>
            {r.movements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin movimientos manuales.</p>
            ) : (
              <DataTable
                data={r.movements}
                rowKey={(m) => m.id}
                searchText={(m) => [
                  fmtTime(m.createdAt),
                  m.reason,
                  m.userName,
                  m.type === "EXPENSE" ? "Egreso" : "Ingreso",
                  money(m.amount),
                ]}
                searchPlaceholder="Buscar por motivo, usuario o monto…"
                columns={[
                  { header: "Hora", cell: (m) => fmtTime(m.createdAt) },
                  {
                    header: "Motivo",
                    className: "whitespace-normal",
                    cell: (m) => (
                      <>
                        {m.reason}
                        <span className="block text-xs text-muted-foreground">{m.userName}</span>
                      </>
                    ),
                  },
                  {
                    header: "Monto",
                    align: "right",
                    className: "tabular-nums",
                    cell: (m) => (
                      <span
                        className={cn(m.type === "EXPENSE" ? "text-destructive" : "text-emerald-700 dark:text-emerald-400")}
                      >
                        {m.type === "EXPENSE" ? "−" : "+"}
                        {money(m.amount)}
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transferencias recibidas</CardTitle>
          </CardHeader>
          <CardContent>
            {r.transfers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin transferencias.</p>
            ) : (
              <DataTable
                data={r.transfers}
                rowKey={(t) => t.id}
                searchText={(t) => [fmtTime(t.createdAt), `#${t.orderNumber}`, t.reference, money(t.amount)]}
                searchPlaceholder="Buscar por código, pedido o monto…"
                columns={[
                  { header: "Hora", cell: (t) => fmtTime(t.createdAt) },
                  { header: "Pedido", cell: (t) => `#${t.orderNumber}` },
                  { header: "Código", className: "font-mono text-xs", cell: (t) => t.reference },
                  { header: "Monto", align: "right", className: "tabular-nums", cell: (t) => money(t.amount) },
                ]}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ventas de esta caja ({r.salesList.length})</CardTitle>
          <CardDescription>Haz clic en una venta para ver los productos, el cliente y los pagos.</CardDescription>
        </CardHeader>
        <CardContent>
          {r.salesList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay ventas.</p>
          ) : (
            <DataTable
              data={r.salesList}
              rowKey={(s) => s.id}
              onRowClick={(s) => setSaleOrderId(s.orderId)}
              searchText={(s) => [
                fmtTime(s.createdAt),
                `#${s.orderNumber}`,
                s.customerName,
                s.tableName ?? "Para llevar",
                money(s.cash),
                money(s.transfer),
                money(s.total),
              ]}
              searchPlaceholder="Buscar por pedido, cliente, mesa o monto…"
              columns={[
                { header: "Hora", cell: (s) => fmtTime(s.createdAt) },
                { header: "Pedido", cell: (s) => `#${s.orderNumber}` },
                { header: "Cliente", cell: (s) => <CustomerName name={s.customerName} /> },
                { header: "Mesa", cell: (s) => s.tableName ?? "Para llevar" },
                { header: "Efectivo", align: "right", className: "tabular-nums", cell: (s) => money(s.cash) },
                { header: "Transferencia", align: "right", className: "tabular-nums", cell: (s) => money(s.transfer) },
                { header: "Total", align: "right", className: "font-medium tabular-nums", cell: (s) => money(s.total) },
              ]}
            />
          )}
        </CardContent>
      </Card>
      <SaleDetailSheet orderId={saleOrderId} onClose={closeSale} />

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Corte parcial (sin cerrar la caja):</p>
        <CashReportActions getSummary={() => r} paperWidth={paperWidth} />
      </div>

      <MovementDialog type={movement} onClose={() => setMovement(null)} onSaved={onChange} expectedCash={r.expectedCash} />
      <CloseRegisterDialog register={r} open={closing} onOpenChange={setClosing} onClosed={onClosed} />
    </div>
  );
}

function MovementDialog({
  type,
  expectedCash,
  onClose,
  onSaved,
}: {
  type: MovementType | null;
  expectedCash: number;
  onClose: () => void;
  onSaved: (s: CashRegisterSummary) => void;
}) {
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setAmount("");
    setReason("");
  }, [type]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!type) return;
    const n = parseAmount(amount);
    if (!Number.isFinite(n) || n <= 0) return toast.error("El monto debe ser mayor a 0");
    if (!reason.trim()) return toast.error("El motivo es obligatorio");
    if (type === "EXPENSE" && round2(n) > expectedCash)
      return toast.error(`El egreso supera el efectivo esperado (${money(expectedCash)})`);
    setSaving(true);
    try {
      const s = await cashApi.movement(type, round2(n), reason.trim());
      toast.success(type === "INCOME" ? "Ingreso registrado" : "Egreso registrado");
      onSaved(s);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!type} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent size="sm">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{type === "INCOME" ? "Registrar ingreso" : "Registrar egreso"}</DialogTitle>
            <DialogDescription>
              {type === "INCOME"
                ? "Entrada de efectivo a la caja (ej. cambio adicional)."
                : "Salida de efectivo (ej. compra de insumos, pago a proveedor)."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="movAmount">Monto (USD)</Label>
            <Input
              id="movAmount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="movReason">Motivo</Label>
            <Textarea id="movReason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
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

function HistoryView({ paperWidth }: { paperWidth: PaperWidth }) {
  const [range, setRange] = React.useState(() => ({ from: subDays(new Date(), 29), to: new Date() }));
  const history = useAsync(() => cashApi.history({ from: ymd(range.from), to: ymd(range.to) }), [range]);

  return (
    <div className="space-y-3">
      <DateRangePicker value={range} onChange={setRange} />
      {history.loading && !history.data ? (
        <LoadingState />
      ) : history.error && !history.data ? (
        <ErrorState message={history.error} onRetry={history.reload} />
      ) : !history.data?.length ? (
        <EmptyState title="Sin cierres" description="No hay cajas en el rango elegido." />
      ) : (
        <DataTable
          data={history.data}
          rowKey={(h) => h.id}
          searchText={(h) => [
            fmtDateTime(h.openedAt),
            h.status === "OPEN" ? "Abierta" : fmtDateTime(h.closedAt),
            h.openedBy.name,
            h.closedBy?.name,
            money(h.salesTotal),
            money(h.expectedCash),
            h.countedCash === null ? null : money(h.countedCash),
            h.difference === null ? null : money(h.difference),
          ]}
          searchPlaceholder="Buscar por fecha, responsable o monto…"
          columns={[
            { header: "Apertura", cell: (h) => fmtDateTime(h.openedAt) },
            {
              header: "Cierre",
              cell: (h) => (h.status === "OPEN" ? <Badge variant="secondary">Abierta</Badge> : fmtDateTime(h.closedAt)),
            },
            {
              header: "Responsables",
              className: "text-xs",
              cell: (h) => (
                <>
                  {h.openedBy.name}
                  {h.closedBy ? ` / ${h.closedBy.name}` : ""}
                </>
              ),
            },
            { header: "Ventas", align: "right", className: "tabular-nums", cell: (h) => money(h.salesTotal) },
            { header: "Esperado", align: "right", className: "tabular-nums", cell: (h) => money(h.expectedCash) },
            {
              header: "Contado",
              align: "right",
              className: "tabular-nums",
              cell: (h) => (h.countedCash === null ? "—" : money(h.countedCash)),
            },
            {
              header: "Diferencia",
              align: "right",
              className: "tabular-nums",
              cell: (h) => (
                <span
                  className={cn(
                    (h.difference ?? 0) < 0 && "text-destructive",
                    (h.difference ?? 0) > 0 && "text-emerald-700 dark:text-emerald-400"
                  )}
                >
                  {h.difference === null ? "—" : money(h.difference)}
                </span>
              ),
            },
            {
              header: "Reporte",
              cell: (h) => (
                <CashReportActions compact size="sm" paperWidth={paperWidth} getSummary={() => cashApi.summary(h.id)} />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
