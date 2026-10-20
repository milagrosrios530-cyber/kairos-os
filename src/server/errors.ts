export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export class AuthenticationError extends ApplicationError {
  constructor() {
    super("AUTHENTICATION_REQUIRED", 401, "Debes iniciar sesión.");
  }
}

export class AuthorizationError extends ApplicationError {
  constructor() {
    super("FORBIDDEN", 403, "No tienes permiso para realizar esta acción.");
  }
}
