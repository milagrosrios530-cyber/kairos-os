import { ContactRound, Plus, Search } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listCustomers } from "@/server/crm/queries";

type SearchParams = Promise<{ q?: string; pagina?: string }>;

export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Number.parseInt(params.pagina ?? "1", 10);
  const result = await listCustomers({ query: params.q, page });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b672f]">Base comercial</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-[40px]">Clientes</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Datos de contacto protegidos según tu rol y oportunidades vinculadas.</p>
        </div>
        <Button className="h-11 rounded-xl" render={<Link href="/app/crm/nueva" />}><Plus aria-hidden="true" /> Nuevo registro</Button>
      </section>

      <form className="flex gap-3 rounded-[22px] border border-black/[0.06] bg-white p-4 shadow-sm" method="get">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Buscar cliente</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-11 rounded-xl pl-10" defaultValue={params.q} name="q" placeholder="Nombre o teléfono" />
        </label>
        <Button className="h-11 rounded-xl" type="submit">Buscar</Button>
      </form>

      {result.items.length === 0 ? (
        <section className="rounded-[24px] border border-black/[0.06] bg-white py-14 text-center shadow-sm">
          <ContactRound aria-hidden="true" className="mx-auto size-9 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">No hay clientes para mostrar</h2>
          <p className="mt-2 text-sm text-muted-foreground">Los clientes reales aparecerán al registrar una oportunidad.</p>
        </section>
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Clientes">
          {result.items.map((customer) => (
            <Link className="rounded-[22px] border border-black/[0.06] bg-white p-5 shadow-sm outline-none transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none" href={`/app/clientes/${customer.id}`} key={customer.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><h2 className="truncate text-base font-semibold">{customer.fullName}</h2><p className="mt-1 text-xs text-muted-foreground">{customer.maskedPhone}</p></div>
                <Badge className="border-0 bg-[#f2ead9] text-[#765522]" variant="outline">{customer.customerType}</Badge>
              </div>
              <div className="mt-4 space-y-1.5 text-xs text-muted-foreground"><p>{customer.affiliationName ?? "Cliente particular"}</p><p>{customer.location ?? "Ubicación no registrada"}</p></div>
              <p className="mt-4 border-t border-black/[0.055] pt-3 text-[11px] text-muted-foreground">Asesor: {customer.assignedToName}</p>
            </Link>
          ))}
        </section>
      )}

      {result.total > result.pageSize ? (
        <nav className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-black/[0.055]" aria-label="Paginación">
          <span className="text-muted-foreground">Página {result.page} · {result.total} clientes</span>
          <div className="flex gap-2">
            {result.page > 1 ? <Button render={<Link href={{ pathname: "/app/clientes", query: { q: params.q, pagina: result.page - 1 } }} />} variant="outline">Anterior</Button> : null}
            {result.page * result.pageSize < result.total ? <Button render={<Link href={{ pathname: "/app/clientes", query: { q: params.q, pagina: result.page + 1 } }} />} variant="outline">Siguiente</Button> : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
