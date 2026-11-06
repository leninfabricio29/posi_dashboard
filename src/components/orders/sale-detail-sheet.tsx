"use client";

import * as React from "react";
import { toast } from "@/lib/toast";
import { OrderDetailSheet } from "@/components/orders/order-detail-sheet";
import { errorMessage } from "@/lib/api/client";
import { ordersApi } from "@/lib/api/orders";
import type { Order } from "@/lib/api/types";

/**
 * Detalle de una venta (qué se vendió, a quién, mesa, pagos y códigos de transferencia).
 * Carga el pedido por `orderId` y lo muestra en el mismo panel lateral de Pedidos, en solo lectura
 * porque ya está pagado.
 */
export function SaleDetailSheet({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const [order, setOrder] = React.useState<Order | null>(null);

  React.useEffect(() => {
    if (!orderId) {
      setOrder(null);
      return;
    }
    let cancelled = false;
    ordersApi
      .get(orderId)
      .then((o) => !cancelled && setOrder(o))
      .catch((err) => {
        if (cancelled) return;
        toast.error(errorMessage(err));
        onClose();
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, onClose]);

  return (
    <OrderDetailSheet
      order={order}
      open={!!orderId && !!order}
      onOpenChange={(o) => !o && onClose()}
      onChange={setOrder}
      cashOpen={false}
    />
  );
}
