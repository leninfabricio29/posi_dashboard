/**
 * Impresión en mini impresoras térmicas BLE vía Web Bluetooth (solo Chrome/Edge, en https o localhost).
 * Se recuerda la última impresora conectada durante la sesión del navegador.
 */

export const PRINTER_SERVICE_UUIDS: BluetoothServiceUUID[] = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "0000ff00-0000-1000-8000-00805f9b34fb",
];

const CHUNK_SIZE = 180;
const CHUNK_DELAY_MS = 25;
const LAST_NAME_KEY = "triada.lastBlePrinter";

export class BluetoothPrintError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BluetoothPrintError";
  }
}

/** No hay impresora recordada/permitida en este navegador y no se puede preguntar (impresión automática). */
export class NoPrinterConfiguredError extends BluetoothPrintError {
  constructor(message = "No hay impresora configurada en este navegador.") {
    super(message);
    this.name = "NoPrinterConfiguredError";
  }
}

export interface BluetoothSupport {
  supported: boolean;
  reason?: string;
}

export function checkBluetoothSupport(): BluetoothSupport {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { supported: false, reason: "Disponible solo en el navegador." };
  }
  if (!window.isSecureContext) {
    return {
      supported: false,
      reason: "Web Bluetooth requiere una conexión segura (https) o http://localhost.",
    };
  }
  if (!("bluetooth" in navigator) || !navigator.bluetooth) {
    return {
      supported: false,
      reason: "Este navegador no soporta Web Bluetooth. Usa Google Chrome o Microsoft Edge en escritorio o Android.",
    };
  }
  return { supported: true };
}

interface Connection {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
}

let current: Connection | null = null;

export function getLastPrinterName(): string | null {
  if (current?.device.name) return current.device.name;
  try {
    return window.sessionStorage.getItem(LAST_NAME_KEY);
  } catch {
    return null;
  }
}

export function forgetPrinter() {
  try {
    current?.device.gatt?.disconnect();
  } catch {
    /* ignorar */
  }
  current = null;
  try {
    window.sessionStorage.removeItem(LAST_NAME_KEY);
  } catch {
    /* ignorar */
  }
}

function canWrite(c: BluetoothRemoteGATTCharacteristic) {
  return c.properties.write || c.properties.writeWithoutResponse;
}

async function findWritableCharacteristic(server: BluetoothRemoteGATTServer) {
  let services: BluetoothRemoteGATTService[] = [];
  try {
    services = await server.getPrimaryServices();
  } catch {
    // Algunos dispositivos no permiten listar: se prueba servicio por servicio.
    for (const uuid of PRINTER_SERVICE_UUIDS) {
      try {
        services.push(await server.getPrimaryService(uuid));
      } catch {
        /* no existe en este dispositivo */
      }
    }
  }
  // Priorizar los servicios conocidos de impresoras.
  services.sort((a, b) => {
    const ia = PRINTER_SERVICE_UUIDS.indexOf(a.uuid);
    const ib = PRINTER_SERVICE_UUIDS.indexOf(b.uuid);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  for (const service of services) {
    try {
      const chars = await service.getCharacteristics();
      const found = chars.find(canWrite);
      if (found) return found;
    } catch {
      /* continuar con el siguiente servicio */
    }
  }
  return null;
}

async function connectDevice(device: BluetoothDevice): Promise<Connection> {
  if (!device.gatt) throw new BluetoothPrintError("El dispositivo no expone GATT (no es una impresora BLE compatible).");
  let server: BluetoothRemoteGATTServer;
  try {
    server = device.gatt.connected ? device.gatt : await device.gatt.connect();
  } catch {
    throw new BluetoothPrintError(
      "No se pudo conectar con la impresora. Verifica que esté encendida, cerca y no conectada a otro equipo."
    );
  }
  const characteristic = await findWritableCharacteristic(server);
  if (!characteristic) {
    server.disconnect();
    throw new BluetoothPrintError(
      "No se encontró una característica de escritura. El dispositivo elegido no parece ser una impresora térmica compatible."
    );
  }
  device.addEventListener("gattserverdisconnected", () => {
    // Se conserva `device` para reconectar sin volver a elegirlo.
  });
  const conn = { device, characteristic };
  current = conn;
  try {
    if (device.name) window.sessionStorage.setItem(LAST_NAME_KEY, device.name);
  } catch {
    /* ignorar */
  }
  return conn;
}

/** Pide al usuario que elija una impresora (requiere gesto del usuario). */
export async function requestPrinter(): Promise<Connection> {
  const support = checkBluetoothSupport();
  if (!support.supported) throw new BluetoothPrintError(support.reason ?? "Web Bluetooth no disponible.");
  let device: BluetoothDevice;
  try {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICE_UUIDS,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotFoundError") {
      throw new BluetoothPrintError("No se seleccionó ninguna impresora.");
    }
    if (err instanceof DOMException && err.name === "SecurityError") {
      throw new BluetoothPrintError("El navegador bloqueó el acceso a Bluetooth. Revisa los permisos del sitio.");
    }
    throw new BluetoothPrintError(err instanceof Error ? err.message : "No se pudo abrir el selector Bluetooth.");
  }
  return connectDevice(device);
}

/**
 * Usa la última impresora de la sesión; si no hay, pide elegir una.
 * Con `noPrompt` nunca abre el selector (requestDevice exige gesto del usuario): si no hay, lanza NoPrinterConfiguredError.
 */
async function getConnection(forceChoose = false, noPrompt = false): Promise<Connection> {
  if ((noPrompt || !forceChoose) && current) {
    if (current.device.gatt?.connected) return current;
    try {
      return await connectDevice(current.device);
    } catch (err) {
      if (noPrompt) throw err; // conserva `current`: se puede reintentar cuando la impresora vuelva
      current = null;
    }
  }
  if (noPrompt) throw new NoPrinterConfiguredError();
  return requestPrinter();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function writeChunks(characteristic: BluetoothRemoteGATTCharacteristic, data: Uint8Array) {
  const noResponse = characteristic.properties.writeWithoutResponse;
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    if (noResponse && typeof characteristic.writeValueWithoutResponse === "function") {
      await characteristic.writeValueWithoutResponse(chunk);
    } else if (typeof characteristic.writeValueWithResponse === "function") {
      await characteristic.writeValueWithResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
    await sleep(CHUNK_DELAY_MS);
  }
}

/**
 * Envía bytes ESC/POS a la impresora BLE. Devuelve el nombre del dispositivo usado.
 * `forceChoose` abre el selector aunque haya una impresora recordada; `noPrompt` nunca lo abre.
 */
export async function printBytes(
  data: Uint8Array,
  opts: { forceChoose?: boolean; noPrompt?: boolean } = {}
): Promise<string> {
  const conn = await getConnection(opts.forceChoose, opts.noPrompt);
  try {
    await writeChunks(conn.characteristic, data);
  } catch (err) {
    // Un reintento tras reconectar (la conexión BLE se cae con facilidad).
    try {
      const again = await connectDevice(conn.device);
      await writeChunks(again.characteristic, data);
    } catch {
      throw new BluetoothPrintError(
        `Error al enviar datos a la impresora: ${err instanceof Error ? err.message : "desconocido"}`
      );
    }
  }
  return conn.device.name || "Impresora Bluetooth";
}
