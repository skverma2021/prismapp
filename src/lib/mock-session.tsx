"use client";

import { createContext, useContext, useMemo, useState } from "react";

import type { UserRole } from "@/src/lib/authz";

type MockSession = {
  displayName: string;
  role: UserRole;
  userId: string;
};

type MockSessionContextValue = {
  session: MockSession;
  setRole: (role: UserRole) => void;
};

const STORAGE_KEY = "prismapp.mock-role";

const ROLE_PRESETS: Record<UserRole, Omit<MockSession, "role">> = {
  SOCIETY_ADMIN: {
    displayName: "Society Admin",
    userId: "demo-admin-1",
  },
  MANAGER: {
    displayName: "Operations Manager",
    userId: "demo-manager-1",
  },
  READ_ONLY: {
    displayName: "Read-Only Auditor",
    userId: "demo-readonly-1",
  },
};

const MockSessionContext = createContext<MockSessionContextValue | null>(null);

function isUserRole(value: string): value is UserRole {
  return value === "SOCIETY_ADMIN" || value === "MANAGER" || value === "READ_ONLY";
}

export function MockSessionProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(() => {
    if (typeof window === "undefined") {
      return "MANAGER";
    }

    const storedRole = window.localStorage.getItem(STORAGE_KEY);
    return storedRole && isUserRole(storedRole) ? storedRole : "MANAGER";
  });

  const value = useMemo<MockSessionContextValue>(() => {
    return {
      session: {
        role,
        ...ROLE_PRESETS[role],
      },
      setRole: (nextRole) => {
        setRoleState(nextRole);
        window.localStorage.setItem(STORAGE_KEY, nextRole);
      },
    };
  }, [role]);

  return <MockSessionContext.Provider value={value}>{children}</MockSessionContext.Provider>;
}

export function useMockSession() {
  const context = useContext(MockSessionContext);

  if (!context) {
    throw new Error("useMockSession must be used within MockSessionProvider.");
  }

  return context;
}