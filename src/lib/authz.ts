import { HttpError } from "@/src/lib/api-response";
import { getToken } from "next-auth/jwt";
import { MUTATION_ROLES, READ_ACCESS_ROLES, parseUserRole } from "@/src/lib/user-role";
import type { AuthContext, UserRole } from "@/src/lib/user-role";

export { parseUserRole } from "@/src/lib/user-role";
export type { AuthContext, UserRole } from "@/src/lib/user-role";

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

function parseRequestCookies(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const cookies: Record<string, string> = {};

  if (!cookieHeader) {
    return cookies;
  }

  for (const pair of cookieHeader.split(/;\s*/)) {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const name = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();

    if (name.length > 0) {
      cookies[name] = value;
    }
  }

  return cookies;
}

function getRequestCookies(request: Request) {
  const runtimeCookies = (request as Request & { cookies?: unknown }).cookies;

  if (runtimeCookies && typeof runtimeCookies === "object") {
    if (typeof (runtimeCookies as { getAll?: () => Array<{ name: string; value: string }> }).getAll === "function") {
      const allCookies = (runtimeCookies as { getAll: () => Array<{ name: string; value: string }> }).getAll();
      if (allCookies.length > 0) {
        return runtimeCookies;
      }
    } else if (runtimeCookies instanceof Map) {
      if (runtimeCookies.size > 0) {
        return runtimeCookies;
      }
    } else if (Object.keys(runtimeCookies as Record<string, string>).length > 0) {
      return runtimeCookies;
    }
  }

  return parseRequestCookies(request);
}

export async function getAuthContext(request: Request): Promise<AuthContext> {
  const token = await getToken({
    secret: authSecret,
    req: {
      headers: request.headers,
      cookies: getRequestCookies(request),
    } as never,
  });
  const userId = typeof token?.userId === "string" ? token.userId.trim() : typeof token?.sub === "string" ? token.sub.trim() : "";
  const roleValue = typeof token?.role === "string" ? token.role : null;

  if (!userId || !roleValue) {
    throw new HttpError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const role = parseUserRole(roleValue);
  if (!role) {
    throw new HttpError(401, "UNAUTHORIZED", "Authentication is invalid.");
  }

  return { userId, role };
}

export async function requireRole(request: Request, allowedRoles: UserRole[]): Promise<AuthContext> {
  const auth = await getAuthContext(request);

  if (!allowedRoles.includes(auth.role)) {
    throw new HttpError(403, "FORBIDDEN", "You do not have permission to perform this action.");
  }

  return auth;
}

export function requireReadRole(request: Request): Promise<AuthContext> {
  return requireRole(request, READ_ACCESS_ROLES);
}

export function requireMutationRole(request: Request): Promise<AuthContext> {
  return requireRole(request, MUTATION_ROLES);
}
