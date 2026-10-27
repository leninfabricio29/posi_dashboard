import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeEvent } from "./use-realtime";
import { orderKeys } from "./queries/use-orders";
import { tableKeys } from "./queries/use-tables";
import { cashRegisterKeys } from "./queries/use-cash-register";
import type { Order, Table, TableMapArea } from "@/lib/api/types";
import { isActiveOrder } from "@/lib/orders";

/**
 * Hook que sincroniza eventos de tiempo real con el caché de TanStack Query
 * Reemplaza los múltiples useRealtimeEvent + setData manual en cada componente
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  // Sincronizar actualizaciones de pedidos
  useRealtimeEvent("order.created", (order: Order) => {
    // Agregar a lista de activos
    queryClient.setQueryData<Order[]>(orderKeys.active(), (old) => {
      if (!old) return [order];
      return [...old, order];
    });

    // Invalidar listas de pedidos para refetch
    queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
  });

  useRealtimeEvent("order.updated", (order: Order) => {
    // Actualizar detalle específico
    queryClient.setQueryData(orderKeys.detail(order.id), order);

    // Actualizar en lista de activos
    queryClient.setQueryData<Order[]>(orderKeys.active(), (old) => {
      if (!old) return [order];
      if (isActiveOrder(order)) {
        // Actualizar o agregar si es activo
        const exists = old.some((o) => o.id === order.id);
        return exists ? old.map((o) => (o.id === order.id ? order : o)) : [...old, order];
      } else {
        // Remover si ya no está abierto (PAID)
        return old.filter((o) => o.id !== order.id);
      }
    });

    // Si el pedido cambió a PAID, invalidar reportes y caja
    if (order.status === "PAID") {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.current() });
    }
  });

  // Sincronizar actualizaciones de mesas
  useRealtimeEvent("table.updated", (table: Table) => {
    queryClient.setQueryData<TableMapArea[]>(tableKeys.map(), (old) => {
      if (!old) return [{ id: "default", name: "Default", tables: [table], areaId: "default", areaName: "Default" }];

      // Actualizar mesa en el área correspondiente
      return old.map((area) => {
        const tableIndex = area.tables.findIndex((t) => t.id === table.id);
        
        if (tableIndex !== -1) {
          // Mesa existe en esta área
          if (area.id === table.areaId) {
            // Actualizar en misma área
            const tables = [...area.tables];
            tables[tableIndex] = table;
            return { ...area, tables };
          } else {
            // Mesa movida a otra área, remover de esta
            return { ...area, tables: area.tables.filter((t) => t.id !== table.id) };
          }
        } else if (area.id === table.areaId) {
          // Agregar mesa a esta área
          return { ...area, tables: [...area.tables, table] };
        }
        
        return area;
      });
    });

    // Invalidar lista de mesas
    queryClient.invalidateQueries({ queryKey: tableKeys.lists() });
  });

  // Sincronizar actualizaciones de caja
  useRealtimeEvent("cash.updated", () => {
    queryClient.invalidateQueries({ queryKey: cashRegisterKeys.current() });
  });
}
