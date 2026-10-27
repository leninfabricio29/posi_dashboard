"use client";

import * as React from "react";
import { ordersApi } from "@/lib/api/orders";
import type { Order } from "@/lib/api/types";
import { listenHandledFromOtherTabs, printKitchenOrder, printOrderChanges, wasHandledLocally } from "@/lib/printing/auto";
import { diffOrderItems, hasChanges } from "@/lib/printing/order-diff";
import { getPrintSettings, subscribePrintSettings } from "@/lib/printing/settings";
import { useRealtimeEvent } from "./use-realtime";

/** Espera antes de procesar un evento: da tiempo a que la pestaña que hizo el cambio lo marque como gestionado. */
const SETTLE_MS = 1500;
const LOCK_NAME = "triada-print-station";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Estación de impresión: si está activada en este navegador, imprime comandas y adicionales/anulados
 * de pedidos creados o modificados por OTROS (app de meseros, otra caja) a partir de los eventos en tiempo real.
 * - Al activarse toma como base /orders/active (no reimprime lo que ya existía).
 * - Ignora lo que esta pestaña (u otra de este navegador) acaba de imprimir.
 * - Solo una pestaña del navegador actúa como estación (Web Locks).
 * - Nunca imprime recibos (el cobro ocurre en el panel).
 */
export function usePrintStation() {
  const [enabled, setEnabled] = React.useState(false);
  const [leader, setLeader] = React.useState(false);
  /** Último estado conocido de cada pedido abierto. */
  const known = React.useRef(new Map<string, Order>());
  const ready = React.useRef<Promise<void> | null>(null);
  const chain = React.useRef<Promise<void>>(Promise.resolve());
  const active = enabled && leader;
  const activeRef = React.useRef(false);
  React.useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // Ajuste por navegador (se lee en efecto, nunca en render).
  React.useEffect(() => {
    setEnabled(getPrintSettings().printStation);
    return subscribePrintSettings((s) => setEnabled(s.printStation));
  }, []);

  // Una sola pestaña del navegador es la estación.
  React.useEffect(() => {
    if (!enabled) return;
    const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
    if (!locks) {
      setLeader(true);
      return () => setLeader(false);
    }
    const ac = new AbortController();
    let release: (() => void) | null = null;
    locks
      .request(LOCK_NAME, { signal: ac.signal }, () => {
        setLeader(true);
        return new Promise<void>((resolve) => {
          release = resolve;
        });
      })
      .catch(() => undefined); // AbortError al desactivar mientras espera
    return () => {
      ac.abort();
      release?.();
      setLeader(false);
    };
  }, [enabled]);

  // Base inicial: pedidos abiertos actuales.
  React.useEffect(() => {
    if (!active) return;
    listenHandledFromOtherTabs();
    const map = known.current;
    map.clear();
    let cancelled = false;
    ready.current = ordersApi
      .active()
      .then((orders) => {
        if (cancelled) return;
        orders.forEach((o) => map.set(o.id, o));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      map.clear();
      ready.current = null;
    };
  }, [active]);

  const process = React.useCallback(async (event: "created" | "updated", order: Order, receivedAt: number) => {
    await ready.current;
    await sleep(Math.max(0, receivedAt + SETTLE_MS - Date.now()));
    if (!activeRef.current) return;
    const map = known.current;
    const prev = map.get(order.id);
    // Evento viejo o repetido.
    if (prev && prev.updatedAt >= order.updatedAt && event === "updated") return;
    if (order.status === "OPEN") map.set(order.id, order);
    else map.delete(order.id);

    if (wasHandledLocally(order)) return; // lo hizo este navegador: ya se imprimió (o se decidió no imprimir)
    const settings = getPrintSettings();

    if (event === "created" || !prev) {
      // Sin base conocida solo se imprime si es un pedido nuevo (evita reimprimir pedidos completos).
      if (event === "created" && order.status === "OPEN" && settings.autoPrintKitchen) await printKitchenOrder(order);
      return;
    }
    if (order.status !== "OPEN" || !settings.autoPrintAdditions) return;
    const changes = diffOrderItems(prev.items, order.items);
    if (hasChanges(changes)) await printOrderChanges(order, changes);
  }, []);

  const enqueue = React.useCallback(
    (event: "created" | "updated", order: Order) => {
      if (!activeRef.current) return;
      const receivedAt = Date.now();
      chain.current = chain.current.then(() => process(event, order, receivedAt)).catch(() => undefined);
    },
    [process]
  );

  useRealtimeEvent("order.created", (order) => enqueue("created", order));
  useRealtimeEvent("order.updated", (order) => enqueue("updated", order));
}
