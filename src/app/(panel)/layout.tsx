"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, LogOut, ShieldAlert } from "lucide-react";
import { toast } from "@/lib/toast";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomNavigation } from "@/components/bottom-navigation";
import { SkipLinks } from "@/components/skip-links";
import { PANEL_ROLES, WAITER_BLOCKED_MESSAGE, useAuth } from "@/components/auth-provider";
import { RealtimeIndicator } from "@/components/common";
import { CommandPalette } from "@/components/command-palette";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RealtimeProvider } from "@/hooks/use-realtime";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { usePrintStation } from "@/hooks/use-print-station";
import { canAccess } from "@/lib/nav";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function PanelContent({ children, user, pathname }: { children: React.ReactNode; user: { name: string; restaurantName?: string; role: string }; pathname: string }) {
  const router = useRouter();
  const { logout } = useAuth();
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);
  
  // Hook que sincroniza eventos realtime con TanStack Query
  useRealtimeSync();
  // Estación de impresión (solo actúa si se activó en este navegador, en Impresoras)
  usePrintStation();

  // Keyboard shortcut: Ctrl+K / Cmd+K para abrir Command Palette
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleLogout() {
    await logout();
    toast.success("Sesión cerrada");
    router.replace("/login");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allowed = canAccess(pathname, user.role as any);

  return (
    <SidebarProvider>
      <SkipLinks />
      <AppSidebar />
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <SidebarInset>
        <header 
          id="sidebar"
          className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur sm:px-4"
          role="banner"
        >
          <SidebarTrigger aria-label="Alternar navegación lateral" />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <RealtimeIndicator />
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium">{user.name}</p>
            </div>
            <Avatar>
              <AvatarFallback>{initials(user.name) || "U"}</AvatarFallback>
            </Avatar>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              aria-label="Cerrar sesión"
            >
              <LogOut />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </Button>
          </div>
        </header>
        <main 
          id="main-content"
          className="flex-1 space-y-6 overflow-y-auto p-6"
          role="main"
        >
          {allowed ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border p-10 text-center">
              <ShieldAlert className="size-8 text-destructive" aria-hidden="true" />
              <p className="font-medium">No tienes permiso para ver esta sección.</p>
              <Button nativeButton={false} render={<Link href="/inicio" />}>
                Ir al inicio
              </Button>
            </div>
          )}
        </main>
      </SidebarInset>
      <BottomNavigation />
    </SidebarProvider>
  );
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { status, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" aria-label="Cargando" />
      </div>
    );
  }

  if (!PANEL_ROLES.includes(user.role)) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldAlert className="size-10 text-destructive" />
        <p className="text-lg font-medium">{WAITER_BLOCKED_MESSAGE}</p>
        <Button
          onClick={async () => {
            await logout();
            toast.success("Sesión cerrada");
            router.replace("/login");
          }}
        >
          <LogOut /> Cerrar sesión
        </Button>
      </div>
    );
  }

  return (
    <RealtimeProvider>
      <PanelContent user={user} pathname={pathname}>
        {children}
      </PanelContent>
    </RealtimeProvider>
  );
}
