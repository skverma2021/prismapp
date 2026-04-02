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
    const nextPath = options?.redirectTo ? `?next=${encodeURIComponent(options.redirectTo)}` : "";
    redirect(`/${nextPath}`);
  }

  if (options?.allowedRoles && !options.allowedRoles.includes(session.role)) {
    redirect("/home?denied=1");
  }

  return session;
}