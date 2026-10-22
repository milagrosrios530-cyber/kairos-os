import { NextResponse } from "next/server";

import { ApplicationError } from "@/server/errors";

type ErrorDetails = Record<string, unknown> | undefined;

export function apiErrorResponse(
  error: unknown,
  requestId: string,
  fallbackMessage = "No se pudo completar la operación.",
) {
  const status = error instanceof ApplicationError ? error.status : 500;
  const code = error instanceof ApplicationError ? error.code : "INTERNAL_ERROR";
  const message =
    error instanceof ApplicationError ? error.message : fallbackMessage;
  const details =
    error instanceof ApplicationError && "details" in error
      ? (error.details as ErrorDetails)
      : undefined;

  // Keep logs correlatable without writing request bodies, credentials or PII.
  console.error(JSON.stringify({
    event: "api_request_failed",
    requestId,
    status,
    code,
    errorName: error instanceof Error ? error.name : "UnknownError",
  }));

  return NextResponse.json(
    {
      error: {
        code,
        message,
        request_id: requestId,
        ...(details ? { details } : {}),
      },
    },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

export function invalidJsonResponse(requestId: string) {
  return NextResponse.json(
    {
      error: {
        code: "INVALID_JSON",
        message: "El cuerpo de la solicitud no es JSON válido.",
        request_id: requestId,
      },
    },
    { status: 400, headers: { "Cache-Control": "private, no-store" } },
  );
}

export function validationErrorResponse(
  requestId: string,
  details: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Revisa los datos ingresados.",
        request_id: requestId,
        details,
      },
    },
    { status: 400, headers: { "Cache-Control": "private, no-store" } },
  );
}
