"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  CreditCard,
  FileText,
  Home,
  Package,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  Table2,
  Users,
  Wallet,
  Printer,
} from "lucide-react";
import { Command } from "cmdk";
import Fuse from "fuse.js";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useActiveOrders } from "@/hooks/queries/use-orders";
import { useTableMap } from "@/hooks/queries/use-tables";
import { useAvailableProducts } from "@/hooks/queries/use-products";
import { TABLE_STATUS_LABEL, money } from "@/lib/format";
import { customerLabel } from "@/lib/orders";
import { cn } from "cn";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  category: string;
  keywords?: string[];
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [pages, setPages] = React.useState<string[]>(["home"]);
  
  // Obtener datos para búsqueda
  const { data: orders } = useActiveOrders();
  const { data: tableMapData } = useTableMap();
  const { data: products } = useAvailableProducts();

  // Reset al cerrar
  React.useEffect(() => {
    if (!open) {
      setSearch("");
      setPages(["home"]);
    }
  }, [open]);

  const page = pages[pages.length - 1];

  // Construir lista de acciones rápidas
  const quickActions: CommandItem[] = [
    {
      id: "new-order",
      label: "Nuevo pedido",
      description: "Crear un pedido nuevo",
      icon: <Receipt className="size-4" />,
      onSelect: () => {
        router.push("/pedidos?nuevo=1");
        onOpenChange(false);
      },
      category: "Acciones",
      keywords: ["crear", "agregar", "orden"],
    },
    {
      id: "open-cash",
      label: "Abrir caja",
      description: "Abrir caja registradora",
      icon: <Wallet className="size-4" />,
      onSelect: () => {
        router.push("/caja");
        onOpenChange(false);
      },
      category: "Acciones",
      keywords: ["efectivo", "apertura"],
    },
    {
      id: "close-cash",
      label: "Cerrar caja",
      description: "Cerrar y generar reporte",
      icon: <Calculator className="size-4" />,
      onSelect: () => {
        router.push("/caja");
        onOpenChange(false);
      },
      category: "Acciones",
      keywords: ["cierre", "corte", "reporte"],
    },
  ];

  // Navegación
  const navigation: CommandItem[] = [
    {
      id: "nav-home",
      label: "Inicio",
      description: "Dashboard principal",
      icon: <Home className="size-4" />,
      onSelect: () => {
        router.push("/inicio");
        onOpenChange(false);
      },
      category: "Navegación",
    },
    {
      id: "nav-orders",
      label: "Pedidos",
      description: "Gestionar pedidos",
      icon: <Receipt className="size-4" />,
      onSelect: () => {
        router.push("/pedidos");
        onOpenChange(false);
      },
      category: "Navegación",
    },
    {
      id: "nav-cash",
      label: "Caja",
      description: "Administrar caja",
      icon: <Wallet className="size-4" />,
      onSelect: () => {
        router.push("/caja");
        onOpenChange(false);
      },
      category: "Navegación",
    },
    {
      id: "nav-tables",
      label: "Mesas",
      description: "Configurar mesas",
      icon: <Table2 className="size-4" />,
      onSelect: () => {
        router.push("/mesas");
        onOpenChange(false);
      },
      category: "Navegación",
    },
    {
      id: "nav-products",
      label: "Productos",
      description: "Administrar productos",
      icon: <Package className="size-4" />,
      onSelect: () => {
        router.push("/productos");
        onOpenChange(false);
      },
      category: "Navegación",
    },
    {
      id: "nav-reports",
      label: "Reportes",
      description: "Ver reportes de ventas",
      icon: <FileText className="size-4" />,
      onSelect: () => {
        router.push("/reportes");
        onOpenChange(false);
      },
      category: "Navegación",
    },
    {
      id: "nav-users",
      label: "Usuarios",
      description: "Administrar usuarios",
      icon: <Users className="size-4" />,
      onSelect: () => {
        router.push("/usuarios");
        onOpenChange(false);
      },
      category: "Navegación",
    },
    {
      id: "nav-printers",
      label: "Impresoras",
      description: "Configurar impresoras",
      icon: <Printer className="size-4" />,
      onSelect: () => {
        router.push("/impresoras");
        onOpenChange(false);
      },
      category: "Navegación",
    },
    {
      id: "nav-settings",
      label: "Configuración",
      description: "Configuración del sistema",
      icon: <Settings className="size-4" />,
      onSelect: () => {
        router.push("/configuracion");
        onOpenChange(false);
      },
      category: "Navegación",
    },
  ];

  // Pedidos abiertos
  const orderItems: CommandItem[] = (orders || []).map((order) => ({
    id: `order-${order.id}`,
    label: `Pedido #${order.number}`,
    description: `${customerLabel(order)} · ${order.tableName || "Para llevar"} - ${money(order.total)}`,
    icon: <Receipt className="size-4" />,
    onSelect: () => {
      router.push(`/pedidos?pedido=${order.id}`);
      onOpenChange(false);
    },
    category: "Pedidos abiertos",
    keywords: [order.tableName || "", order.customerName || "", order.number.toString(), "abierto"],
  }));

  // Mesas
  const tables = tableMapData?.flatMap((area) => area.tables) || [];
  const tableItems: CommandItem[] = tables.map((table) => ({
    id: `table-${table.id}`,
    label: `Mesa ${table.name}`,
    description: `${table.areaName} - ${TABLE_STATUS_LABEL[table.status]}${
      table.activeOrder ? ` · ${table.activeOrder.customerName?.trim() || "Sin nombre"}` : ""
    }`,
    icon: <Table2 className="size-4" />,
    onSelect: () => {
      if (table.activeOrder) {
        router.push(`/pedidos?pedido=${table.activeOrder.id}`);
      } else {
        router.push(`/pedidos?mesa=${table.id}`);
      }
      onOpenChange(false);
    },
    category: "Mesas",
    keywords: [table.areaName, table.status, table.activeOrder?.customerName || ""],
  }));

  // Productos
  const productItems: CommandItem[] = (products || []).slice(0, 20).map((product) => ({
    id: `product-${product.id}`,
    label: product.name,
    description: `${money(product.price)}${product.description ? ` - ${product.description}` : ""}`,
    icon: <ShoppingBag className="size-4" />,
    onSelect: () => {
      // Crear pedido con este producto pre-seleccionado
      router.push(`/pedidos?nuevo=1&producto=${product.id}`);
      onOpenChange(false);
    },
    category: "Productos",
    keywords: [product.description || "", product.price.toString()],
  }));

  // Combinar todos los items
  const allItems = [...quickActions, ...navigation, ...orderItems, ...tableItems, ...productItems];

  // Fuzzy search con Fuse.js
  const fuse = React.useMemo(
    () =>
      new Fuse(allItems, {
        keys: ["label", "description", "keywords", "category"],
        threshold: 0.3,
        includeScore: true,
      }),
    [allItems]
  );

  const filteredItems = React.useMemo(() => {
    if (!search) return allItems;
    const results = fuse.search(search);
    return results.map((result) => result.item);
  }, [search, fuse, allItems]);

  // Agrupar por categoría
  const groupedItems = React.useMemo(() => {
    const groups = new Map<string, CommandItem[]>();
    filteredItems.forEach((item) => {
      const items = groups.get(item.category) || [];
      items.push(item);
      groups.set(item.category, items);
    });
    return groups;
  }, [filteredItems]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        size="lg"
        className="p-0"
        aria-label="Paleta de comandos"
        aria-describedby="command-palette-description"
      >
        <div id="command-palette-description" className="sr-only">
          Búsqueda de comandos y navegación rápida. Usa las flechas para navegar, Enter para seleccionar, Escape para cerrar.
        </div>
        <Command className="rounded-lg border-0">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 size-4 shrink-0 opacity-50" aria-hidden="true" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Buscar pedidos, mesas, productos, acciones..."
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Campo de búsqueda de comandos"
              aria-live="polite"
              aria-describedby="search-results-count"
            />
            <kbd 
              className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex"
              aria-label="Presiona Escape para cerrar"
            >
              <span className="text-xs">ESC</span>
            </kbd>
          </div>
          
          <Command.List 
            className="max-h-[400px] overflow-y-auto p-2"
            role="listbox"
            aria-label="Resultados de búsqueda"
          >
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No se encontraron resultados
            </Command.Empty>

            {Array.from(groupedItems.entries()).map(([category, items]) => (
              <Command.Group 
                key={category} 
                heading={category} 
                className="mb-2"
                role="group"
                aria-label={category}
              >
                {items.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.label}
                    onSelect={item.onSelect}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors",
                      "hover:bg-muted aria-selected:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                    role="option"
                    aria-label={item.description ? `${item.label}: ${item.description}` : item.label}
                  >
                    {item.icon && <span aria-hidden="true">{item.icon}</span>}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.label}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          <div 
            className="border-t p-2 text-xs text-muted-foreground flex items-center justify-between"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd 
                  className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono font-medium"
                  aria-label="Flechas arriba y abajo"
                >
                  ↑↓
                </kbd>
                <span>Navegar</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd 
                  className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono font-medium"
                  aria-label="Enter"
                >
                  ↵
                </kbd>
                <span>Seleccionar</span>
              </span>
            </div>
            <span id="search-results-count" className="sr-only">
              {filteredItems.length} {filteredItems.length === 1 ? "resultado" : "resultados"}
            </span>
            <span aria-hidden="true">{filteredItems.length} resultados</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
