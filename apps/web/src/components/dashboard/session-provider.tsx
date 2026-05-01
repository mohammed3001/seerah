"use client";

import * as React from "react";

import type { DashboardSession } from "@/lib/dashboard/get-session";

const SessionContext = React.createContext<DashboardSession | null>(null);

export function DashboardSessionProvider({
  session,
  children,
}: {
  session: DashboardSession;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useDashboardSession(): DashboardSession {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error("useDashboardSession must be used within DashboardSessionProvider");
  return ctx;
}
