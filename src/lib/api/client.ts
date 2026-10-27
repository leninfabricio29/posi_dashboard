import type { AuthResponse } from "./types";
import { clearSession, getSession, setSession } from "@/lib/session";

export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4010").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** Enviar Bearer y reintentar con refresh en 401 (por defecto true). */
  auth?: boolean;
  signal?: AbortSignal;
}

/** Lee el body como texto y lo parsea solo si hay contenido. Nunca falla por body vacío. */
async function parseBody(res: Response): Promise<unknown> {
  let text = "";
  try {
    text = await res.text();
  } catch {
    return null;
  }
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function messageFrom(data: unknown, status: number): string {
  if (data && typeof data === "object" && "message" in data) {
    const msg = (data as { message: unknown }).message;
    if (Array.isArray(msg)) return msg.filter(Boolean).join(". ");
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (typeof data === "string" && data.trim() && data.length < 300) return data;
  switch (status) {
    case 400:
      return "Solicitud inválida";
    case 401:
      return "Sesión expirada";
    case 403:
      return "No tienes permiso para realizar esta acción";
    case 404:
      return "Recurso no encontrado";
    case 409:
      return "Conflicto con el estado actual";
    case 429:
      return "Demasiados intentos, espera un momento";
    default:
      return status >= 500 ? "Error del servidor" : `Error ${status}`;
  }
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const url = new URL(API_BASE + (path.startsWith("/") ? path : `/${path}`));
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

// ---- Refresh deduplicado ----
let refreshPromise: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const session = getSession();
      if (!session?.refreshToken) return null;
      try {
        const res = await fetch(buildUrl("/auth/refresh"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });
        if (!res.ok) return null;
        const data = (await parseBody(res)) as AuthResponse | null;
        if (!data?.accessToken || !data?.refreshToken) return null;
        setSession(data);
        return data.accessToken;
      } catch {
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function redirectToLogin() {
  clearSession();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login?expired=1";
  }
}

async function doFetch(path: string, opts: RequestOptions, token: string | null) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    return await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "No se pudo conectar con el servidor. Verifica que la API esté en línea.");
  }
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const useAuth = opts.auth !== false;
  let token = useAuth ? getSession()?.accessToken ?? null : null;
  let res = await doFetch(path, opts, token);

  if (res.status === 401 && useAuth) {
    token = await refreshAccessToken();
    if (!token) {
      redirectToLogin();
      throw new ApiError(401, "Tu sesión expiró. Inicia sesión nuevamente.");
    }
    res = await doFetch(path, opts, token);
    if (res.status === 401) {
      redirectToLogin();
      throw new ApiError(401, "Tu sesión expiró. Inicia sesión nuevamente.");
    }
  }

  const data = await parseBody(res);
  if (!res.ok) throw new ApiError(res.status, messageFrom(data, res.status), data);
  return data as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"]) => apiRequest<T>(path, { query }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body: body ?? {} }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", body: body ?? {} }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Ocurrió un error inesperado";
}
