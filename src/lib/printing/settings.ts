/**
 * Ajustes de impresión automática, guardados POR NAVEGADOR (localStorage).
 * Leer solo en efectos o handlers (nunca durante el render: rompería la hidratación).
 */

export interface PrintSettings {
  /** Comanda de cocina al guardar un pedido nuevo. */
  autoPrintKitchen: boolean;
  /** Adicional/anulado al agregar, cambiar cantidad o quitar productos. */
  autoPrintAdditions: boolean;
  /** Recibo al cobrar. */
  autoPrintReceipt: boolean;
  /** Esta computadora imprime también lo que crean/modifican OTROS (app de meseros, otra caja) vía tiempo real. */
  printStation: boolean;
  /** Copias de comanda/adicional (1–3). */
  copies: 1 | 2 | 3;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  autoPrintKitchen: true,
  autoPrintAdditions: true,
  autoPrintReceipt: true,
  printStation: false,
  copies: 1,
};

const KEY = "triada.printSettings";
const CHANGE_EVENT = "triada:print-settings";

function normalizeCopies(v: unknown): 1 | 2 | 3 {
  const n = Math.round(Number(v));
  return n >= 3 ? 3 : n === 2 ? 2 : 1;
}

function parse(raw: string | null): PrintSettings {
  if (!raw) return { ...DEFAULT_PRINT_SETTINGS };
  try {
    const v = JSON.parse(raw) as Partial<Record<keyof PrintSettings, unknown>>;
    const bool = (x: unknown, d: boolean) => (typeof x === "boolean" ? x : d);
    return {
      autoPrintKitchen: bool(v.autoPrintKitchen, DEFAULT_PRINT_SETTINGS.autoPrintKitchen),
      autoPrintAdditions: bool(v.autoPrintAdditions, DEFAULT_PRINT_SETTINGS.autoPrintAdditions),
      autoPrintReceipt: bool(v.autoPrintReceipt, DEFAULT_PRINT_SETTINGS.autoPrintReceipt),
      printStation: bool(v.printStation, DEFAULT_PRINT_SETTINGS.printStation),
      copies: v.copies === undefined ? DEFAULT_PRINT_SETTINGS.copies : normalizeCopies(v.copies),
    };
  } catch {
    return { ...DEFAULT_PRINT_SETTINGS };
  }
}

export function getPrintSettings(): PrintSettings {
  try {
    return parse(window.localStorage.getItem(KEY));
  } catch {
    return { ...DEFAULT_PRINT_SETTINGS };
  }
}

export function setPrintSettings(patch: Partial<PrintSettings>): PrintSettings {
  const next = { ...getPrintSettings(), ...patch };
  next.copies = normalizeCopies(next.copies);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* almacenamiento bloqueado: el ajuste dura hasta recargar */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  return next;
}

/** Avisa cuando cambian los ajustes (en esta pestaña o en otra del mismo navegador). */
export function subscribePrintSettings(cb: (s: PrintSettings) => void): () => void {
  const onLocal = () => cb(getPrintSettings());
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb(getPrintSettings());
  };
  window.addEventListener(CHANGE_EVENT, onLocal);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onLocal);
    window.removeEventListener("storage", onStorage);
  };
}
