import { toast } from "@/lib/toast";
import type { CashRegisterSummary, PaperWidth, Printer } from "@/lib/api/types";
import { BluetoothPrintError, NoPrinterConfiguredError, checkBluetoothSupport, printBytes } from "./bluetooth";
import { checkSerialSupport, printBytesSerial } from "./serial";
import { buildCashCloseTicket, buildTestTicket } from "./tickets";

/**
 * Cómo llega el ticket a la impresora:
 *  - "serial": Web Serial. Bluetooth CLÁSICO emparejado en Windows (JK-5801P, POS-58…) o USB como puerto COM.
 *  - "ble":    Web Bluetooth. Solo impresoras Bluetooth Low Energy.
 * Se recuerda en el navegador; por defecto "serial", que es lo que usan la mayoría de mini impresoras de 58 mm.
 */
export type PrintTransport = "serial" | "ble";

const TRANSPORT_KEY = "triada.printTransport";

export function getPrintTransport(): PrintTransport {
  try {
    return window.localStorage.getItem(TRANSPORT_KEY) === "ble" ? "ble" : "serial";
  } catch {
    return "serial";
  }
}

export function setPrintTransport(t: PrintTransport) {
  try {
    window.localStorage.setItem(TRANSPORT_KEY, t);
  } catch {
    /* ignorar */
  }
}

export function checkTransportSupport(t: PrintTransport) {
  return t === "ble" ? checkBluetoothSupport() : checkSerialSupport();
}

/** Elige la impresora de caja predeterminada (o la primera activa) para saber el ancho de papel. */
export function pickCashierPrinter(printers: Printer[] | undefined): Printer | undefined {
  const active = (printers ?? []).filter((p) => p.isActive);
  return (
    active.find((p) => p.purpose === "CASHIER" && p.isDefault) ??
    active.find((p) => p.purpose === "CASHIER") ??
    active.find((p) => p.connectionType === "BLUETOOTH") ??
    active[0]
  );
}

async function run(bytes: () => Uint8Array, label: string, forceChoose?: boolean, transport = getPrintTransport()) {
  const support = checkTransportSupport(transport);
  if (!support.supported) {
    toast.error(transport === "ble" ? "Web Bluetooth no disponible" : "Puerto serie no disponible", {
      description: support.reason,
    });
    return false;
  }
  toast.info(`${label}…`, { duration: 2000 });
  try {
    const send = transport === "ble" ? printBytes : printBytesSerial;
    // Elegir puerto/dispositivo exige el gesto del usuario: no se encola (la espera podría vencer el gesto).
    const name = forceChoose
      ? await send(bytes(), { forceChoose })
      : await enqueue(() => send(bytes(), { forceChoose }));
    toast.success(`Enviado a ${name}`);
    return true;
  } catch (err) {
    const msg =
      err instanceof BluetoothPrintError ? err.message : err instanceof Error ? err.message : "Error desconocido";
    toast.error("No se pudo imprimir", { description: msg });
    return false;
  }
}

export function printTestTicket(restaurantName: string, width: PaperWidth, forceChoose?: boolean, transport?: PrintTransport) {
  return run(() => buildTestTicket(restaurantName, width), "Imprimiendo prueba", forceChoose, transport);
}

export function printCashCloseTicket(summary: CashRegisterSummary, width: PaperWidth) {
  return run(() => buildCashCloseTicket(summary, width), "Imprimiendo cierre en térmica");
}

// ---------------------------------------------------------------------------
// Impresión automática (sin preguntar) y cola de trabajos
// ---------------------------------------------------------------------------

let queueTail: Promise<unknown> = Promise.resolve();

/** Serializa los trabajos: dos impresiones seguidas no chocan al abrir/escribir el puerto. */
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const result = queueTail.then(job, job);
  queueTail = result.catch(() => undefined);
  return result;
}

const NO_PRINTER_WARNED_KEY = "triada.noPrinterWarned";
let noPrinterWarned = false;

/** Aviso "no hay impresora" una sola vez por sesión (salvo impresiones manuales, que siempre avisan). */
function warnNoPrinter(always: boolean, reason?: string) {
  if (!always) {
    if (noPrinterWarned) return;
    try {
      if (window.sessionStorage.getItem(NO_PRINTER_WARNED_KEY)) {
        noPrinterWarned = true;
        return;
      }
      window.sessionStorage.setItem(NO_PRINTER_WARNED_KEY, "1");
    } catch {
      /* ignorar */
    }
    noPrinterWarned = true;
  }
  toast.warning("No hay impresora configurada en este navegador", {
    description: reason ?? "En el módulo Impresoras, elige la impresora con “Conectar y probar” para imprimir automáticamente.",
    duration: 10000,
  });
}

export interface AutoPrintOptions {
  /** Impresión pedida con un botón (reimprimir): avisa siempre y muestra el progreso. */
  manual?: boolean;
}

/**
 * Envía bytes a la impresora recordada SIN abrir selectores (requestPort/requestDevice exigen gesto del usuario).
 * Si no hay impresora: aviso único por sesión. Si falla: toast de error con "Reintentar" (mismos bytes).
 */
export async function autoPrint(bytes: Uint8Array, label: string, opts: AutoPrintOptions = {}): Promise<boolean> {
  const transport = getPrintTransport();
  const support = checkTransportSupport(transport);
  if (!support.supported) {
    warnNoPrinter(!!opts.manual, support.reason);
    return false;
  }
  if (opts.manual) toast.info(`${label}…`, { duration: 2000 });
  try {
    const send = transport === "ble" ? printBytes : printBytesSerial;
    const name = await enqueue(() => send(bytes, { noPrompt: true }));
    toast.success(`${label}: enviado a ${name}`, { duration: 2500 });
    return true;
  } catch (err) {
    if (err instanceof NoPrinterConfiguredError) {
      warnNoPrinter(!!opts.manual);
      return false;
    }
    const reason = (err instanceof Error ? err.message : "Error desconocido").replace(/\.$/, "");
    toast.error(`No se pudo imprimir: ${label}`, {
      description: `${reason}. Puedes reimprimir desde el detalle del pedido.`,
      duration: 15000,
    });
    return false;
  }
}
