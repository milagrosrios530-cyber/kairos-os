import { NextResponse, type NextRequest } from "next/server";

import { createUserSchema } from "@/lib/validation/auth";
import { ApplicationError } from "@/server/errors";
import { createEmployee } from "@/server/users/staff-login";

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
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

    const payload = createUserSchema.safeParse(body);
    if (!payload.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Revisa los datos ingresados.",
            request_id: requestId,
            details: payload.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    const result = await createEmployee({
      email: payload.data.email,
      fullName: payload.data.fullName,
      dni: payload.data.dni,
      password: payload.data.password,
      role: payload.data.role,
      requestId,
    });

    return NextResponse.json(
      { data: result, request_id: requestId },
      { status: 201 },
    );
  } catch (error) {
    const status = error instanceof ApplicationError ? error.status : 500;
    const code = error instanceof ApplicationError ? error.code : "INTERNAL_ERROR";
    const message =
      error instanceof ApplicationError
        ? error.message
        : "No se pudo crear la cuenta interna.";

    return NextResponse.json(
      { error: { code, message, request_id: requestId } },
      { status },
    );
  }
}
