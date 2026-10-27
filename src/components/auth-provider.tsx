"use client";

import * as React from "react";
import { authApi } from "@/lib/api/auth";
import { API_BASE, ApiError } from "@/lib/api/client";
import type { Role, User } from "@/lib/api/types";
import { SESSION_EVENT, clearSession, getSession, setSession, updateSessionUser } from "@/lib/session";

export const PANEL_ROLES: Role[] = ["ADMIN", "CASHIER"];
export const WAITER_BLOCKED_MESSAGE = "El panel es solo para administradores y cajeros";

type Status = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: Status;
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

async function revokeQuietly(accessToken: string, refreshToken: string) {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    /* sin conexión: se ignora */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<Status>("loading");
  const [user, setUser] = React.useState<User | null>(null);

  // Lectura de localStorage solo en el cliente, después del montaje.
  React.useEffect(() => {
    const sync = () => {
      const s = getSession();
      setUser(s?.user ?? null);
      setStatus(s ? "authenticated" : "unauthenticated");
    };
    sync();
    window.addEventListener(SESSION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Revalida el usuario contra /auth/me una vez por carga.
  const validated = React.useRef(false);
  React.useEffect(() => {
    if (status !== "authenticated" || validated.current) return;
    validated.current = true;
    authApi
      .me()
      .then((me) => {
        if (!me.isActive) clearSession();
        else updateSessionUser(me);
      })
      .catch(() => {
        /* 401 ya redirige; errores de red: se mantiene la sesión local */
      });
  }, [status]);

  const login = React.useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    if (!PANEL_ROLES.includes(res.user.role)) {
      void revokeQuietly(res.accessToken, res.refreshToken);
      throw new ApiError(403, WAITER_BLOCKED_MESSAGE);
    }
    setSession(res);
    return res.user;
  }, []);

  const logout = React.useCallback(async () => {
    const s = getSession();
    if (s) await revokeQuietly(s.accessToken, s.refreshToken);
    clearSession();
  }, []);

  const value = React.useMemo(() => ({ status, user, login, logout }), [status, user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
