"use client";

import {
  BriefcaseBusiness,
  ChevronDown,
  ContactRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MapPinned,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { logoutAction } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrimaryRole, ROLE_LABELS } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import type { Viewer } from "@/server/auth/session";

type AppShellProps = {
  viewer: Viewer;
  children: ReactNode;
};

const navigation = [
  { href: "/app", label: "Inicio", icon: LayoutDashboard },
  { href: "/app/crm", label: "CRM", icon: BriefcaseBusiness, permission: "crm:view" as const },
  { href: "/app/clientes", label: "Clientes", icon: ContactRound, permission: "crm:view" as const },
  { href: "/app/tareas", label: "Tareas", icon: ListChecks, permission: "tasks:view" as const },
  { href: "/app/visitas", label: "Visitas", icon: MapPinned, permission: "visits:view" as const },
  {
    href: "/app/configuracion/usuarios",
    label: "Equipo y permisos",
    icon: Users,
    permission: "users:view" as const,
  },
];

const routeTitles: Record<string, string> = {
  "/app": "Inicio",
  "/app/crm": "CRM",
  "/app/crm/nueva": "Nueva oportunidad",
  "/app/clientes": "Clientes",
  "/app/clientes/nuevo": "Nuevo cliente",
  "/app/tareas": "Tareas",
  "/app/visitas": "Visitas",
  "/app/configuracion/usuarios": "Equipo y permisos",
  "/app/sin-permiso": "Acceso restringido",
};

function initials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Navigation({
  viewer,
  collapsed = false,
  onNavigate,
}: {
  viewer: Viewer;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const links = navigation.filter(
    (item) => !item.permission || hasPermission(viewer.roles, item.permission),
  );

  return (
    <nav aria-label="Navegación principal" className="space-y-1.5">
      {links.map((item) => {
        const active =
          item.href === "/app"
            ? pathname === item.href
            : pathname.startsWith(item.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            aria-label={collapsed ? item.label : undefined}
            className={cn(
              "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
              active
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-white/68 hover:bg-white/8 hover:text-white",
              collapsed && "justify-center px-0",
            )}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
          >
            <item.icon
              aria-hidden="true"
              className={cn(
                "size-[18px] shrink-0",
                active ? "text-[#9b773f]" : "text-white/55 group-hover:text-white",
              )}
            />
            {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      aria-label="Ir al inicio de KAIROS OS"
      className={cn(
        "flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white",
        collapsed && "justify-center",
      )}
      href="/app"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[linear-gradient(145deg,#e8d29f,#b58a43)] font-heading text-xl font-semibold text-[#201b14] shadow-[0_8px_24px_rgba(197,164,109,0.22)]">
        K
      </span>
      {collapsed ? null : (
        <span>
          <span className="block text-[15px] font-semibold tracking-[0.12em] text-white">
            KAIROS OS
          </span>
          <span className="mt-0.5 block text-[9px] font-medium tracking-[0.2em] text-white/42">
            GESTIÓN INTERNA
          </span>
        </span>
      )}
    </Link>
  );
}

function AccountMenu({ viewer }: { viewer: Viewer }) {
  const primaryRole = getPrimaryRole(viewer.roles);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Abrir menú de cuenta"
            className="h-11 gap-2 rounded-full border border-black/8 bg-white px-1.5 pr-3 shadow-sm hover:bg-[#f4f4f6]"
            variant="ghost"
          />
        }
      >
        <Avatar className="size-8 border-0">
          <AvatarFallback className="bg-[#1d1d1f] text-xs font-semibold text-white">
            {initials(viewer.fullName)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate text-sm font-medium sm:block">
          {viewer.fullName.split(" ")[0]}
        </span>
        <ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 rounded-2xl border border-black/8 bg-white p-2 shadow-[0_20px_60px_rgba(0,0,0,0.16)]"
        sideOffset={8}
      >
        <DropdownMenuLabel className="px-3 py-2.5">
          <span className="block truncate text-sm font-semibold text-foreground">
            {viewer.fullName}
          </span>
          <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">
            {viewer.email ?? "Cuenta interna"}
          </span>
          <span className="mt-2 inline-flex rounded-full bg-[#f2ead9] px-2 py-1 text-[11px] font-semibold text-[#765522]">
            {primaryRole ? ROLE_LABELS[primaryRole] : "Sin rol"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <DropdownMenuItem
            className="min-h-10 cursor-pointer rounded-xl px-3"
            render={<button className="w-full" type="submit" />}
          >
            <LogOut aria-hidden="true" />
            Cerrar sesión
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarFooter({ viewer, collapsed }: { viewer: Viewer; collapsed: boolean }) {
  const primaryRole = getPrimaryRole(viewer.roles);

  if (collapsed) {
    return (
      <form action={logoutAction} className="flex justify-center">
        <Button
          aria-label="Cerrar sesión"
          className="size-11 rounded-xl text-white/65 hover:bg-white/8 hover:text-white"
          title="Cerrar sesión"
          type="submit"
          variant="ghost"
        >
          <LogOut aria-hidden="true" />
        </Button>
      </form>
    );
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.045] p-3.5">
      <div className="flex items-center gap-3">
        <Avatar className="size-9 border-0">
          <AvatarFallback className="bg-white/10 text-xs font-semibold text-white">
            {initials(viewer.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{viewer.fullName}</p>
          <p className="mt-0.5 truncate text-[11px] text-white/45">
            {primaryRole ? ROLE_LABELS[primaryRole] : "Sin rol"}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-white/8 pt-3 text-[11px] text-white/45">
        <ShieldCheck aria-hidden="true" className="size-3.5 text-[#d5b875]" />
        Sesión protegida
      </div>
    </div>
  );
}

export function AppShell({ viewer, children }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleSidebar() {
    setCollapsed((current) => !current);
  }

  const pageTitle =
    routeTitles[pathname] ??
    (pathname.startsWith("/app/crm/")
      ? "Detalle de oportunidad"
      : pathname.startsWith("/app/clientes/")
        ? "Ficha del cliente"
        : "KAIROS OS");

  return (
    <div
      className={cn(
        "min-h-screen bg-background md:grid md:transition-[grid-template-columns] md:duration-200",
        collapsed
          ? "md:grid-cols-[84px_minmax(0,1fr)]"
          : "md:grid-cols-[272px_minmax(0,1fr)]",
      )}
    >
      <aside className="sticky top-0 hidden h-screen border-r border-white/8 bg-[#1d1d1f] p-4 md:flex md:flex-col">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
          <Brand collapsed={collapsed} />
          {collapsed ? null : (
            <Button
              aria-label="Contraer barra lateral"
              className="size-9 rounded-xl text-white/45 hover:bg-white/8 hover:text-white"
              onClick={toggleSidebar}
              title="Contraer barra lateral"
              variant="ghost"
            >
              <PanelLeftClose aria-hidden="true" />
            </Button>
          )}
        </div>
        {collapsed ? (
          <Button
            aria-label="Expandir barra lateral"
            className="mx-auto mt-4 size-9 rounded-xl text-white/45 hover:bg-white/8 hover:text-white"
            onClick={toggleSidebar}
            title="Expandir barra lateral"
            variant="ghost"
          >
            <PanelLeftOpen aria-hidden="true" />
          </Button>
        ) : null}
        <div className="mt-8 flex-1">
          <Navigation collapsed={collapsed} viewer={viewer} />
        </div>
        <SidebarFooter collapsed={collapsed} viewer={viewer} />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-[#f5f5f7]/82 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-3">
            <Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
              <SheetTrigger
                render={
                  <Button
                    aria-label="Abrir navegación"
                    className="size-10 rounded-xl md:hidden"
                    size="icon"
                    variant="outline"
                  />
                }
              >
                <Menu aria-hidden="true" />
              </SheetTrigger>
              <SheetContent className="w-[88vw] border-r-0 bg-[#1d1d1f] p-0 text-white sm:max-w-xs" side="left">
                <SheetHeader className="border-b border-white/8 px-5 py-5 text-left">
                  <Brand />
                  <SheetTitle className="sr-only">Navegación de KAIROS OS</SheetTitle>
                  <SheetDescription className="sr-only">
                    Accesos disponibles según tu rol.
                  </SheetDescription>
                </SheetHeader>
                <div className="flex-1 px-3 py-5">
                  <Navigation onNavigate={() => setMobileOpen(false)} viewer={viewer} />
                </div>
                <div className="border-t border-white/8 p-4">
                  <SidebarFooter collapsed={false} viewer={viewer} />
                  <form action={logoutAction} className="mt-3">
                    <Button
                      className="h-11 w-full rounded-xl border-white/10 bg-white/6 text-white hover:bg-white/10"
                      type="submit"
                      variant="outline"
                    >
                      <LogOut aria-hidden="true" />
                      Cerrar sesión
                    </Button>
                  </form>
                </div>
              </SheetContent>
            </Sheet>

            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground md:hidden">
                KAIROS OS
              </p>
              <p className="truncate text-[15px] font-semibold tracking-tight sm:text-base">
                {pageTitle}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right lg:block">
                <p className="max-w-56 truncate text-xs font-semibold">
                  {viewer.organizationName}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Sesión segura · {viewer.timezone}
                </p>
              </div>
              <AccountMenu viewer={viewer} />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
