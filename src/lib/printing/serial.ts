/// <reference types="w3c-web-serial" />
/**
 * Impresión por puerto serie con Web Serial (Chrome/Edge de escritorio, https o localhost).
 *
 * Es la vía para impresoras Bluetooth CLÁSICAS (SPP), como la JK-5801P o las "POS-58": Web Bluetooth
 * solo ve dispositivos BLE, así que estas nunca aparecen en su selector. Al emparejarlas en Windows se crea
 * un puerto COM ("Vínculo serie estándar a través de Bluetooth") que Web Serial puede abrir.
 * También sirve para impresoras USB que se instalan como puerto COM.
 *
 * El permiso del puerto queda guardado por el navegador: tras elegirlo una vez, se reutiliza sin preguntar.
 */
import { BluetoothPrintError, NoPrinterConfiguredError } from "./bluetooth";

/** Serial Port Profile: permite que Chrome liste también impresoras Bluetooth clásicas emparejadas. */
const SPP_UUID = "00001101-0000-1000-8000-00805f9b34fb";
const BAUD_RATE = 9600; // en puertos Bluetooth virtuales se ignora; 9600 es el valor típico en USB
const CHUNK_SIZE = 256;
const CHUNK_DELAY_MS = 20;
const LABEL_KEY = "triada.serialPrinterLabel";

export interface SerialSupport {
  supported: boolean;
  reason?: string;
}

export function checkSerialSupport(): SerialSupport {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { supported: false, reason: "Disponible solo en el navegador." };
  }
  if (!window.isSecureContext) {
    return { supported: false, reason: "El puerto serie requiere https o http://localhost." };
  }
  if (!("serial" in navigator) || !navigator.serial) {
    return {
      supported: false,
      reason: "Este navegador no soporta Web Serial. Usa Google Chrome o Microsoft Edge en una computadora.",
    };
  }
  return { supported: true };
}

let current: SerialPort | null = null;

function portLabel(port: SerialPort): string {
  const info = port.getInfo() as SerialPortInfo & { bluetoothServiceClassId?: string };
  if (info.bluetoothServiceClassId) return "Impresora Bluetooth (puerto serie)";
  if (info.usbVendorId) return `Impresora USB (${info.usbVendorId.toString(16)}:${info.usbProductId?.toString(16) ?? "?"})`;
  return "Impresora (puerto COM)";
}

export function getSerialPrinterLabel(): string | null {
  try {
    return window.localStorage.getItem(LABEL_KEY);
  } catch {
    return null;
  }
}

function rememberLabel(label: string | null) {
  try {
    if (label) window.localStorage.setItem(LABEL_KEY, label);
    else window.localStorage.removeItem(LABEL_KEY);
  } catch {
    /* ignorar */
  }
}

export async function forgetSerialPrinter() {
  const port = current;
  current = null;
  rememberLabel(null);
  if (!port) return;
  try {
    await port.close();
  } catch {
    /* ya estaba cerrado */
  }
  try {
    await port.forget(); // revoca el permiso guardado (Chrome 103+)
  } catch {
    /* navegador sin forget() */
  }
}

async function openPort(port: SerialPort) {
  if (port.writable) return; // ya abierto
  try {
    await port.open({ baudRate: BAUD_RATE });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    throw new BluetoothPrintError(
      /already open/i.test(msg)
        ? "El puerto está en uso por otra pestaña o programa. Ciérralo e intenta de nuevo."
        : "No se pudo abrir el puerto. Verifica que la impresora esté encendida, emparejada y cerca del equipo."
    );
  }
}

/** Pide al usuario que elija el puerto de la impresora (requiere gesto del usuario). */
async function requestPort(): Promise<SerialPort> {
  try {
    return await navigator.serial.requestPort({ allowedBluetoothServiceClassIds: [SPP_UUID] } as SerialPortRequestOptions);
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotFoundError") {
      throw new BluetoothPrintError(
        "No se seleccionó ningún puerto. Si la impresora no aparece, emparéjala primero en Configuración de Windows › Bluetooth."
      );
    }
    if (err instanceof DOMException && err.name === "SecurityError") {
      throw new BluetoothPrintError("El navegador bloqueó el acceso al puerto serie. Revisa los permisos del sitio.");
    }
    throw new BluetoothPrintError(err instanceof Error ? err.message : "No se pudo abrir el selector de puertos.");
  }
}

/**
 * Puerto recordado: el de esta sesión o uno con permiso ya concedido; si no hay, pide elegir.
 * Con `noPrompt` nunca abre el selector (requestPort exige gesto del usuario): si no hay, lanza NoPrinterConfiguredError.
 */
async function getPort(forceChoose: boolean, noPrompt = false): Promise<SerialPort> {
  if (noPrompt || !forceChoose) {
    if (current) return current;
    const granted = await navigator.serial.getPorts();
    if (granted.length === 1 || (granted.length > 1 && getSerialPrinterLabel())) return granted[0];
  }
  if (noPrompt) throw new NoPrinterConfiguredError();
  return requestPort();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Envía bytes ESC/POS por el puerto serie. Devuelve un nombre legible del dispositivo. */
export async function printBytesSerial(
  data: Uint8Array,
  opts: { forceChoose?: boolean; noPrompt?: boolean } = {}
): Promise<string> {
  const support = checkSerialSupport();
  if (!support.supported) throw new BluetoothPrintError(support.reason ?? "Web Serial no disponible.");

  const port = await getPort(!!opts.forceChoose, !!opts.noPrompt);
  await openPort(port);
  current = port;
  const label = portLabel(port);
  rememberLabel(label);

  const writer = port.writable!.getWriter();
  try {
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      await writer.write(data.slice(i, i + CHUNK_SIZE));
      await sleep(CHUNK_DELAY_MS);
    }
  } catch (err) {
    current = null;
    try {
      writer.releaseLock();
      await port.close();
    } catch {
      /* ignorar */
    }
    throw new BluetoothPrintError(
      `Error al enviar datos a la impresora: ${err instanceof Error ? err.message : "desconocido"}. ` +
        "Si es Bluetooth, verifica que esté encendida y vuelve a intentar."
    );
  }
  writer.releaseLock();
  return label;
}
