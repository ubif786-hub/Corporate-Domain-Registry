"use client";

// Who is signed in. The panel's layout asks /api/admin/me once; until it answers the shell shows
// its frame with placeholders, and a 401 goes to the sign-in page (api.ts).

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError } from "./api";

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: "owner" | "staff";
  status: "active" | "invited" | "disabled";
  created_at: string;
  last_sign_in_at: string | null;
  setup_expires_at: string | null;
  weak_password: boolean;
}

export interface Modes { tucows: "test" | "live"; stripe: "test" | "live"; mail: "resend" | "file" | "log" }

export interface Me { user: AdminUser; modes: Modes; attention: number }

interface SessionValue {
  me: Me | null;
  error: ApiError | null;
  refresh: () => void;
  setUser: (u: AdminUser) => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const refresh = useCallback(() => {
    api<Me>("/me").then((m) => { setMe(m); setError(null); }).catch((e: ApiError) => {
      if (e.status !== 401) setError(e);
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const setUser = useCallback((u: AdminUser) => setMe((m) => (m ? { ...m, user: u } : m)), []);

  const signOut = useCallback(async () => {
    await api("/session", { method: "DELETE", redirectOn401: false }).catch(() => {});
    window.location.replace("/admin/sign-in/?signed_out=1");
  }, []);

  const value = useMemo(() => ({ me, error, refresh, setUser, signOut }), [me, error, refresh, setUser, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession outside SessionProvider");
  return v;
}
