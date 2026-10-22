"use client";

import { useTideCloak } from "@tidecloak/nextjs";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { SIMULATED } from "@/lib/simPersonas";

/** The part of useTideCloak() the pages use, so the Plan C simulation can stand in for it. */
export interface Auth {
  authenticated: boolean;
  isInitializing: boolean;
  login: () => void;
  logout: () => void;
  getValueFromIdToken: (claim: string) => unknown;
}
interface SimAuth extends Auth {
  refresh: () => Promise<void>;
}

const SimContext = createContext<SimAuth | null>(null);

/** Plan C sign-in: the server signs a persona session; roles and groups come back from the server. */
export function SimAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/sim/me");
      setUser(r.ok ? ((await r.json()) as { user: string }).user : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const value: SimAuth = {
    authenticated: !!user,
    isInitializing: loading,
    login: () => router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`),
    logout: () => {
      fetch("/api/sim/login", { method: "DELETE" }).finally(() => {
        setUser(null);
        router.push("/");
      });
    },
    getValueFromIdToken: (claim) => (claim === "preferred_username" ? user ?? undefined : undefined),
    refresh,
  };
  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}

export function useSimAuth(): SimAuth {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error("SimAuthProvider is missing");
  return ctx;
}

// The mode is fixed at build time, so each build always calls the same hook.
export const useAuth: () => Auth = SIMULATED ? useSimAuth : (useTideCloak as unknown as () => Auth);
