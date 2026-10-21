import { ArrowLeft, CalendarCheck2 } from "lucide-react";
import Link from "next/link";

import { BookingHoldForm } from "@/components/bookings/booking-hold-form";
import { Button } from "@/components/ui/button";
import { getBookingFormOptions } from "@/server/bookings/queries";

type SearchParams = Promise<{ fecha?: string; oportunidad?: string }>;

export default async function NewBookingPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, options] = await Promise.all([searchParams, getBookingFormOptions()]);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button render={<Link href="/app/calendario" />} variant="ghost"><ArrowLeft /> Volver al calendario</Button>
      <section className="rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-7"><p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b672f]"><CalendarCheck2 className="size-4" /> Nueva retención</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Retener fecha</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Solo cuatro datos esenciales. La base rechazará cualquier cruce aunque dos personas intenten guardar al mismo tiempo.</p></div>
        <BookingHoldForm defaultDate={params.fecha} defaultOpportunityId={params.oportunidad} opportunities={options.opportunities} venues={options.venues} />
      </section>
    </div>
  );
}
