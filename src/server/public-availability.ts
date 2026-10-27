import "server-only";

import { createHmac } from "node:crypto";
import { unstable_cache } from "next/cache";

import {
  currentCalendarMonth,
  normalizePublicCalendarMonth,
  PUBLIC_AVAILABILITY_CACHE_TAG,
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

type PublicOrganization = {
  id: string;
  name: string;
  timezone: string;
};

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

const getPublicOrganization = unstable_cache(
  async (): Promise<PublicOrganization> => {
    const admin = createAdminClient();
    const { data: organizations, error } = await admin
      .from("organizations")
      .select("id, name, timezone")
      .order("created_at")
      .limit(2);

    if (error || organizations?.length !== 1) {
      throw new ApplicationError(
        "PUBLIC_AVAILABILITY_ORGANIZATION_UNAVAILABLE",
        503,
        "El calendario público no está configurado.",
      );
    }

    return organizations[0] as PublicOrganization;
  },
  ["public-availability-organization"],
  { revalidate: 60 * 60 },
);

const getPublicBookingRows = unstable_cache(
  async (organizationId: string, month: string, nextMonth: string) => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("bookings")
      .select("event_date, event_start_time, event_end_time, status")
      .eq("organization_id", organizationId)
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

    return sanitizePublicAvailability((data ?? []) as PublicBookingRow[]);
  },
  ["public-availability-month"],
  { revalidate: 30, tags: [PUBLIC_AVAILABILITY_CACHE_TAG] },
);

export async function getPublicAvailabilityMonthView(
  requestedMonth: string | null | undefined,
) {
  const organization = await getPublicOrganization();
  const currentMonth = currentCalendarMonth(new Date(), organization.timezone);
  const month = normalizePublicCalendarMonth(requestedMonth, currentMonth);
  const nextMonth = shiftCalendarMonth(month, 1);
  const entries = await getPublicBookingRows(organization.id, month, nextMonth);

  return {
    organizationName: organization.name,
    timezone: organization.timezone,
    currentMonth,
    month,
    entries,
  };
}

export async function getPublicAvailabilityMonth(
  requestedMonth: string | null | undefined,
  requestKey: string,
) {
  const [, availability] = await Promise.all([
    consumePublicRequest(requestKey),
    getPublicAvailabilityMonthView(requestedMonth),
  ]);
  return availability;
}
