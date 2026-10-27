import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { CashRegisterSummary } from "@/lib/api/types";
import { fmtDateTime, fmtTime, money } from "@/lib/format";
import { MARGIN, addFooter, createDoc, ensureSpace, lastY, sectionTitle } from "./common";

const HEAD = { fillColor: [38, 38, 38] as [number, number, number], textColor: 255, fontStyle: "bold" as const };

/** Genera el PDF de cierre (o corte si la caja sigue abierta) a partir de CashRegisterSummary. */
export function buildCashClosePdf(s: CashRegisterSummary) {
  const doc = createDoc();
  const w = doc.internal.pageSize.getWidth();
  let y = 16;

  // Encabezado del restaurante
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(s.restaurant.name, w / 2, y, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const info = [
    s.restaurant.ruc ? `RUC: ${s.restaurant.ruc}` : null,
    s.restaurant.address,
    s.restaurant.phone ? `Tel: ${s.restaurant.phone}` : null,
  ].filter(Boolean) as string[];
  info.forEach((line) => {
    y += 4.5;
    doc.text(line, w / 2, y, { align: "center" });
  });
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(s.status === "CLOSED" ? "REPORTE DE CIERRE DE CAJA" : "CORTE DE CAJA (CAJA ABIERTA)", w / 2, y, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  y += 4;

  // Apertura / cierre
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9 },
    headStyles: HEAD,
    head: [["", "Apertura", "Cierre"]],
    body: [
      ["Fecha y hora", fmtDateTime(s.openedAt), fmtDateTime(s.closedAt)],
      ["Responsable", s.openedBy.name, s.closedBy?.name ?? "—"],
      ["Monto / conteo", money(s.initialAmount), s.countedCash === null ? "—" : money(s.countedCash)],
      ["Notas", s.notes ?? "—", s.closingNotes ?? "—"],
    ],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 40 } },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastY(doc, y) + 8;

  // Ventas
  y = sectionTitle(doc, "Ventas", y);
  autoTable(doc, {
    startY: y,
    theme: "striped",
    styles: { fontSize: 9 },
    headStyles: HEAD,
    head: [["Concepto", "Monto"]],
    body: [
      ["Cantidad de ventas", String(s.sales.count)],
      ["Subtotal (sin IVA)", money(s.sales.subtotal)],
      ["IVA", money(s.sales.tax)],
      ["Ventas totales", money(s.sales.total)],
      ["Cobrado en efectivo", money(s.sales.cash)],
      ["Cobrado por transferencia", money(s.sales.transfer)],
    ],
    columnStyles: { 1: { halign: "right" } },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastY(doc, y) + 8;

  // Transferencias
  y = sectionTitle(doc, `Transferencias (${s.transfers.length})`, y);
  autoTable(doc, {
    startY: y,
    theme: "striped",
    styles: { fontSize: 9 },
    headStyles: HEAD,
    head: [["Hora", "Pedido", "Código de transferencia", "Monto"]],
    body: s.transfers.length
      ? s.transfers.map((t) => [fmtTime(t.createdAt), `#${t.orderNumber}`, t.reference, money(t.amount)])
      : [["—", "—", "Sin transferencias", money(0)]],
    foot: [["", "", "Total transferencias", money(s.sales.transfer)]],
    footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: "bold" },
    columnStyles: { 3: { halign: "right" } },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastY(doc, y) + 8;

  // Ingresos / egresos
  y = sectionTitle(doc, "Ingresos y egresos de efectivo", y);
  autoTable(doc, {
    startY: y,
    theme: "striped",
    styles: { fontSize: 9 },
    headStyles: HEAD,
    head: [["Hora", "Tipo", "Motivo", "Usuario", "Monto"]],
    body: s.movements.length
      ? s.movements.map((m) => [
          fmtTime(m.createdAt),
          m.type === "INCOME" ? "Ingreso" : "Egreso",
          m.reason,
          m.userName,
          (m.type === "EXPENSE" ? "-" : "+") + money(m.amount),
        ])
      : [["—", "—", "Sin movimientos", "—", money(0)]],
    foot: [
      ["", "", "Total ingresos", "", money(s.incomes)],
      ["", "", "Total egresos", "", money(s.expenses)],
    ],
    footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: "bold" },
    columnStyles: { 4: { halign: "right" } },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastY(doc, y) + 8;

  // Cuadre de efectivo
  y = ensureSpace(doc, y, 50);
  y = sectionTitle(doc, "Cuadre de efectivo", y);
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 10 },
    body: [
      ["Monto inicial", money(s.initialAmount)],
      ["+ Ventas en efectivo", money(s.sales.cash)],
      ["+ Ingresos", money(s.incomes)],
      ["- Egresos", money(s.expenses)],
      ["= Efectivo esperado", money(s.expectedCash)],
      ["Efectivo contado", s.countedCash === null ? "—" : money(s.countedCash)],
      ["Diferencia", s.difference === null ? "—" : money(s.difference)],
    ],
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
    didParseCell: (data) => {
      if (data.row.index === 6 && data.column.index === 1 && s.difference !== null && s.difference !== 0) {
        data.cell.styles.textColor = s.difference < 0 ? [185, 28, 28] : [21, 128, 61];
        data.cell.styles.fontStyle = "bold";
      }
      if (data.row.index === 4) data.cell.styles.fontStyle = "bold";
    },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastY(doc, y) + 8;

  // Detalle de ventas
  if (s.salesList.length) {
    y = sectionTitle(doc, "Detalle de ventas", y);
    autoTable(doc, {
      startY: y,
      theme: "striped",
      styles: { fontSize: 8 },
      headStyles: HEAD,
      head: [["Hora", "Pedido", "Mesa", "Efectivo", "Transferencia", "Total"]],
      body: s.salesList.map((v) => [
        fmtTime(v.createdAt),
        `#${v.orderNumber}`,
        v.tableName ?? "Para llevar",
        money(v.cash),
        money(v.transfer),
        money(v.total),
      ]),
      columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
      margin: { left: MARGIN, right: MARGIN },
    });
    y = lastY(doc, y) + 8;
  }

  // Firmas
  y = ensureSpace(doc, y + 10, 25);
  doc.setFontSize(9);
  doc.line(MARGIN, y + 10, MARGIN + 70, y + 10);
  doc.line(w - MARGIN - 70, y + 10, w - MARGIN, y + 10);
  doc.text("Entrega (cajero)", MARGIN, y + 15);
  doc.text("Recibe (administrador)", w - MARGIN - 70, y + 15);

  addFooter(doc, `${s.restaurant.name} · Caja ${s.id.slice(0, 8)}`);
  const stamp = format(new Date(s.closedAt ?? s.openedAt), "yyyyMMdd-HHmm");
  return { doc, filename: `cierre-caja-${stamp}.pdf` };
}
