import "server-only";

import { revalidateTag } from "next/cache";

import { PUBLIC_AVAILABILITY_CACHE_TAG } from "@/lib/public-availability";
import { createClient } from "@/lib/supabase/server";
import type {
  BookingReason,
  ConfirmBooking,
  CreateBlackout,
  CreateBookingHold,
  RescheduleBooking,
  SubmitBookingDeposit,
} from "@/lib/validation/bookings";
import { requirePermission } from "@/server/auth/session";
import { ApplicationError, AuthorizationError } from "@/server/errors";

type DatabaseError = { code?: string; message?: string };

function mapBookingError(error: DatabaseError, fallback: string): never {
  if (error.code === "42501") throw new AuthorizationError();
  if (error.code === "P0002") {
    throw new ApplicationError(
      "BOOKING_NOT_FOUND",
      404,
      "La reserva no existe o no está disponible para tu usuario.",
    );
  }
  if (error.code === "23P01") {
    throw new ApplicationError(
      "DATE_UNAVAILABLE",
      409,
      "La fecha acaba de ser ocupada. Elige otra fecha disponible.",
    );
  }
  if (["23505", "40001"].includes(error.code ?? "")) {
    throw new ApplicationError(
      "BOOKING_CONFLICT",
      409,
      "La operación entra en conflicto con otro cambio. Actualiza e inténtalo nuevamente.",
    );
  }
  if (["22023", "23503", "23514", "P0001"].includes(error.code ?? "")) {
    throw new ApplicationError("BOOKING_RULE_VIOLATION", 422, fallback);
  }
  throw new ApplicationError("BOOKING_DATABASE_ERROR", 500, fallback);
}

function ensureNotExpired(data: unknown) {
  if (data && typeof data === "object" && "status" in data && data.status === "expired") {
    throw new ApplicationError(
      "HOLD_EXPIRED",
      409,
      "El hold venció y la fecha fue liberada. Crea un nuevo hold si continúa disponible.",
    );
  }
}

function invalidatePublicAvailability() {
  revalidateTag(PUBLIC_AVAILABILITY_CACHE_TAG, { expire: 0 });
}

export async function createBookingHold(input: CreateBookingHold) {
  await requirePermission("bookings:create");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_booking_hold", {
    p_opportunity_id: input.opportunityId,
    p_venue_id: input.venueId,
    p_event_date: input.eventDate,
    p_event_start_time: input.eventStartTime,
    p_event_end_time: input.eventEndTime ?? null,
    p_total_contract_cents: input.totalContractCents,
    p_internal_notes: input.internalNotes ?? null,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) mapBookingError(error, "No se pudo retener la fecha.");
  return data as { booking_id: string; booking_code: string; status: string };
}

export async function submitBookingDeposit(bookingId: string, input: SubmitBookingDeposit) {
  await requirePermission("bookings:create");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_booking_deposit", {
    p_booking_id: bookingId,
    p_amount_cents: input.amountCents,
    p_payment_method: input.paymentMethod,
    p_payment_reference: input.paymentReference ?? null,
    p_note: input.note ?? null,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) mapBookingError(error, "No se pudo registrar el abono.");
  ensureNotExpired(data);
  return data;
}

export async function confirmBooking(bookingId: string, input: ConfirmBooking) {
  await requirePermission("bookings:manage");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_booking_deposit_and_confirm", {
    p_booking_id: bookingId,
    p_deposit_id: input.depositId,
    p_review_note: input.reviewNote ?? null,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) mapBookingError(error, "No se pudo verificar el abono y confirmar la reserva.");
  ensureNotExpired(data);
  invalidatePublicAvailability();
  return data;
}

export async function rejectBookingDeposit(
  bookingId: string,
  depositId: string,
  input: BookingReason,
) {
  await requirePermission("bookings:manage");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reject_booking_deposit", {
    p_booking_id: bookingId,
    p_deposit_id: depositId,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) mapBookingError(error, "No se pudo rechazar el comprobante.");
  return data;
}

export async function releaseBookingHold(bookingId: string, input: BookingReason) {
  await requirePermission("bookings:create");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("release_booking_hold", {
    p_booking_id: bookingId,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) mapBookingError(error, "No se pudo liberar el hold.");
  return data;
}

export async function extendBookingHold(bookingId: string, input: BookingReason) {
  await requirePermission("bookings:manage");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("extend_booking_hold", {
    p_booking_id: bookingId,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) mapBookingError(error, "No se pudo extender el hold.");
  ensureNotExpired(data);
  return data;
}

export async function cancelConfirmedBooking(bookingId: string, input: BookingReason) {
  await requirePermission("bookings:manage");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_confirmed_booking", {
    p_booking_id: bookingId,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) mapBookingError(error, "No se pudo cancelar la reserva.");
  invalidatePublicAvailability();
  return data;
}

export async function rescheduleBooking(bookingId: string, input: RescheduleBooking) {
  await requirePermission("bookings:manage");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reschedule_booking", {
    p_booking_id: bookingId,
    p_event_date: input.eventDate,
    p_event_start_time: input.eventStartTime,
    p_event_end_time: input.eventEndTime ?? null,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) mapBookingError(error, "No se pudo reprogramar la reserva.");
  ensureNotExpired(data);
  invalidatePublicAvailability();
  return data;
}

export async function createCalendarBlackout(input: CreateBlackout) {
  await requirePermission("bookings:manage");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_calendar_blackout", {
    p_venue_id: input.venueId,
    p_event_date: input.eventDate,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) mapBookingError(error, "No se pudo bloquear la fecha.");
  return data;
}

export async function releaseCalendarBlackout(allocationId: string, input: BookingReason) {
  await requirePermission("bookings:manage");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("release_calendar_blackout", {
    p_allocation_id: allocationId,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) mapBookingError(error, "No se pudo liberar el bloqueo operativo.");
  return data;
}
