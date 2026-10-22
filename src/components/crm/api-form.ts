import { localDateTimeToIsoInZone } from "@/lib/dates/timezone";

export type ApiFieldErrors = Record<string, string[] | undefined>;

export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    fieldErrors?: ApiFieldErrors;
  };
};

export type FormNotice = {
  kind: "success" | "error" | "info";
  text: string;
};

export async function readApiBody(response: Response): Promise<ApiErrorBody & Record<string, unknown>> {
  try {
    return (await response.json()) as ApiErrorBody & Record<string, unknown>;
  } catch {
    return {};
  }
}

export function apiErrorMessage(
  body: ApiErrorBody,
  fallback = "No se pudo completar la operación.",
) {
  return body.error?.message?.trim() || fallback;
}

export function optionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function optionalInteger(value: FormDataEntryValue | null) {
  const normalized = optionalText(value);
  if (!normalized) return undefined;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function solesToCents(value: FormDataEntryValue | null) {
  const normalized = optionalText(value);
  if (!normalized) return undefined;
  const parsed = Number(normalized.replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : undefined;
}

export function localDateTimeToIso(
  value: FormDataEntryValue | null,
  timeZone: string,
) {
  const normalized = optionalText(value);
  if (!normalized) return undefined;
  return localDateTimeToIsoInZone(normalized, timeZone) ?? normalized;
}
