"use client";

import * as React from "react";
import { Download, Printer as PrinterIcon, Bluetooth } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { CashRegisterSummary, PaperWidth } from "@/lib/api/types";
import { printCashCloseTicket } from "@/lib/printing/actions";

/** Descarga el PDF del cierre. */
export async function downloadCashPdf(summary: CashRegisterSummary) {
  const { buildCashClosePdf } = await import("@/lib/pdf/cash-close");
  const { doc, filename } = buildCashClosePdf(summary);
  doc.save(filename);
}

/** Abre el PDF del cierre en una pestaña nueva con diálogo de impresión. */
export async function printCashPdf(summary: CashRegisterSummary) {
  const [{ buildCashClosePdf }, { openPdfForPrint }] = await Promise.all([
    import("@/lib/pdf/cash-close"),
    import("@/lib/pdf/common"),
  ]);
  const { doc, filename } = buildCashClosePdf(summary);
  if (!openPdfForPrint(doc, filename)) {
    toast.info("El navegador bloqueó la ventana emergente: se descargó el PDF para imprimirlo.");
  }
}

export function CashReportActions({
  getSummary,
  paperWidth,
  size = "default",
  compact,
}: {
  /** Devuelve el resumen (puede ir a la API para cierres del historial). */
  getSummary: () => Promise<CashRegisterSummary> | CashRegisterSummary;
  paperWidth: PaperWidth;
  size?: "default" | "sm";
  compact?: boolean;
}) {
  const [busy, setBusy] = React.useState<null | "pdf" | "print" | "bt">(null);

  async function run(kind: "pdf" | "print" | "bt") {
    setBusy(kind);
    try {
      const s = await getSummary();
      if (kind === "pdf") await downloadCashPdf(s);
      else if (kind === "print") await printCashPdf(s);
      else await printCashCloseTicket(s, paperWidth);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar el reporte");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size={size} onClick={() => run("pdf")} disabled={!!busy}>
        <Download /> {compact ? "PDF" : "Descargar PDF"}
      </Button>
      <Button variant="outline" size={size} onClick={() => run("print")} disabled={!!busy}>
        <PrinterIcon /> {compact ? "Imprimir" : "Imprimir PDF"}
      </Button>
      <Button variant="outline" size={size} onClick={() => run("bt")} disabled={!!busy}>
        <Bluetooth /> {compact ? "Térmica" : `Imprimir en térmica (${paperWidth} mm)`}
      </Button>
    </div>
  );
}
