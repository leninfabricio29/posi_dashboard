import type { AuthResponse, User } from "@/lib/api/types";

/** Sesión persistida en localStorage. Solo usar en efectos / handlers (nunca en render/SSR). */
export interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
}

const KEY = "triada.session";
export const SESSION_EVENT = "triada:session";

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getSession(): Session | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return getSession()?.accessToken ?? null;
}

export function setSession(data: AuthResponse | Session) {
  if (!hasStorage()) return;
  const session: Session = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
  };
  window.localStorage.setItem(KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}

export function updateSessionUser(user: User) {
  const current = getSession();
  if (!current) return;
  setSession({ ...current, user });
}

export function clearSession() {
  if (!hasStorage()) return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}
