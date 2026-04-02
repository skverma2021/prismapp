import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import type { UserRole } from "@/src/lib/user-role";

export type ServerAppSession = {
  displayName: string;
  email: string;
  role: UserRole;
  userId: string;
};

function toServerAppSession(session: Awaited<ReturnType<typeof getServerAuthSession>>): ServerAppSession | null {
  const user = session?.user;

  if (!user?.id || !user?.email || !user?.displayName || !user.role) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}

export async function getServerAppSession() {
  return toServerAppSession(await getServerAuthSession());
}

export async function requireServerAppSession(options?: {
  allowedRoles?: UserRole[];
  redirectTo?: string;
}) {
  const session = await getServerAppSession();

  if (!session) {
    const params = new URLSearchParams();

    if (options?.redirectTo) {
      params.set("next", options.redirectTo);
    }

    params.set("auth", "required");
    redirect(`/${params.size > 0 ? `?${params.toString()}` : ""}`);
  }

  if (options?.allowedRoles && !options.allowedRoles.includes(session.role)) {
    const params = new URLSearchParams({ auth: "denied" });

    if (options.redirectTo) {
      params.set("from", options.redirectTo);
    }

    redirect(`/home?${params.toString()}`);
  }

  return session;
}