/**
 * Utilidades ESC/POS mínimas para mini impresoras térmicas (58/80 mm).
 * El texto se normaliza a ASCII (sin tildes) porque las tablas de caracteres varían entre modelos.
 */
import type { PaperWidth } from "@/lib/api/types";

export const ESC = 0x1b;
export const GS = 0x1d;
export const LF = 0x0a;

/** Columnas de texto en fuente A según el ancho de papel. */
export function columnsFor(width: PaperWidth): number {
  return width === 80 ? 48 : 32;
}

export function toAscii(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^\x0a\x20-\x7e]/g, "?");
}

export type Align = "left" | "center" | "right";
export type TextSize = 1 | 2 | "tall";

/** Constructor encadenable de comandos ESC/POS. */
export class EscPosBuilder {
  private bytes: number[] = [];

  raw(...b: number[]) {
    this.bytes.push(...b);
    return this;
  }

  init() {
    return this.raw(ESC, 0x40); // ESC @
  }

  align(a: Align) {
    return this.raw(ESC, 0x61, a === "center" ? 1 : a === "right" ? 2 : 0);
  }

  bold(on: boolean) {
    return this.raw(ESC, 0x45, on ? 1 : 0);
  }

  /**
   * Tamaño de carácter: 1 = normal, 2 = doble alto y ancho (la mitad de columnas),
   * "tall" = doble alto con ancho normal (mismas columnas; ideal para la comanda).
   */
  size(mult: TextSize) {
    return this.raw(GS, 0x21, mult === 2 ? 0x11 : mult === "tall" ? 0x01 : 0x00);
  }

  text(t: string) {
    const ascii = toAscii(t);
    for (let i = 0; i < ascii.length; i++) this.bytes.push(ascii.charCodeAt(i));
    return this;
  }

  line(t = "") {
    return this.text(t).raw(LF);
  }

  lines(ls: string[]) {
    ls.forEach((l) => this.line(l));
    return this;
  }

  feed(n = 1) {
    return this.raw(ESC, 0x64, Math.max(0, Math.min(255, n)));
  }

  /** Corte parcial con avance (las impresoras sin cutter lo ignoran). */
  cut() {
    return this.feed(3).raw(GS, 0x56, 0x42, 0x00);
  }

  build(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
}

// ---- Helpers de formato de texto a ancho fijo ----

export function padRight(s: string, n: number) {
  s = toAscii(s);
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

export function padLeft(s: string, n: number) {
  s = toAscii(s);
  return s.length >= n ? s.slice(0, n) : " ".repeat(n - s.length) + s;
}

export function center(s: string, n: number) {
  s = toAscii(s);
  if (s.length >= n) return s.slice(0, n);
  const left = Math.floor((n - s.length) / 2);
  return " ".repeat(left) + s;
}

/** "Etiqueta ........ valor" ajustado al ancho. */
export function twoCols(label: string, value: string, n: number) {
  label = toAscii(label);
  value = toAscii(value);
  const space = n - value.length - 1;
  if (space < 4) return [label, padLeft(value, n)].join("\n");
  return padRight(label, space) + " " + value;
}

export function rule(n: number, ch = "-") {
  return ch.repeat(n);
}

/** Parte texto largo en líneas del ancho dado. */
export function wrap(text: string, n: number): string[] {
  const words = toAscii(text).split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= n) cur += " " + w;
    else {
      out.push(cur);
      cur = w;
    }
    while (cur.length > n) {
      out.push(cur.slice(0, n));
      cur = cur.slice(n);
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** Monto sin símbolo de moneda localizado (ASCII seguro): "$ 1234.50". */
export function amount(v: number | null | undefined) {
  const n = Number(v ?? 0);
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}
