"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SimpleSelect } from "@/components/common";
import { cn } from "@/lib/utils";

/**
 * Tabla estándar del panel: buscador + paginación del lado del cliente.
 * Úsala para TODAS las tablas; así todas se comportan igual.
 *
 *   <DataTable
 *     data={products}
 *     rowKey={(p) => p.id}
 *     searchText={(p) => [p.name, p.description]}
 *     columns={[
 *       { header: "Nombre", cell: (p) => p.name },
 *       { header: "Precio", cell: (p) => money(p.price), align: "right" },
 *     ]}
 *   />
 */
export interface DataTableColumn<T> {
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  align?: "left" | "right" | "center";
  /** Clases extra para th y td de esta columna (anchos, ocultar en móvil, etc.). */
  className?: string;
}

const PAGE_SIZES = ["10", "25", "50", "100"] as const;

/** minúsculas y sin tildes: "Café" coincide con "cafe". */
function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" } as const;

export function DataTable<T>({
  data,
  columns,
  rowKey,
  searchText,
  searchPlaceholder = "Buscar…",
  pageSize: initialPageSize = 10,
  emptyMessage = "No hay registros.",
  onRowClick,
  rowClassName,
  footer,
  toolbar,
  className,
}: {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string;
  /** Textos de la fila en los que busca el buscador. Si se omite, la tabla no muestra buscador. */
  searchText?: (row: T) => Array<string | number | null | undefined>;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  /** Fila de totales u otra fila fija al pie (se calcula sobre lo que tú le pases, no sobre la página). */
  footer?: React.ReactNode;
  /** Controles extra a la derecha del buscador (filtros, botones). */
  toolbar?: React.ReactNode;
  className?: string;
}) {
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  const filtered = React.useMemo(() => {
    const q = normalize(query.trim());
    if (!q || !searchText) return data;
    const terms = q.split(/\s+/);
    return data.filter((row) => {
      const haystack = normalize(searchText(row).filter((v) => v !== null && v !== undefined).join(" "));
      return terms.every((t) => haystack.includes(t));
    });
  }, [data, query, searchText]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Si cambian los datos o el filtro y la página actual ya no existe, volver a la última válida.
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  const showToolbar = !!searchText || !!toolbar;
  // La barra de paginación se muestra siempre que haya filas, para que todas las tablas se vean igual.
  const showPagination = filtered.length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      {showToolbar && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {searchText ? (
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-9 pr-8 pl-9"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPage(1);
                  }}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ) : (
            <span />
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {columns.map((col, i) => (
                <TableHead
                  key={i}
                  className={cn("h-10 text-xs font-semibold text-muted-foreground", ALIGN[col.align ?? "left"], col.className)}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-muted-foreground">
                  {query ? `Sin resultados para “${query}”.` : emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(onRowClick && "cursor-pointer", rowClassName?.(row))}
                >
                  {columns.map((col, c) => (
                    <TableCell key={c} className={cn(ALIGN[col.align ?? "left"], col.className)}>
                      {col.cell(row, start + i)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
          {footer && <TableFooter>{footer}</TableFooter>}
        </Table>
      </div>

      {showPagination && (
        <div className="flex flex-col-reverse items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
          <p className="tabular-nums">
            {filtered.length === 0
              ? "0 registros"
              : `Mostrando ${start + 1}–${start + rows.length} de ${filtered.length}`}
            {query && filtered.length !== data.length ? ` (filtrado de ${data.length})` : ""}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">Filas</span>
              <SimpleSelect
                value={String(pageSize) as (typeof PAGE_SIZES)[number]}
                onChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
                options={PAGE_SIZES.map((s) => ({ value: s, label: s }))}
                ariaLabel="Filas por página"
                className="h-8 w-[4.5rem]"
              />
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" onClick={() => setPage(1)} disabled={current === 1} aria-label="Primera página">
                <ChevronsLeft />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => setPage(current - 1)} disabled={current === 1} aria-label="Página anterior">
                <ChevronLeft />
              </Button>
              <span className="min-w-[5.5rem] text-center tabular-nums">
                Pág. {current} de {pageCount}
              </span>
              <Button variant="outline" size="icon-sm" onClick={() => setPage(current + 1)} disabled={current === pageCount} aria-label="Página siguiente">
                <ChevronRight />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => setPage(pageCount)} disabled={current === pageCount} aria-label="Última página">
                <ChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
