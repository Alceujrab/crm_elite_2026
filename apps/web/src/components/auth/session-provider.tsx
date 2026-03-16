"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { fetchSessionRequest, logoutRequest } from "@/lib/api";
import type { SessionUser } from "@/components/auth/mock-session";

interface SessionContextValue {
  session: SessionUser | null;
  isLoading: boolean;
  refreshSession: () => Promise<SessionUser | null>;
  clearSession: () => Promise<void>;
  setSessionUser: (user: SessionUser | null) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetchSessionRequest();
      const nextSession = response.user ?? null;
      setSession(nextSession);
      return nextSession;
    } catch {
      setSession(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSession = useCallback(async () => {
    await logoutRequest();
    setSession(null);
  }, []);

  useEffect(() => {
    void refreshSession();
  }, []);

  const value = useMemo(
    () => ({
      session,
      isLoading,
      refreshSession,
      clearSession,
      setSessionUser: setSession
    }),
    [clearSession, isLoading, refreshSession, session]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession deve ser usado dentro de SessionProvider");
  }

  return context;
}