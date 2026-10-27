"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import logo from "@/assets/img/icon_logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/components/auth-provider";
import { navSectionsForRole } from "@/lib/nav";
import { ROLE_LABEL } from "@/lib/format";

// Ítem: más alto y con aire; activo = tinte morado suave + barra de acento a la izquierda.
const ITEM_CLASS =
  "relative h-10 gap-3 rounded-lg px-3 text-[0.9rem] font-medium text-sidebar-foreground " +
  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground " +
  "[&_svg]:size-[18px] [&_svg]:text-muted-foreground hover:[&_svg]:text-sidebar-accent-foreground " +
  "data-active:bg-primary/8 data-active:font-semibold data-active:text-primary data-active:[&_svg]:text-primary " +
  "data-active:before:absolute data-active:before:inset-y-2 data-active:before:left-0 data-active:before:w-[3px] " +
  "data-active:before:rounded-r-full data-active:before:bg-primary " +
  "group-data-[collapsible=icon]:data-active:before:hidden";

export function AppSidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  const sections = navSectionsForRole(user?.role);

  return (
    <Sidebar collapsible="icon" aria-label="Navegación principal" className="border-r border-sidebar-border">
      <SidebarHeader className="px-3 pt-4 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/inicio" />}
              tooltip="Sistema POS"
              aria-label="Sistema POS - Ir a inicio"
              className="gap-3 hover:bg-transparent"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Image src={logo} alt="" width={24} height={24} className="size-6" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="text-[0.95rem] font-semibold text-foreground">Sistema POS</span>
                <span className="truncate text-xs text-muted-foreground">{user?.restaurantName ?? "Restaurante"}</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="mx-4" />

      <SidebarContent className="gap-1 px-3 py-3">
        {sections.map(({ section, items }) => (
          <SidebarGroup key={section} className="px-0 py-2">
            <SidebarGroupLabel className="mb-1 h-6 px-3 text-[0.7rem] font-semibold tracking-wider text-muted-foreground/80 uppercase">
              {section}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1" aria-label={section}>
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.label}
                        className={ITEM_CLASS}
                        aria-current={active ? "page" : undefined}
                        render={
                          <Link
                            href={item.href}
                            onClick={() => {
                              if (isMobile) setOpenMobile(false);
                            }}
                          />
                        }
                      >
                        <item.icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
            {user?.name?.charAt(0).toUpperCase() ?? "?"}
          </span>
          <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium text-foreground">{user?.name ?? "—"}</span>
            <span className="truncate text-xs text-muted-foreground">
              {user ? ROLE_LABEL[user.role] : ""} · v1.0
            </span>
          </span>
        </div>
      </SidebarFooter>
      <SidebarRail aria-hidden="true" />
    </Sidebar>
  );
}
