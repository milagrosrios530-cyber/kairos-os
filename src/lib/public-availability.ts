import {
  instantDateKey,
  normalizeCalendarMonth,
  shiftCalendarMonth,
} from "@/lib/crm/calendar";

export const PUBLIC_CALENDAR_MONTHS = 12;

export type PublicBookingRow = {
  event_date: string;
  event_start_time: string;
  event_end_time: string | null;
  status: string;
};

export type PublicAvailabilityEntry = {
  date: string;
  startTime: string;
  endTime: string | null;
  status: "reserved";
};

export function currentCalendarMonth(now: Date, timezone: string) {
  return instantDateKey(now.toISOString(), timezone).slice(0, 7);
}

export function normalizePublicCalendarMonth(
  requestedMonth: string | null | undefined,
  currentMonth: string,
) {
  const normalized = normalizeCalendarMonth(requestedMonth ?? undefined);
  const lastMonth = shiftCalendarMonth(currentMonth, PUBLIC_CALENDAR_MONTHS - 1);

  if (normalized < currentMonth || normalized > lastMonth) return currentMonth;
  return normalized;
}

export function publicCalendarNavigation(month: string, currentMonth: string) {
  const lastMonth = shiftCalendarMonth(currentMonth, PUBLIC_CALENDAR_MONTHS - 1);
  return {
    canGoPrevious: month > currentMonth,
    canGoNext: month < lastMonth,
    previousMonth: shiftCalendarMonth(month, -1),
    nextMonth: shiftCalendarMonth(month, 1),
  };
}

export function sanitizePublicAvailability(
  rows: PublicBookingRow[],
): PublicAvailabilityEntry[] {
  return rows
    .filter((row) => row.status === "confirmed")
    .map((row) => ({
      date: row.event_date,
      startTime: row.event_start_time.slice(0, 5),
      endTime: row.event_end_time?.slice(0, 5) ?? null,
      status: "reserved" as const,
    }));
}
