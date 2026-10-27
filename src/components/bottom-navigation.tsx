"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Receipt,
  Wallet,
  Table2,
  Package,
  FileText,
  Users,
  Settings,
  Printer,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { cn } from "cn";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const PRIMARY_ITEMS: NavItem[] = [
  { href: "/inicio", label: "Inicio", icon: <Home className="size-5" /> },
  { href: "/pedidos", label: "Pedidos", icon: <Receipt className="size-5" /> },
  { href: "/caja", label: "Caja", icon: <Wallet className="size-5" /> },
  { href: "/mesas", label: "Mesas", icon: <Table2 className="size-5" /> },
];

const SECONDARY_ITEMS: NavItem[] = [
  { href: "/productos", label: "Productos", icon: <Package className="size-5" /> },
  { href: "/reportes", label: "Reportes", icon: <FileText className="size-5" /> },
  { href: "/usuarios", label: "Usuarios", icon: <Users className="size-5" /> },
  { href: "/impresoras", label: "Impresoras", icon: <Printer className="size-5" /> },
  { href: "/configuracion", label: "Configuración", icon: <Settings className="size-5" /> },
];

export function BottomNavigation() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur sm:hidden"
      aria-label="Navegación móvil"
      role="navigation"
    >
      <div className="flex h-16 items-center justify-between px-1">
        {/* Primary Items */}
        <div className="flex flex-1 items-center justify-around" role="menubar">
          {PRIMARY_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-2 py-2 transition-colors",
                "relative rounded-lg text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive(item.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive(item.href) ? "page" : undefined}
              aria-label={isActive(item.href) ? `${item.label} (página actual)` : item.label}
              role="menuitem"
            >
              {isActive(item.href) && (
                <div 
                  className="absolute inset-0 rounded-lg bg-primary/5" 
                  aria-hidden="true" 
                />
              )}
              <div className="relative z-10" aria-hidden="true">{item.icon}</div>
              <span className="relative z-10 line-clamp-1">{item.label}</span>
              {item.badge && (
                <span 
                  className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                  aria-label={`${item.label}: ${item.badge} notificaciones`}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* More Button */}
        <Popover>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-14 w-12 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                SECONDARY_ITEMS.some((item) => isActive(item.href))
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Mostrar más opciones"
              aria-expanded={SECONDARY_ITEMS.some((item) => isActive(item.href))}
              role="menuitem"
            >
              <MoreHorizontal className="size-5" aria-hidden="true" />
            </Button>
          <PopoverContent 
            className="w-48 p-1" 
            align="end" 
            side="top"
            role="menu"
            aria-label="Menú adicional"
          >
            <div className="space-y-1">
              {SECONDARY_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    isActive(item.href)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted"
                  )}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  aria-label={isActive(item.href) ? `${item.label} (página actual)` : item.label}
                  role="menuitem"
                >
                  <div className="size-5 shrink-0" aria-hidden="true">{item.icon}</div>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span 
                      className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary"
                      aria-label={`${item.badge} notificaciones`}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </nav>
  );
}
