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

  return NextResponse.json(
    {
      error: {
        code,
        message,
        request_id: requestId,
        ...(details ? { details } : {}),
      },
    },
    { status },
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
    { status: 400 },
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
    { status: 400 },
  );
}
