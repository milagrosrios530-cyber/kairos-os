import { NextResponse } from "next/server";

import { getViewer } from "@/server/auth/session";
import { ApplicationError } from "@/server/errors";

export async function GET() {
  const requestId = crypto.randomUUID();

  try {
    const viewer = await getViewer();
    if (!viewer) {
      return NextResponse.json(
        {
          error: {
            code: "AUTHENTICATION_REQUIRED",
            message: "Debes iniciar sesión.",
            request_id: requestId,
          },
        },
        { status: 401 },
      );
    }

    return NextResponse.json({ data: viewer, request_id: requestId });
  } catch (error) {
    const status = error instanceof ApplicationError ? error.status : 500;
    const code = error instanceof ApplicationError ? error.code : "INTERNAL_ERROR";
    const message =
      error instanceof ApplicationError
        ? error.message
        : "No se pudo validar la sesión.";
    return NextResponse.json(
      { error: { code, message, request_id: requestId } },
      { status },
    );
  }
}
