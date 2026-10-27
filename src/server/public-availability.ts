import "server-only";

import { createHmac } from "node:crypto";

import {
  currentCalendarMonth,
  normalizePublicCalendarMonth,
  sanitizePublicAvailability,
  type PublicBookingRow,
} from "@/lib/public-availability";
import { shiftCalendarMonth } from "@/lib/crm/calendar";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffLoginSecret } from "@/lib/server-env";
import { ApplicationError } from "@/server/errors";

const PUBLIC_REQUEST_LIMIT = 120;
const PUBLIC_REQUEST_WINDOW_SECONDS = 15 * 60;

type HeaderReader = Pick<Headers, "get">;

function secureRequestHash(value: string) {
  return createHmac("sha256", getStaffLoginSecret())
    .update(`public-availability:${value}`)
    .digest("hex");
}

export function publicRequestKey(headers: HeaderReader) {
  const forwarded = headers.get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim()
    .slice(0, 100);
  const direct = headers.get("x-real-ip")?.trim().slice(0, 100);
  const agent = headers.get("user-agent")?.trim().slice(0, 180);
  return forwarded || direct || `unknown:${agent || "anonymous"}`;
}

async function consumePublicRequest(key: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_staff_login_rate_limit", {
    p_key_hash: secureRequestHash(key),
    p_max_attempts: PUBLIC_REQUEST_LIMIT,
    p_window_seconds: PUBLIC_REQUEST_WINDOW_SECONDS,
  });

  if (error) {
    throw new ApplicationError(
      "PUBLIC_AVAILABILITY_RATE_LIMIT_FAILED",
      503,
      "La disponibilidad pública no está disponible temporalmente.",
    );
  }
  if (data !== true) {
    throw new ApplicationError(
      "PUBLIC_AVAILABILITY_RATE_LIMITED",
      429,
      "Se alcanzó el límite temporal de consultas. Inténtalo nuevamente en unos minutos.",
    );
  }
}

export async function getPublicAvailabilityMonth(
  requestedMonth: string | null | undefined,
  requestKey: string,
) {
  await consumePublicRequest(requestKey);

  const admin = createAdminClient();
  const { data: organizations, error: organizationError } = await admin
    .from("organizations")
    .select("id, name, timezone")
    .order("created_at")
    .limit(2);

  if (organizationError || organizations?.length !== 1) {
    throw new ApplicationError(
      "PUBLIC_AVAILABILITY_ORGANIZATION_UNAVAILABLE",
      503,
      "El calendario público no está configurado.",
    );
  }

  const organization = organizations[0];
  const currentMonth = currentCalendarMonth(new Date(), organization.timezone);
  const month = normalizePublicCalendarMonth(requestedMonth, currentMonth);
  const nextMonth = shiftCalendarMonth(month, 1);
  const { data, error } = await admin
    .from("bookings")
    .select("event_date, event_start_time, event_end_time, status")
    .eq("organization_id", organization.id)
    .eq("status", "confirmed")
    .gte("event_date", `${month}-01`)
    .lt("event_date", `${nextMonth}-01`)
    .order("event_date");

  if (error) {
    throw new ApplicationError(
      "PUBLIC_AVAILABILITY_QUERY_FAILED",
      503,
      "No se pudo consultar la disponibilidad pública.",
    );
  }

  return {
    organizationName: organization.name,
    timezone: organization.timezone,
    currentMonth,
    month,
    entries: sanitizePublicAvailability((data ?? []) as PublicBookingRow[]),
  };
}
