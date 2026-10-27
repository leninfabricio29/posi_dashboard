"use client";

import * as React from "react";
import { AlertTriangle, Bluetooth, BluetoothSearching, Cable, Info, Pencil, Plus, Printer as PrinterIcon, Star, Trash2, Unplug } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader, SimpleSelect } from "@/components/common";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAsync } from "@/hooks/use-async";
import { errorMessage } from "@/lib/api/client";
import { printersApi } from "@/lib/api/printers";
import type { PaperWidth, Printer, PrinterConnection, PrinterInput, PrinterPurpose } from "@/lib/api/types";
import { PRINTER_CONNECTION_LABEL, PRINTER_PURPOSE_LABEL } from "@/lib/format";
import { forgetPrinter, getLastPrinterName } from "@/lib/printing/bluetooth";
import { forgetSerialPrinter, getSerialPrinterLabel } from "@/lib/printing/serial";
import {
  type PrintTransport,
  checkTransportSupport,
  getPrintTransport,
  printTestTicket,
  setPrintTransport,
} from "@/lib/printing/actions";
import { invalidatePrintersCache } from "@/lib/printing/auto";
import {
  type PrintSettings,
  DEFAULT_PRINT_SETTINGS,
  getPrintSettings,
  setPrintSettings,
  subscribePrintSettings,
} from "@/lib/printing/settings";

const CONNECTION_OPTIONS = (Object.keys(PRINTER_CONNECTION_LABEL) as PrinterConnection[]).map((v) => ({
  value: v,
  label: PRINTER_CONNECTION_LABEL[v],
}));
const PURPOSE_OPTIONS = (Object.keys(PRINTER_PURPOSE_LABEL) as PrinterPurpose[]).map((v) => ({
  value: v,
  label: PRINTER_PURPOSE_LABEL[v],
}));
const TRANSPORT_OPTIONS: { value: PrintTransport; label: string }[] = [
  { value: "serial", label: "Bluetooth clásico / USB (puerto serie)" },
  { value: "ble", label: "Bluetooth BLE" },
];
const WIDTH_OPTIONS: { value: "58" | "80"; label: string }[] = [
  { value: "58", label: "58 mm (32 columnas)" },
  { value: "80", label: "80 mm (48 columnas)" },
];

export default function ImpresorasPage() {
  const { user } = useAuth();
  const printers = useAsync(() => printersApi.list(), []);
  /** Recarga la tabla y la lista que usa la impresión automática (anchos de papel). */
  const reloadPrintersList = printers.reload;
  const reloadPrinters = React.useCallback(() => {
    invalidatePrintersCache();
    void reloadPrintersList();
  }, [reloadPrintersList]);
  const [dialog, setDialog] = React.useState<{ open: boolean; printer?: Printer }>({ open: false });
  const [toDelete, setToDelete] = React.useState<Printer | null>(null);
  // El transporte se lee de localStorage en un efecto (no en render) para no romper la hidratación.
  const [transport, setTransport] = React.useState<PrintTransport>("serial");
  const [lastName, setLastName] = React.useState<string | null>(null);
  const [testWidth, setTestWidth] = React.useState<"58" | "80">("58");
  const [testing, setTesting] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  const readLastName = React.useCallback(
    (t: PrintTransport) => (t === "ble" ? getLastPrinterName() : getSerialPrinterLabel()),
    []
  );

  React.useEffect(() => {
    const t = getPrintTransport();
    setTransport(t);
    setLastName(readLastName(t));
    setMounted(true);
  }, [readLastName]);

  const support = mounted ? checkTransportSupport(transport) : null;
  const restaurantName = user?.restaurantName ?? "Restaurante";

  function changeTransport(t: PrintTransport) {
    setTransport(t);
    setPrintTransport(t);
    setLastName(readLastName(t));
  }

  async function test(width: PaperWidth, forceChoose: boolean) {
    setTesting(true);
    try {
      await printTestTicket(restaurantName, width, forceChoose, transport);
    } finally {
      setLastName(readLastName(transport));
      setTesting(false);
    }
  }

  async function forget() {
    if (transport === "ble") forgetPrinter();
    else await forgetSerialPrinter();
    setLastName(null);
    toast.info("Impresora olvidada");
  }

  async function setDefault(p: Printer) {
    try {
      await printersApi.update(p.id, { isDefault: true });
      toast.success(`${p.name} es la predeterminada de ${PRINTER_PURPOSE_LABEL[p.purpose]}`);
      reloadPrinters();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Impresoras"
        description="Registro de impresoras y prueba de impresión térmica por Bluetooth desde el navegador."
        actions={
          <Button onClick={() => setDialog({ open: true })}>
            <Plus /> Nueva impresora
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bluetooth className="size-4" /> Prueba de impresión térmica (ESC/POS)
          </CardTitle>
          <CardDescription>
            Funciona en Google Chrome o Microsoft Edge de escritorio, en https o http://localhost. Elige cómo se conecta tu
            impresora y pulsa “Conectar y probar”.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {support && !support.supported && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{support.reason}</span>
            </div>
          )}
          {transport === "serial" ? (
            <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="font-medium">Mini impresoras de 58 mm (JK-5801P, POS-58, MTP-II…)</p>
                <ol className="list-inside list-decimal space-y-0.5 text-muted-foreground">
                  <li>Enciende la impresora.</li>
                  <li>
                    En Windows:{" "}
                    <span className="font-medium text-foreground">Configuración › Bluetooth y dispositivos › Agregar dispositivo</span>,
                    elige la impresora y emparéjala (si pide PIN: <span className="font-mono">0000</span> o{" "}
                    <span className="font-mono">1234</span>).
                  </li>
                  <li>
                    Pulsa “Conectar y probar” y elige el puerto de la impresora: aparece con su nombre o como{" "}
                    <span className="italic">“Vínculo serie estándar a través de Bluetooth (COMx)”</span>. Si hay dos COM,
                    prueba primero el de número menor.
                  </li>
                </ol>
                <p className="text-muted-foreground">El navegador recuerda el puerto: las siguientes impresiones no vuelven a preguntar.</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Solo para impresoras Bluetooth Low Energy (BLE). Si tu impresora no aparece en la lista, es Bluetooth clásico:
              usa la opción “Bluetooth clásico / USB”.
            </p>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="transport">Conexión</Label>
              <SimpleSelect id="transport" className="w-72" value={transport} options={TRANSPORT_OPTIONS} onChange={changeTransport} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="testWidth">Ancho de papel</Label>
              <SimpleSelect id="testWidth" className="w-52" value={testWidth} options={WIDTH_OPTIONS} onChange={setTestWidth} />
            </div>
            <Button onClick={() => test(Number(testWidth) as PaperWidth, true)} disabled={testing || !support?.supported}>
              {transport === "ble" ? <BluetoothSearching /> : <Cable />} {testing ? "Imprimiendo…" : "Conectar y probar"}
            </Button>
            {lastName && (
              <>
                <Button
                  variant="outline"
                  onClick={() => test(Number(testWidth) as PaperWidth, false)}
                  disabled={testing || !support?.supported}
                >
                  Probar de nuevo en “{lastName}”
                </Button>
                <Button variant="ghost" onClick={forget}>
                  <Unplug /> Olvidar
                </Button>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            La conexión elegida y la última impresora se recuerdan en este navegador y se usan también para imprimir el
            cierre de caja en térmica.
          </p>
        </CardContent>
      </Card>

      <AutoPrintCard />

      {printers.loading && !printers.data ? (
        <LoadingState />
      ) : printers.error && !printers.data ? (
        <ErrorState message={printers.error} onRetry={printers.reload} />
      ) : !printers.data?.length ? (
        <EmptyState
          title="No hay impresoras registradas"
          description="Registra la impresora de caja para usar su ancho de papel al imprimir cierres."
          action={
            <Button onClick={() => setDialog({ open: true })}>
              <Plus /> Nueva impresora
            </Button>
          }
        />
      ) : (
        <DataTable
          data={printers.data}
          rowKey={(p) => p.id}
          rowClassName={(p) => (p.isActive ? undefined : "opacity-60")}
          searchText={(p) => [
            p.name,
            PRINTER_CONNECTION_LABEL[p.connectionType],
            p.address,
            `${p.paperWidth} mm`,
            PRINTER_PURPOSE_LABEL[p.purpose],
            p.isActive ? "Activa" : "Inactiva",
            p.isDefault ? "Predeterminada" : null,
          ]}
          searchPlaceholder="Buscar impresora por nombre, conexión o uso…"
          columns={[
            {
              header: "Nombre",
              className: "font-medium",
              cell: (p) => (
                <>
                  {p.name}{" "}
                  {p.isDefault && (
                    <Badge variant="secondary" className="ml-1">
                      <Star className="size-3" /> Predeterminada
                    </Badge>
                  )}
                </>
              ),
            },
            { header: "Conexión", cell: (p) => PRINTER_CONNECTION_LABEL[p.connectionType] },
            { header: "Dirección", className: "font-mono text-xs", cell: (p) => p.address ?? "—" },
            { header: "Papel", cell: (p) => `${p.paperWidth} mm` },
            { header: "Uso", cell: (p) => PRINTER_PURPOSE_LABEL[p.purpose] },
            { header: "Estado", cell: (p) => (p.isActive ? "Activa" : "Inactiva") },
            {
              header: "Acciones",
              align: "right",
              className: "whitespace-nowrap",
              cell: (p) => (
                <>
                  {p.connectionType === "BLUETOOTH" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={testing || !support?.supported}
                      onClick={() => test(p.paperWidth, true)}
                    >
                      <Bluetooth /> Conectar y probar
                    </Button>
                  )}
                  {!p.isDefault && (
                    <Button variant="ghost" size="icon-sm" aria-label="Marcar predeterminada" onClick={() => setDefault(p)}>
                      <Star />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Editar ${p.name}`}
                    onClick={() => setDialog({ open: true, printer: p })}
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

      <PrinterDialog
        state={dialog}
        lastBleName={lastName}
        onClose={() => setDialog({ open: false })}
        onSaved={reloadPrinters}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`¿Eliminar ${toDelete?.name ?? ""}?`}
        confirmLabel="Eliminar"
        destructive
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await printersApi.remove(toDelete.id);
            toast.success("Impresora eliminada");
            reloadPrinters();
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }}
      />
    </>
  );
}

function PrinterDialog({
  state,
  lastBleName,
  onClose,
  onSaved,
}: {
  state: { open: boolean; printer?: Printer };
  lastBleName: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [connectionType, setConnectionType] = React.useState<PrinterConnection>("BLUETOOTH");
  const [address, setAddress] = React.useState("");
  const [paperWidth, setPaperWidth] = React.useState<"58" | "80">("58");
  const [purpose, setPurpose] = React.useState<PrinterPurpose>("CASHIER");
  const [isDefault, setIsDefault] = React.useState(false);
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!state.open) return;
    const p = state.printer;
    setName(p?.name ?? "");
    setConnectionType(p?.connectionType ?? "BLUETOOTH");
    setAddress(p?.address ?? "");
    setPaperWidth(p ? (String(p.paperWidth) as "58" | "80") : "58");
    setPurpose(p?.purpose ?? "CASHIER");
    setIsDefault(p?.isDefault ?? false);
    setIsActive(p?.isActive ?? true);
  }, [state.open, state.printer]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("El nombre es obligatorio");
    const body: PrinterInput = {
      name: name.trim(),
      connectionType,
      paperWidth: Number(paperWidth) as PaperWidth,
      purpose,
      isDefault,
      isActive,
      ...(address.trim() ? { address: address.trim() } : {}),
    };
    setSaving(true);
    try {
      if (state.printer) await printersApi.update(state.printer.id, body);
      else await printersApi.create(body);
      toast.success(state.printer ? "Impresora actualizada" : "Impresora registrada");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const addressHint =
    connectionType === "BLUETOOTH"
      ? "Nombre BLE o MAC (opcional)"
      : connectionType === "NETWORK"
        ? "IP:puerto, ej. 192.168.1.50:9100"
        : "Nombre del dispositivo USB";

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent size="md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{state.printer ? "Editar impresora" : "Nueva impresora"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="prName">Nombre</Label>
            <Input id="prName" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prConn">Conexión</Label>
              <SimpleSelect id="prConn" value={connectionType} options={CONNECTION_OPTIONS} onChange={setConnectionType} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prPurpose">Uso</Label>
              <SimpleSelect id="prPurpose" value={purpose} options={PURPOSE_OPTIONS} onChange={setPurpose} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prAddress">Dirección</Label>
            <div className="flex gap-2">
              <Input
                id="prAddress"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={addressHint}
                maxLength={100}
              />
              {connectionType === "BLUETOOTH" && lastBleName && (
                <Button type="button" variant="outline" onClick={() => setAddress(lastBleName)}>
                  Usar “{lastBleName}”
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prWidth">Ancho de papel</Label>
            <SimpleSelect id="prWidth" value={paperWidth} options={WIDTH_OPTIONS} onChange={setPaperWidth} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="prDefault">Predeterminada para este uso</Label>
            <Switch id="prDefault" checked={isDefault} onCheckedChange={setIsDefault} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="prActive">Activa</Label>
            <Switch id="prActive" checked={isActive} onCheckedChange={setIsActive} />
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

const COPIES_OPTIONS: { value: "1" | "2" | "3"; label: string }[] = [
  { value: "1", label: "1 copia" },
  { value: "2", label: "2 copias" },
  { value: "3", label: "3 copias" },
];

/** Ajustes de impresión automática de ESTE navegador (localStorage). */
function AutoPrintCard() {
  // Valores por defecto en el primer render (SSR/hidratación); los reales se leen en el efecto.
  const [settings, setSettings] = React.useState<PrintSettings>(DEFAULT_PRINT_SETTINGS);

  React.useEffect(() => {
    setSettings(getPrintSettings());
    return subscribePrintSettings(setSettings);
  }, []);

  function update(patch: Partial<PrintSettings>) {
    setSettings(setPrintSettings(patch));
  }

  const toggles: { key: "autoPrintKitchen" | "autoPrintAdditions" | "autoPrintReceipt" | "printStation"; label: string; description: string }[] = [
    {
      key: "autoPrintKitchen",
      label: "Comanda al guardar un pedido",
      description: "Al crear un pedido desde este panel se imprime la comanda de cocina (sin precios).",
    },
    {
      key: "autoPrintAdditions",
      label: "Adicionales y anulaciones",
      description:
        "Al agregar productos o subir una cantidad se imprime un ADICIONAL solo con lo nuevo; al bajar una cantidad o quitar un producto se imprime “ANULADO”.",
    },
    {
      key: "autoPrintReceipt",
      label: "Recibo al cobrar",
      description: "Al cobrar un pedido se imprime el recibo con productos, total, pagos y vuelto.",
    },
    {
      key: "printStation",
      label: "Estación de impresión",
      description:
        "Esta computadora imprime también los pedidos creados o modificados por OTROS (app de meseros, otra caja) en tiempo real. Respeta los dos primeros ajustes.",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PrinterIcon className="size-4" /> Impresión automática
        </CardTitle>
        <CardDescription>
          Estos ajustes se guardan solo en este navegador. La comanda y los adicionales usan el ancho de la impresora de
          cocina registrada (o la de caja); el recibo, el de la impresora de caja. Sin impresoras registradas: 58 mm.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Requiere que la impresora ya se haya elegido con <span className="font-medium">“Conectar y probar”</span> en
            este navegador: la impresión automática nunca abre el selector de puertos. Si no hay impresora, verás un aviso y
            el pedido se guarda igual.
          </span>
        </div>
        <div className="divide-y rounded-lg border">
          {toggles.map((t) => (
            <div key={t.key} className="flex items-start justify-between gap-4 p-3">
              <div className="space-y-0.5">
                <Label htmlFor={`ap-${t.key}`}>{t.label}</Label>
                <p className="text-sm text-muted-foreground">{t.description}</p>
              </div>
              <Switch
                id={`ap-${t.key}`}
                checked={settings[t.key]}
                onCheckedChange={(checked) => update({ [t.key]: checked })}
              />
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 p-3">
            <div className="space-y-0.5">
              <Label htmlFor="ap-copies">Copias de comanda</Label>
              <p className="text-sm text-muted-foreground">Copias de cada comanda y adicional (por ejemplo, cocina y barra).</p>
            </div>
            <SimpleSelect
              id="ap-copies"
              className="w-32"
              value={String(settings.copies) as "1" | "2" | "3"}
              options={COPIES_OPTIONS}
              onChange={(v) => update({ copies: Number(v) as 1 | 2 | 3 })}
            />
          </div>
        </div>
        {settings.printStation && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Activa la estación de impresión en UNA sola computadora; si la activas en varias, cada pedido de los meseros
              se imprimirá varias veces. Mantén el panel abierto en esta computadora para que imprima.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
