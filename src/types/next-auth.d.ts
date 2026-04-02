import type { DefaultSession } from "next-auth";

import type { UserRole } from "@/src/lib/user-role";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      displayName: string;
      role: UserRole;
    };
  }

  interface User {
    displayName: string;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    displayName?: string;
    role?: UserRole;
    userId?: string;
  }
}