"use client";

import { SessionProvider, useSession } from "next-auth/react";
import type { Session } from "next-auth";

import type { AuthContext } from "@/src/lib/user-role";

export type AppSession = AuthContext & {
  displayName: string;
  email: string;
};

function toAppSession(session: Session | null | undefined): AppSession | null {
  const user = session?.user;

  if (!user?.id || !user?.displayName || !user?.email || !user.role) {
    return null;
  }

  return {
    userId: user.id,
    role: user.role,
    displayName: user.displayName,
    email: user.email,
  };
}

export function AppSessionProvider({ children, session }: { children: React.ReactNode; session: Session | null }) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}

export function useAuthSession() {
  const { data, status } = useSession();
  const session = toAppSession(data);

  if (!session) {
    throw new Error(`useAuthSession requires an authenticated session. Current status: ${status}.`);
  }

  return {
    session,
    sessionMode: "auth" as const,
    status,
  };
}