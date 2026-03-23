import { HttpError } from "@/src/lib/api-response";

export type UserRole = "SOCIETY_ADMIN" | "MANAGER" | "READ_ONLY";

export type AuthContext = {
  userId: string;
  role: UserRole;
};

function normalizeRole(value: string): UserRole | null {
  const normalized = value.trim().toUpperCase().replace(/[-\s]+/g, "_");

  if (normalized === "SOCIETY_ADMIN") {
    return "SOCIETY_ADMIN";
  }

  if (normalized === "MANAGER") {
    return "MANAGER";
  }

  if (normalized === "READ_ONLY") {
    return "READ_ONLY";
  }

  return null;
}

export function getAuthContext(request: Request): AuthContext {
  const userId = request.headers.get("x-user-id")?.trim();
  const roleHeader = request.headers.get("x-user-role")?.trim();

  if (!userId || !roleHeader) {
    throw new HttpError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const role = normalizeRole(roleHeader);
  if (!role) {
    throw new HttpError(401, "UNAUTHORIZED", "Authentication is invalid.");
  }

  return { userId, role };
}

export function requireRole(request: Request, allowedRoles: UserRole[]): AuthContext {
  const auth = getAuthContext(request);

  if (!allowedRoles.includes(auth.role)) {
    throw new HttpError(403, "FORBIDDEN", "You do not have permission to perform this action.");
  }

  return auth;
}

export function requireMutationRole(request: Request): AuthContext {
  return requireRole(request, ["SOCIETY_ADMIN", "MANAGER"]);
}
