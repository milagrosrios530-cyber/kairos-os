type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function parseLocalDateTime(value: string): LocalDateTimeParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  };
}

function zonedParts(timestamp: number, timeZone: string): LocalDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

function partsAsUtc(parts: LocalDateTimeParts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
}

export function localDateTimeToIsoInZone(value: string, timeZone: string) {
  const desired = parseLocalDateTime(value);
  if (!desired) return undefined;

  const desiredAsUtc = partsAsUtc(desired);
  let timestamp = desiredAsUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    timestamp += desiredAsUtc - partsAsUtc(zonedParts(timestamp, timeZone));
  }

  const resolved = zonedParts(timestamp, timeZone);
  if (partsAsUtc(resolved) !== desiredAsUtc) return undefined;
  return new Date(timestamp).toISOString();
}

export function formatDateTimeInZone(
  value: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  },
) {
  return new Intl.DateTimeFormat("es-PE", { ...options, timeZone }).format(
    new Date(value),
  );
}
