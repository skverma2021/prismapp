type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PRECONDITION_FAILED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

export class HttpError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode;
  public readonly details?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getRequestId(request: Request): string {
  return request.headers.get("x-request-id") ?? "unknown";
}

function logServerError(error: unknown, requestId?: string) {
  const rid = requestId ?? "unknown";

  if (error instanceof HttpError) {
    if (error.status >= 500) {
      console.error("[api]", {
        level: "error",
        requestId: rid,
        status: error.status,
        code: error.code,
        message: error.message,
        details: error.details,
      });
    }

    return;
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    const prismaLikeError = error as { code?: string; meta?: unknown; message?: string; stack?: string };

    console.error("[api]", {
      level: "error",
      requestId: rid,
      code: prismaLikeError.code,
      message: prismaLikeError.message,
      meta: prismaLikeError.meta,
      stack: prismaLikeError.stack,
    });
    return;
  }

  if (error instanceof Error) {
    console.error("[api]", {
      level: "error",
      requestId: rid,
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    return;
  }

  console.error("[api]", { level: "error", requestId: rid, error });
}

function isConnectivityFailure(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toUpperCase();

  return (
    message.includes("ECONNREFUSED") ||
    message.includes("ECONNRESET") ||
    message.includes("ETIMEDOUT") ||
    message.includes("CONNECTION TERMINATED") ||
    message.includes("CAN'T REACH DATABASE SERVER")
  );
}

function isRetryableDatabaseFailure(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "code" in error) {
    const prismaLikeError = error as { code?: string };

    if (["P1001", "P1002", "P1017", "P2024", "P2028"].includes(prismaLikeError.code ?? "")) {
      return true;
    }
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toUpperCase();

  return (
    message.includes("TRANSACTION ALREADY CLOSED") ||
    message.includes("TRANSACTION TIMED OUT") ||
    message.includes("SERVER HAS CLOSED THE CONNECTION") ||
    message.includes("SOCKET HANG UP")
  );
}

export function ok<T>(data: T, status = 200): Response {
  return Response.json({ ok: true, data }, { status });
}

export function fail(error: HttpError): Response {
  return Response.json(
    {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        retryable: error.code === "RATE_LIMITED" || error.code === "SERVICE_UNAVAILABLE",
      },
    },
    { status: error.status }
  );
}

export function fromUnknownError(error: unknown, requestId?: string): HttpError {
  if (error instanceof HttpError) {
    logServerError(error, requestId);
    return error;
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    const prismaLikeError = error as { code?: string; meta?: unknown };

    if (prismaLikeError.code === "P2002") {
      return new HttpError(409, "CONFLICT", "Unique constraint violated.", prismaLikeError.meta);
    }

    if (prismaLikeError.code === "P2003") {
      return new HttpError(
        409,
        "CONFLICT",
        "Operation violates a related data constraint.",
        prismaLikeError.meta
      );
    }

    if (prismaLikeError.code === "P2025") {
      return new HttpError(404, "NOT_FOUND", "Record not found.");
    }

    if (prismaLikeError.code === "P2034") {
      logServerError(error, requestId);
      return new HttpError(
        503,
        "SERVICE_UNAVAILABLE",
        "The operation could not be completed due to concurrent database activity. Please retry.",
        prismaLikeError.meta
      );
    }
  }

  if (isRetryableDatabaseFailure(error)) {
    logServerError(error, requestId);
    return new HttpError(
      503,
      "SERVICE_UNAVAILABLE",
      "The database operation could not be completed right now. Please retry."
    );
  }

  if (isConnectivityFailure(error)) {
    logServerError(error, requestId);
    return new HttpError(
      503,
      "SERVICE_UNAVAILABLE",
      "The database is temporarily unavailable. Please retry the operation."
    );
  }

  logServerError(error, requestId);

  return new HttpError(500, "INTERNAL_ERROR", "Unexpected server error.");
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} is required.`);
  }

  return value.trim();
}

export function parseOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid string value.");
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parsePositiveInt(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a positive integer.`);
  }

  return value;
}

export function parseQueryInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid numeric query parameter.");
  }

  return parsed;
}
