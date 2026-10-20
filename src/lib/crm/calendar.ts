const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

function monthParts(month: string) {
  const match = MONTH_PATTERN.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (year < 2000 || year > 2100 || monthNumber < 1 || monthNumber > 12) {
    return null;
  }
  return { year, monthNumber };
}
function datePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return { year: part("year"), month: part("month"), day: part("day") };
}

export function normalizeCalendarMonth(
  value: string | undefined,
  now = new Date(),
  timeZone = "America/Lima",
) {
  if (value && monthParts(value)) return value;
  const parts = datePartsInTimeZone(now, timeZone);
  return `${parts.year}-${parts.month}`;
}

export function shiftCalendarMonth(month: string, delta: number) {
  const parts = monthParts(month);
  if (!parts) throw new Error("Mes inválido.");
  const shifted = new Date(Date.UTC(parts.year, parts.monthNumber - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function calendarMonthLabel(month: string) {
  const parts = monthParts(month);
  if (!parts) throw new Error("Mes inválido.");
  const label = new Intl.DateTimeFormat("es-PE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parts.year, parts.monthNumber - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function calendarMonthGrid(month: string) {
  const parts = monthParts(month);
  if (!parts) throw new Error("Mes inválido.");
  const daysInMonth = new Date(
    Date.UTC(parts.year, parts.monthNumber, 0),
  ).getUTCDate();
  const firstWeekday = new Date(
    Date.UTC(parts.year, parts.monthNumber - 1, 1),
  ).getUTCDay();
  const leadingBlanks = (firstWeekday + 6) % 7;
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    return {
      day,
      dateKey: `${month}-${String(day).padStart(2, "0")}`,
    };
  });
  return { leadingBlanks, days };
}

export function broadUtcMonthRange(month: string) {
  const parts = monthParts(month);
  if (!parts) throw new Error("Mes inválido.");
  const dayMs = 24 * 60 * 60 * 1000;
  const start = new Date(Date.UTC(parts.year, parts.monthNumber - 1, 1) - dayMs);
  const end = new Date(Date.UTC(parts.year, parts.monthNumber, 1) + dayMs);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function instantDateKey(value: string, timeZone: string) {
  const parts = datePartsInTimeZone(new Date(value), timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

