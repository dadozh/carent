"use client";

import { createContext, useContext } from "react";
import type { UserRole } from "@/lib/auth-db";
import { can, type Action } from "@/lib/permissions";

const RoleContext = createContext<UserRole>("viewer");

export function RoleProvider({
  role,
  children,
}: {
  role: string;
  children: React.ReactNode;
}) {
  return (
    <RoleContext.Provider value={role as UserRole}>
      {children}
    </RoleContext.Provider>
  );
}

/** Returns the current user's role. */
export function useRole(): UserRole {
  return useContext(RoleContext);
}

/** Returns true if the current user can perform the given action. */
export function useCan(action: Action): boolean {
  return can(useContext(RoleContext), action);
}
