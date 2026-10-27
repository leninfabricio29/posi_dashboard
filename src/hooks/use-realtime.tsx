"use client";

import * as React from "react";
import { io, type Socket } from "socket.io-client";
import { API_BASE } from "@/lib/api/client";
import type { RealtimeEvents } from "@/lib/api/types";
import { getAccessToken } from "@/lib/session";

type EventName = keyof RealtimeEvents;
type Handler<E extends EventName> = (payload: RealtimeEvents[E]) => void;

interface RealtimeContextValue {
  connected: boolean;
  subscribe: <E extends EventName>(event: E, handler: Handler<E>) => () => void;
}

const RealtimeContext = React.createContext<RealtimeContextValue>({
  connected: false,
  subscribe: () => () => {},
});

/**
 * Una sola conexión Socket.IO para todo el panel: `${API_BASE}/realtime` con auth { token }.
 * Si no conecta, la UI sigue funcionando (las vistas hacen polling de respaldo).
 */
export function RealtimeProvider({ children, enabled = true }: { children: React.ReactNode; enabled?: boolean }) {
  const [connected, setConnected] = React.useState(false);
  const socketRef = React.useRef<Socket | null>(null);
  const listeners = React.useRef(new Map<string, Set<(p: unknown) => void>>());

  React.useEffect(() => {
    if (!enabled) return;
    const socket = io(`${API_BASE}/realtime`, {
      // función: se reevalúa en cada (re)conexión, así usa el token renovado
      auth: (cb) => cb({ token: getAccessToken() }),
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 15000,
      timeout: 8000,
    });
    socketRef.current = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onDisconnect);
    socket.onAny((event: string, payload: unknown) => {
      listeners.current.get(event)?.forEach((fn) => {
        try {
          fn(payload);
        } catch (err) {
          console.error("[realtime] handler", event, err);
        }
      });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [enabled]);

  const subscribe = React.useCallback(<E extends EventName>(event: E, handler: Handler<E>) => {
    const set = listeners.current.get(event) ?? new Set();
    const fn = handler as (p: unknown) => void;
    set.add(fn);
    listeners.current.set(event, set);
    return () => {
      set.delete(fn);
    };
  }, []);

  const value = React.useMemo(() => ({ connected, subscribe }), [connected, subscribe]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

/** Estado de la conexión en tiempo real y función para suscribirse a eventos. */
export function useRealtime() {
  return React.useContext(RealtimeContext);
}

/** Suscribe un handler a un evento; el handler más reciente siempre se usa. */
export function useRealtimeEvent<E extends EventName>(event: E, handler: Handler<E>) {
  const { subscribe } = useRealtime();
  const ref = React.useRef(handler);
  React.useEffect(() => {
    ref.current = handler;
  });
  React.useEffect(() => subscribe(event, (p) => ref.current(p)), [event, subscribe]);
}

/** Polling de respaldo: ejecuta `fn` cada `ms` solo cuando el socket NO está conectado. */
export function useFallbackPolling(fn: () => void, ms = 15000) {
  const { connected } = useRealtime();
  const ref = React.useRef(fn);
  React.useEffect(() => {
    ref.current = fn;
  });
  React.useEffect(() => {
    if (connected) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") ref.current();
    }, ms);
    return () => window.clearInterval(id);
  }, [connected, ms]);
}
