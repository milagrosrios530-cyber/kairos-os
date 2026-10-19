import { Building2, MapPin, ShieldCheck, Users } from "lucide-react";

import { PlannedModules } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth/session";

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: venues } = await supabase
    .from("venues")
    .select("id, name, active, exclusive_day_policy")
    .eq("organization_id", viewer.organizationId)
    .order("name");

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-[#8b672f]">Base operativa</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          Bienvenido, {viewer.fullName.split(" ")[0]}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Este panel muestra únicamente datos persistidos del entorno conectado.
          Los indicadores comerciales se habilitarán cuando exista el módulo CRM.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="size-4" /> Organización
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{viewer.organizationName}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="size-4" /> Sedes configuradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{venues?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="size-4" /> Roles activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{viewer.roles.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldCheck className="size-4" /> Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-emerald-100 text-emerald-800" variant="secondary">
              RLS requerida
            </Badge>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border border-[#ddd3c4] bg-[#fffdf9] p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-xl font-semibold">Módulos siguientes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No contienen datos simulados ni acciones decorativas.
          </p>
        </div>
        <PlannedModules />
      </section>
    </div>
  );
}
