export type UserRole = "SOCIETY_ADMIN" | "MANAGER" | "READ_ONLY";

export type AuthContext = {
  userId: string;
  role: UserRole;
};

export const READ_ACCESS_ROLES: UserRole[] = ["SOCIETY_ADMIN", "MANAGER", "READ_ONLY"];
export const MUTATION_ROLES: UserRole[] = ["SOCIETY_ADMIN", "MANAGER"];

export function parseUserRole(value: string): UserRole | null {
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