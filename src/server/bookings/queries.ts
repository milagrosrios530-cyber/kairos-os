import "server-only";

import { hasPermission } from "@/lib/auth/permissions";
import { shiftCalendarMonth } from "@/lib/crm/calendar";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/server/auth/session";
import { ApplicationError } from "@/server/errors";

type BookingRow = {
  id: string;
  booking_code: string;
  venue_id: string;
  customer_id: string;
  opportunity_id: string;
  event_type_id: string | null;
  event_date: string;
  event_start_time: string;
  event_end_time: string | null;
  guest_count: number | null;
  assigned_to: string;
  total_contract_cents: number;
  deposit_verified_cents: number;
  balance_after_initial_cents: number | null;
  intermediate_due_cents: number | null;
  intermediate_due_date: string | null;
  final_scheduled_cents: number | null;
  final_due_at: string | null;
  status: string;
  hold_expires_at: string | null;
  confirmed_at: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

type AllocationRow = {
  id: string;
  booking_id: string | null;
  opportunity_id: string | null;
  kind: "hold" | "booking" | "blackout";
  local_date: string;
  blocking: boolean;
  hold_expires_at: string | null;
  reason: string | null;
};

type OpportunityCalendarRow = {
  id: string;
  customer_id: string;
  event_type_id: string | null;
  assigned_to: string;
  occasion_detail: string | null;
};

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

async function calendarNameMaps(
  organizationId: string,
  bookings: BookingRow[],
  opportunities: OpportunityCalendarRow[],
) {
  const supabase = await createClient();
  const customerIds = unique([
    ...bookings.map((booking) => booking.customer_id),
    ...opportunities.map((opportunity) => opportunity.customer_id),
  ]);
  const eventTypeIds = unique([
    ...bookings.map((booking) => booking.event_type_id),
    ...opportunities.map((opportunity) => opportunity.event_type_id),
  ]);
  const adviserIds = unique([
    ...bookings.map((booking) => booking.assigned_to),
    ...opportunities.map((opportunity) => opportunity.assigned_to),
  ]);
  const [customers, eventTypes, profiles, venues] = await Promise.all([
    customerIds.length
      ? supabase
          .from("customers")
          .select("id, full_name")
          .eq("organization_id", organizationId)
          .in("id", customerIds)
      : Promise.resolve({ data: [], error: null }),
    eventTypeIds.length
      ? supabase
          .from("event_types")
          .select("id, name")
          .eq("organization_id", organizationId)
          .in("id", eventTypeIds)
      : Promise.resolve({ data: [], error: null }),
    adviserIds.length
      ? supabase
          .from("profiles")
          .select("user_id, full_name")
          .eq("organization_id", organizationId)
          .in("user_id", adviserIds)
      : Promise.resolve({ data: [], error: null }),
    bookings.length
      ? supabase
          .from("venues")
          .select("id, name")
          .eq("organization_id", organizationId)
          .in("id", unique(bookings.map((booking) => booking.venue_id)))
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (customers.error || eventTypes.error || profiles.error || venues.error) {
    throw new ApplicationError(
      "BOOKING_NAMES_FAILED",
      500,
      "No se pudieron completar los datos de las reservas.",
    );
  }

  return {
    customers: new Map((customers.data ?? []).map((row) => [row.id as string, row.full_name as string])),
    eventTypes: new Map((eventTypes.data ?? []).map((row) => [row.id as string, row.name as string])),
    profiles: new Map((profiles.data ?? []).map((row) => [row.user_id as string, row.full_name as string])),
    venues: new Map((venues.data ?? []).map((row) => [row.id as string, row.name as string])),
  };
}

async function bookingNameMaps(
  organizationId: string,
  bookings: BookingRow[],
) {
  return calendarNameMaps(organizationId, bookings, []);
}

export async function getBookingCalendarMonth(month: string) {
  const viewer = await requirePermission("calendar:view");
  const supabase = await createClient();
  const nextMonth = shiftCalendarMonth(month, 1);
  const { data, error } = await supabase
    .from("schedule_allocations")
    .select("id, booking_id, opportunity_id, kind, local_date, blocking, hold_expires_at, reason")
    .eq("organization_id", viewer.organizationId)
    .eq("blocking", true)
    .gte("local_date", `${month}-01`)
    .lt("local_date", `${nextMonth}-01`)
    .order("local_date");

  if (error) {
    throw new ApplicationError(
      "BOOKING_CALENDAR_FAILED",
      500,
      "No se pudo consultar el calendario de reservas.",
    );
  }

  const now = Date.now();
  const allocations = ((data ?? []) as AllocationRow[]).filter(
    (allocation) => allocation.kind !== "hold"
      || !allocation.hold_expires_at
      || new Date(allocation.hold_expires_at).getTime() > now,
  );
  const bookingIds = unique(allocations.map((allocation) => allocation.booking_id));
  const opportunityIds = unique(
    allocations.map((allocation) => allocation.opportunity_id),
  );
  const bookingResult = bookingIds.length
    ? await supabase
        .from("bookings")
        .select("id, booking_code, venue_id, customer_id, opportunity_id, event_type_id, event_date, event_start_time, event_end_time, guest_count, assigned_to, total_contract_cents, deposit_verified_cents, balance_after_initial_cents, intermediate_due_cents, intermediate_due_date, final_scheduled_cents, final_due_at, status, hold_expires_at, confirmed_at, internal_notes, created_at, updated_at")
        .eq("organization_id", viewer.organizationId)
        .in("id", bookingIds)
    : { data: [], error: null };
  if (bookingResult.error) {
    throw new ApplicationError(
      "BOOKING_CALENDAR_DETAILS_FAILED",
      500,
      "No se pudieron completar las reservas del calendario.",
    );
  }

  const opportunityResult = opportunityIds.length
    ? await supabase
        .from("opportunities")
        .select("id, customer_id, event_type_id, assigned_to, occasion_detail")
        .eq("organization_id", viewer.organizationId)
        .in("id", opportunityIds)
    : { data: [], error: null };
  if (opportunityResult.error) {
    throw new ApplicationError(
      "BOOKING_CALENDAR_OPPORTUNITIES_FAILED",
      500,
      "No se pudieron completar los datos autorizados del calendario.",
    );
  }

  const bookings = (bookingResult.data ?? []) as BookingRow[];
  const opportunities = (opportunityResult.data ?? []) as OpportunityCalendarRow[];
  const bookingMap = new Map(bookings.map((booking) => [booking.id, booking]));
  const opportunityMap = new Map(
    opportunities.map((opportunity) => [opportunity.id, opportunity]),
  );
  const maps = await calendarNameMaps(
    viewer.organizationId,
    bookings,
    opportunities,
  );

  return {
    timezone: viewer.timezone,
    canCreate: hasPermission(viewer.roles, "bookings:create"),
    canManage: hasPermission(viewer.roles, "bookings:manage"),
    entries: allocations.map((allocation) => {
      const booking = allocation.booking_id
        ? bookingMap.get(allocation.booking_id)
        : undefined;
      const opportunity = allocation.opportunity_id
        ? opportunityMap.get(allocation.opportunity_id)
        : undefined;
      const genericLabel = allocation.kind === "blackout"
        ? "Fecha no disponible"
        : allocation.kind === "hold"
          ? "Fecha retenida"
          : "Fecha reservada";
      return {
        id: allocation.id,
        bookingId: booking?.id ?? null,
        opportunityId: booking?.opportunity_id ?? opportunity?.id ?? null,
        dateKey: allocation.local_date,
        kind: allocation.kind,
        status: booking?.status ?? (allocation.kind === "hold" ? "held" : "blackout"),
        title: booking
          ? maps.eventTypes.get(booking.event_type_id ?? "") ?? "Evento"
          : opportunity
            ? opportunity.occasion_detail
              ?? maps.eventTypes.get(opportunity.event_type_id ?? "")
              ?? "Evento"
            : genericLabel,
        customerName: booking
          ? maps.customers.get(booking.customer_id) ?? "Cliente autorizado"
          : opportunity
            ? maps.customers.get(opportunity.customer_id) ?? "Cliente autorizado"
            : null,
        adviserName: booking
          ? maps.profiles.get(booking.assigned_to) ?? "Asesor autorizado"
          : opportunity
            ? maps.profiles.get(opportunity.assigned_to) ?? "Asesor autorizado"
            : null,
        bookingCode: booking?.booking_code ?? null,
        eventStartTime: booking?.event_start_time ?? null,
        holdExpiresAt: allocation.hold_expires_at,
        reason: allocation.kind === "blackout" ? allocation.reason : null,
        detailsVisible: Boolean(booking || opportunity),
      };
    }),
  };
}

export async function getBookingFormOptions() {
  const viewer = await requirePermission("bookings:create");
  const supabase = await createClient();
  const [venuesResult, opportunitiesResult, activeBookingsResult] = await Promise.all([
    supabase
      .from("venues")
      .select("id, name")
      .eq("organization_id", viewer.organizationId)
      .eq("active", true)
      .eq("exclusive_day_policy", true)
      .order("name"),
    supabase
      .from("opportunities")
      .select("id, opportunity_code, customer_id, event_type_id, desired_date, guests_total, assigned_to, pipeline_status")
      .eq("organization_id", viewer.organizationId)
      .is("archived_at", null)
      .not("pipeline_status", "in", "(ganado,perdido,descartado)")
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("bookings")
      .select("opportunity_id")
      .eq("organization_id", viewer.organizationId)
      .in("status", ["held", "pending_verification", "confirmed"]),
  ]);

  if (venuesResult.error || opportunitiesResult.error || activeBookingsResult.error) {
    throw new ApplicationError(
      "BOOKING_OPTIONS_FAILED",
      500,
      "No se pudo preparar el formulario de reserva.",
    );
  }

  const activeOpportunityIds = new Set(
    (activeBookingsResult.data ?? []).map((row) => row.opportunity_id as string),
  );
  const opportunities = (opportunitiesResult.data ?? []).filter(
    (row) => !activeOpportunityIds.has(row.id as string),
  );
  const customerIds = unique(opportunities.map((row) => row.customer_id as string));
  const eventTypeIds = unique(opportunities.map((row) => row.event_type_id as string | null));
  const adviserIds = unique(opportunities.map((row) => row.assigned_to as string));
  const [customers, eventTypes, profiles] = await Promise.all([
    customerIds.length
      ? supabase.from("customers").select("id, full_name").eq("organization_id", viewer.organizationId).in("id", customerIds)
      : Promise.resolve({ data: [], error: null }),
    eventTypeIds.length
      ? supabase.from("event_types").select("id, name").eq("organization_id", viewer.organizationId).in("id", eventTypeIds)
      : Promise.resolve({ data: [], error: null }),
    adviserIds.length
      ? supabase.from("profiles").select("user_id, full_name").eq("organization_id", viewer.organizationId).in("user_id", adviserIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (customers.error || eventTypes.error || profiles.error) {
    throw new ApplicationError("BOOKING_OPTIONS_NAMES_FAILED", 500, "No se pudo completar el formulario.");
  }
  const customerMap = new Map((customers.data ?? []).map((row) => [row.id as string, row.full_name as string]));
  const eventTypeMap = new Map((eventTypes.data ?? []).map((row) => [row.id as string, row.name as string]));
  const adviserMap = new Map((profiles.data ?? []).map((row) => [row.user_id as string, row.full_name as string]));

  return {
    venues: (venuesResult.data ?? []).map((row) => ({ id: row.id as string, name: row.name as string })),
    opportunities: opportunities.map((row) => ({
      id: row.id as string,
      code: row.opportunity_code as string,
      customerName: customerMap.get(row.customer_id as string) ?? "Cliente autorizado",
      eventType: row.event_type_id
        ? eventTypeMap.get(row.event_type_id as string) ?? "Evento"
        : "Evento",
      desiredDate: row.desired_date as string | null,
      guestsTotal: row.guests_total as number | null,
      adviserName: adviserMap.get(row.assigned_to as string) ?? viewer.fullName,
    })),
  };
}

export async function listBookings() {
  const viewer = await requirePermission("bookings:view");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, booking_code, venue_id, customer_id, opportunity_id, event_type_id, event_date, event_start_time, event_end_time, guest_count, assigned_to, total_contract_cents, deposit_verified_cents, balance_after_initial_cents, intermediate_due_cents, intermediate_due_date, final_scheduled_cents, final_due_at, status, hold_expires_at, confirmed_at, internal_notes, created_at, updated_at")
    .eq("organization_id", viewer.organizationId)
    .order("event_date", { ascending: true })
    .limit(200);
  if (error) throw new ApplicationError("BOOKING_LIST_FAILED", 500, "No se pudieron consultar las reservas.");
  const bookings = (data ?? []) as BookingRow[];
  const maps = await bookingNameMaps(viewer.organizationId, bookings);
  return bookings.map((booking) => ({
    id: booking.id,
    code: booking.booking_code,
    customerName: maps.customers.get(booking.customer_id) ?? "Cliente autorizado",
    eventType: maps.eventTypes.get(booking.event_type_id ?? "") ?? "Evento",
    venueName: maps.venues.get(booking.venue_id) ?? "Salón",
    adviserName: maps.profiles.get(booking.assigned_to) ?? viewer.fullName,
    eventDate: booking.event_date,
    eventStartTime: booking.event_start_time,
    status: booking.status,
    holdExpiresAt: booking.hold_expires_at,
    totalContractCents: booking.total_contract_cents,
  }));
}

export async function getBookingDetail(bookingId: string) {
  const viewer = await requirePermission("bookings:view");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, booking_code, venue_id, customer_id, opportunity_id, event_type_id, event_date, event_start_time, event_end_time, guest_count, assigned_to, total_contract_cents, deposit_verified_cents, balance_after_initial_cents, intermediate_due_cents, intermediate_due_date, final_scheduled_cents, final_due_at, status, hold_expires_at, confirmed_at, internal_notes, created_at, updated_at")
    .eq("organization_id", viewer.organizationId)
    .eq("id", bookingId)
    .maybeSingle();
  if (error) throw new ApplicationError("BOOKING_DETAIL_FAILED", 500, "No se pudo consultar la reserva.");
  if (!data) return null;
  const booking = data as BookingRow;
  const [maps, deposits] = await Promise.all([
    bookingNameMaps(viewer.organizationId, [booking]),
    supabase
      .from("booking_deposit_records")
      .select("id, amount_cents, payment_method, payment_reference, status, submitted_at, verified_at, review_note")
      .eq("organization_id", viewer.organizationId)
      .eq("booking_id", bookingId)
      .order("submitted_at", { ascending: false }),
  ]);
  if (deposits.error) throw new ApplicationError("BOOKING_DEPOSITS_FAILED", 500, "No se pudieron consultar los abonos.");

  return {
    id: booking.id,
    code: booking.booking_code,
    opportunityId: booking.opportunity_id,
    customerName: maps.customers.get(booking.customer_id) ?? "Cliente autorizado",
    eventType: maps.eventTypes.get(booking.event_type_id ?? "") ?? "Evento",
    venueName: maps.venues.get(booking.venue_id) ?? "Salón",
    adviserName: maps.profiles.get(booking.assigned_to) ?? viewer.fullName,
    eventDate: booking.event_date,
    eventStartTime: booking.event_start_time,
    eventEndTime: booking.event_end_time,
    guestCount: booking.guest_count,
    totalContractCents: booking.total_contract_cents,
    depositVerifiedCents: booking.deposit_verified_cents,
    balanceAfterInitialCents: booking.balance_after_initial_cents,
    intermediateDueCents: booking.intermediate_due_cents,
    intermediateDueDate: booking.intermediate_due_date,
    finalScheduledCents: booking.final_scheduled_cents,
    finalDueAt: booking.final_due_at,
    status: booking.status,
    holdExpiresAt: booking.hold_expires_at,
    confirmedAt: booking.confirmed_at,
    notes: booking.internal_notes,
    updatedAt: booking.updated_at,
    canManage: hasPermission(viewer.roles, "bookings:manage"),
    canSubmitDeposit: hasPermission(viewer.roles, "bookings:create"),
    deposits: (deposits.data ?? []).map((deposit) => ({
      id: deposit.id as string,
      amountCents: deposit.amount_cents as number,
      paymentMethod: deposit.payment_method as string,
      paymentReference: deposit.payment_reference as string | null,
      status: deposit.status as string,
      submittedAt: deposit.submitted_at as string,
      verifiedAt: deposit.verified_at as string | null,
      reviewNote: deposit.review_note as string | null,
    })),
  };
}
