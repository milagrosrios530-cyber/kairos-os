import { z } from "zod";

export const PAYMENT_METHODS = [
  "transferencia",
  "yape",
  "plin",
  "efectivo",
  "tarjeta",
  "otro",
] as const;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function validDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

const eventDateSchema = z.string().refine(validDate, "Ingresa una fecha válida.");
const eventTimeSchema = z.string().regex(TIME_PATTERN, "Ingresa una hora válida.");
const optionalText = (max: number) => z.string().trim().max(max).optional();

export const createBookingHoldSchema = z
  .strictObject({
    opportunityId: z.string().uuid(),
    venueId: z.string().uuid(),
    eventDate: eventDateSchema,
    eventStartTime: eventTimeSchema,
    eventEndTime: eventTimeSchema.optional(),
    totalContractCents: z.number().int().min(50_000).max(1_000_000_000),
    internalNotes: optionalText(5_000),
    idempotencyKey: z.string().uuid(),
  })
  .superRefine((value, context) => {
    if (value.eventEndTime && value.eventEndTime === value.eventStartTime) {
      context.addIssue({
        code: "custom",
        path: ["eventEndTime"],
        message: "La hora final debe ser diferente a la hora de inicio.",
      });
    }
  });

export const submitBookingDepositSchema = z.strictObject({
  amountCents: z.number().int().min(50_000).max(1_000_000_000),
  paymentMethod: z.enum(PAYMENT_METHODS),
  paymentReference: z.string().trim().min(3).max(180).optional(),
  note: optionalText(1_000),
  idempotencyKey: z.string().uuid(),
});

export const confirmBookingSchema = z.strictObject({
  depositId: z.string().uuid(),
  reviewNote: optionalText(1_000),
  idempotencyKey: z.string().uuid(),
});

export const bookingReasonSchema = z.strictObject({
  reason: z.string().trim().min(3).max(1_000),
  idempotencyKey: z.string().uuid(),
});

export const rescheduleBookingSchema = z
  .strictObject({
    eventDate: eventDateSchema,
    eventStartTime: eventTimeSchema,
    eventEndTime: eventTimeSchema.optional(),
    reason: z.string().trim().min(3).max(1_000),
    idempotencyKey: z.string().uuid(),
  })
  .superRefine((value, context) => {
    if (value.eventEndTime && value.eventEndTime === value.eventStartTime) {
      context.addIssue({
        code: "custom",
        path: ["eventEndTime"],
        message: "La hora final debe ser diferente a la hora de inicio.",
      });
    }
  });

export const createBlackoutSchema = z.strictObject({
  venueId: z.string().uuid(),
  eventDate: eventDateSchema,
  reason: z.string().trim().min(3).max(1_000),
  idempotencyKey: z.string().uuid(),
});

export type CreateBookingHold = z.infer<typeof createBookingHoldSchema>;
export type SubmitBookingDeposit = z.infer<typeof submitBookingDepositSchema>;
export type ConfirmBooking = z.infer<typeof confirmBookingSchema>;
export type BookingReason = z.infer<typeof bookingReasonSchema>;
export type RescheduleBooking = z.infer<typeof rescheduleBookingSchema>;
export type CreateBlackout = z.infer<typeof createBlackoutSchema>;
