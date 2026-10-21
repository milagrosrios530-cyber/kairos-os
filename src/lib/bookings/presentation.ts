export const BOOKING_STATUS_LABELS: Record<string, string> = {
  held: "Retenida",
  pending_verification: "Abono por verificar",
  confirmed: "Reservada",
  cancelled: "Cancelada",
  expired: "Hold vencido",
  completed: "Finalizada",
  blackout: "No disponible",
};

export const BOOKING_STATUS_STYLES: Record<string, string> = {
  held: "border-amber-200 bg-amber-50 text-amber-900",
  pending_verification: "border-orange-200 bg-orange-50 text-orange-950",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-950",
  cancelled: "border-slate-200 bg-slate-50 text-slate-700",
  expired: "border-slate-200 bg-slate-50 text-slate-700",
  completed: "border-sky-200 bg-sky-50 text-sky-900",
  blackout: "border-zinc-300 bg-zinc-100 text-zinc-800",
};

export function soles(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function shortTime(value: string | null | undefined) {
  if (!value) return "—";
  return value.slice(0, 5);
}

export function longDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
