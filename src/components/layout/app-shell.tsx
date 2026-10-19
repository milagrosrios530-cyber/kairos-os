import {
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { logoutAction } from "@/app/(auth)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrimaryRole, ROLE_LABELS } from "@/lib/auth/roles";
import type { Viewer } from "@/server/auth/session";

type AppShellProps = {
  viewer: Viewer;
  children: ReactNode;
};

function Navigation({ viewer }: { viewer: Viewer }) {
  const links = [
    { href: "/app", label: "Inicio", icon: LayoutDashboard, visible: true },
    {
      href: "/app/configuracion/usuarios",
      label: "Equipo y permisos",
      icon: Users,
      visible: hasPermission(viewer.roles, "users:view"),
    },
  ].filter((item) => item.visible);

  return (
    <nav aria-label="Navegación principal" className="space-y-1">
      {links.map((item) => (
        <Link
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#d7d0c7] transition-colors hover:bg-[#2a2724] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c5a46d]"
          href={item.href}
          key={item.href}
        >
          <item.icon aria-hidden="true" className="size-4 text-[#c5a46d]" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({ viewer, children }: AppShellProps) {
  const primaryRole = getPrimaryRole(viewer.roles);

  return (
    <div className="min-h-screen bg-[#f5f0e8] md:grid md:grid-cols-[260px_1fr]">
      <aside className="hidden min-h-screen border-r border-[#39342f] bg-[#181716] p-5 md:flex md:flex-col">
        <div className="mb-9">
          <p className="font-heading text-3xl tracking-[0.08em] text-[#d5b875]">
            KAIROS
          </p>
          <p className="mt-1 text-[10px] tracking-[0.22em] text-[#8f877d]">
            GESTIÓN Y RESERVAS
          </p>
        </div>
        <Navigation viewer={viewer} />
        <div className="mt-auto rounded-xl border border-[#39342f] bg-[#201e1b] p-4">
          <div className="mb-3 flex items-center gap-2 text-xs text-[#b9b0a5]">
            <ShieldCheck className="size-4 text-[#c5a46d]" />
            Sesión protegida
          </div>
          <p className="truncate text-sm font-semibold text-white">
            {viewer.fullName}
          </p>
          <p className="mt-1 text-xs text-[#aaa196]">
            {primaryRole ? ROLE_LABELS[primaryRole] : "Sin rol"}
          </p>
          <form action={logoutAction} className="mt-4">
            <Button
              className="w-full border-[#4a443e] bg-transparent text-[#ede5dc] hover:bg-[#2f2b27] hover:text-white"
              type="submit"
              variant="outline"
            >
              <LogOut aria-hidden="true" />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-[#ddd3c4] bg-[#fffdf9]/95 px-4 py-3 backdrop-blur md:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <details className="relative md:hidden">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg border border-[#d8cdbc] px-3 text-sm font-semibold">
                Menú <ChevronDown className="size-4" />
              </summary>
              <div className="absolute left-0 top-12 w-64 rounded-xl border border-[#39342f] bg-[#181716] p-3 shadow-2xl">
                <Navigation viewer={viewer} />
                <form action={logoutAction} className="mt-3 border-t border-[#39342f] pt-3">
                  <Button className="w-full" type="submit" variant="secondary">
                    <LogOut /> Cerrar sesión
                  </Button>
                </form>
              </div>
            </details>
            <div className="md:hidden">
              <span className="font-heading text-xl tracking-[0.14em]">KAIROS</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold">{viewer.organizationName}</p>
                <p className="text-xs text-muted-foreground">{viewer.timezone}</p>
              </div>
              <Badge className="border-[#cfb680] bg-[#f2e5c7] text-[#6d4d1e]" variant="outline">
                Hito 1
              </Badge>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PlannedModules() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[
        { icon: Users, title: "CRM", milestone: "Hito 2" },
        { icon: CalendarDays, title: "Calendario y reservas", milestone: "Hito 3" },
        { icon: ShieldCheck, title: "Portal de clientes", milestone: "Hito 4" },
      ].map((module) => (
        <div
          className="rounded-xl border border-dashed border-[#cfc3b3] bg-white/35 p-4"
          key={module.title}
        >
          <module.icon className="mb-3 size-5 text-[#9b773f]" />
          <p className="font-semibold">{module.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Oculto de navegación hasta {module.milestone}.
          </p>
        </div>
      ))}
    </div>
  );
}
