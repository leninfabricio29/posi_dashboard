import autoTable from "jspdf-autotable";
import type { SalesReport } from "@/lib/api/types";
import { fmtDate, fmtDateTime, money } from "@/lib/format";
import { MARGIN, addFooter, createDoc, lastY, sectionTitle } from "./common";

const HEAD = { fillColor: [38, 38, 38] as [number, number, number], textColor: 255, fontStyle: "bold" as const };
const right = { halign: "right" as const };

export function buildSalesReportPdf(r: SalesReport, restaurantName: string) {
  const doc = createDoc();
  const w = doc.internal.pageSize.getWidth();
  let y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(restaurantName, w / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(12);
  doc.text("Reporte de ventas", w / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Del ${fmtDate(r.from + "T00:00:00")} al ${fmtDate(r.to + "T00:00:00")}`, w / 2, y, { align: "center" });
  y += 6;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9 },
    headStyles: HEAD,
    head: [["Ventas", "Subtotal", "IVA", "Total", "Efectivo", "Transferencia", "Ticket prom."]],
    body: [
      [
        String(r.totals.count),
        money(r.totals.subtotal),
        money(r.totals.tax),
        money(r.totals.total),
        money(r.totals.cash),
        money(r.totals.transfer),
        money(r.totals.averageTicket),
      ],
    ],
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastY(doc, y) + 8;

  y = sectionTitle(doc, "Por semana (lunes a domingo)", y);
  autoTable(doc, {
    startY: y,
    theme: "striped",
    styles: { fontSize: 9 },
    headStyles: HEAD,
    head: [["Semana", "Ventas", "Efectivo", "Transferencia", "Total"]],
    body: r.byWeek.map((wk) => [
      `${fmtDate(wk.weekStart + "T00:00:00")} – ${fmtDate(wk.weekEnd + "T00:00:00")}`,
      String(wk.count),
      money(wk.cash),
      money(wk.transfer),
      money(wk.total),
    ]),
    columnStyles: { 1: right, 2: right, 3: right, 4: right },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastY(doc, y) + 8;

  y = sectionTitle(doc, "Por día", y);
  autoTable(doc, {
    startY: y,
    theme: "striped",
    styles: { fontSize: 8 },
    headStyles: HEAD,
    head: [["Fecha", "Ventas", "Efectivo", "Transferencia", "Total"]],
    body: r.byDay.map((d) => [
      fmtDate(d.date + "T00:00:00"),
      String(d.count),
      money(d.cash),
      money(d.transfer),
      money(d.total),
    ]),
    columnStyles: { 1: right, 2: right, 3: right, 4: right },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastY(doc, y) + 8;

  y = sectionTitle(doc, "Top productos", y);
  autoTable(doc, {
    startY: y,
    theme: "striped",
    styles: { fontSize: 9 },
    headStyles: HEAD,
    head: [["#", "Producto", "Cantidad", "Total"]],
    body: r.topProducts.length
      ? r.topProducts.map((p, i) => [String(i + 1), p.name, String(p.quantity), money(p.total)])
      : [["—", "Sin datos", "", ""]],
    columnStyles: { 2: right, 3: right },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastY(doc, y) + 8;

  y = sectionTitle(doc, "Ventas por usuario", y);
  autoTable(doc, {
    startY: y,
    theme: "striped",
    styles: { fontSize: 9 },
    headStyles: HEAD,
    head: [["Usuario", "Ventas", "Total"]],
    body: r.byUser.length ? r.byUser.map((u) => [u.name, String(u.count), money(u.total)]) : [["Sin datos", "", ""]],
    columnStyles: { 1: right, 2: right },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastY(doc, y) + 8;

  if (r.sales.length) {
    y = sectionTitle(doc, `Detalle de ventas (${r.sales.length})`, y);
    autoTable(doc, {
      startY: y,
      theme: "striped",
      styles: { fontSize: 7.5 },
      headStyles: HEAD,
      head: [["Fecha", "Pedido", "Mesa", "Usuario", "Efectivo", "Transf.", "Total"]],
      body: r.sales.map((s) => [
        fmtDateTime(s.createdAt),
        `#${s.orderNumber}`,
        s.tableName ?? "Para llevar",
        s.userName,
        money(s.cash),
        money(s.transfer),
        money(s.total),
      ]),
      columnStyles: { 4: right, 5: right, 6: right },
      margin: { left: MARGIN, right: MARGIN },
    });
  }

  addFooter(doc, `${restaurantName} · Reporte de ventas`);
  return { doc, filename: `reporte-ventas-${r.from}_${r.to}.pdf` };
}
