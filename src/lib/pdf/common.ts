import { jsPDF } from "jspdf";
import { format } from "date-fns";

export const MARGIN = 14;

export function createDoc() {
  return new jsPDF({ unit: "mm", format: "a4" });
}

/** Posición Y final de la última tabla dibujada con autoTable. */
export function lastY(doc: jsPDF, fallback: number): number {
  const t = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable;
  return t?.finalY ?? fallback;
}

/** Salta de página si no hay espacio suficiente. */
export function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const h = doc.internal.pageSize.getHeight();
  if (y + needed > h - MARGIN) {
    doc.addPage();
    return MARGIN + 4;
  }
  return y;
}

export function sectionTitle(doc: jsPDF, title: string, y: number): number {
  y = ensureSpace(doc, y, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title, MARGIN, y);
  doc.setFont("helvetica", "normal");
  return y + 2;
}

export function addFooter(doc: jsPDF, label: string) {
  const pages = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`${label} · Generado ${format(new Date(), "dd/MM/yyyy HH:mm")}`, MARGIN, h - 8);
    doc.text(`Página ${i} de ${pages}`, w - MARGIN, h - 8, { align: "right" });
    doc.setTextColor(0);
  }
}

export function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename);
}

/**
 * Abre el PDF en una pestaña nueva con diálogo de impresión automático.
 * Si el navegador bloquea la ventana emergente, lo descarga. Devuelve true si se abrió.
 */
export function openPdfForPrint(doc: jsPDF, filename: string): boolean {
  doc.autoPrint();
  const url = doc.output("bloburl");
  const win = window.open(url, "_blank");
  if (!win) {
    doc.save(filename);
    return false;
  }
  return true;
}
