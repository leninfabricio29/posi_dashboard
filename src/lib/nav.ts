import {
  BarChart3,
  Grid3x3,
  Home,
  Package,
  Printer,
  Receipt,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/api/types";

export type NavSection = "Operación" | "Catálogo y local" | "Sistema";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  section: NavSection;
}

const ALL: Role[] = ["ADMIN", "CASHIER"];
const ADMIN: Role[] = ["ADMIN"];

export const NAV_SECTIONS: NavSection[] = ["Operación", "Catálogo y local", "Sistema"];

export const NAV_ITEMS: NavItem[] = [
  { href: "/inicio", label: "Inicio", icon: Home, roles: ALL, section: "Operación" },
  { href: "/pedidos", label: "Pedidos", icon: Receipt, roles: ALL, section: "Operación" },
  { href: "/caja", label: "Caja", icon: Wallet, roles: ALL, section: "Operación" },
  { href: "/reportes", label: "Reportes", icon: BarChart3, roles: ALL, section: "Operación" },
  { href: "/mesas", label: "Mesas", icon: Grid3x3, roles: ADMIN, section: "Catálogo y local" },
  { href: "/productos", label: "Productos", icon: Package, roles: ADMIN, section: "Catálogo y local" },
  { href: "/usuarios", label: "Usuarios", icon: Users, roles: ADMIN, section: "Catálogo y local" },
  { href: "/impresoras", label: "Impresoras", icon: Printer, roles: ADMIN, section: "Sistema" },
  { href: "/configuracion", label: "Configuración", icon: Settings, roles: ADMIN, section: "Sistema" },
];

export function navForRole(role: Role | undefined) {
  if (!role) return [];
  return NAV_ITEMS.filter((i) => i.roles.includes(role));
}

/** Secciones con sus ítems visibles para el rol; omite secciones vacías (p. ej. CASHIER solo ve Operación). */
export function navSectionsForRole(role: Role | undefined) {
  const items = navForRole(role);
  return NAV_SECTIONS.map((section) => ({ section, items: items.filter((i) => i.section === section) })).filter(
    (s) => s.items.length > 0,
  );
}

export function canAccess(pathname: string, role: Role | undefined) {
  const item = NAV_ITEMS.find((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
  if (!item) return true;
  return !!role && item.roles.includes(role);
}
