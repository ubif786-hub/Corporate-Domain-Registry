"use client";

// Talking to /api/admin/*. Every request carries X-CDR-Admin (the API refuses writes without it,
// which is the CSRF guard) and the session cookie, which the browser adds by itself: page scripts
// never see it. A 401 anywhere sends the person back to the sign-in page.

import { useCallback, useEffect, useRef, useState } from "react";

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly field?: string) {
    super(message);
  }
}

const SIGN_IN = "/admin/sign-in/";

export function signInUrl(): string {
  if (typeof window === "undefined") return SIGN_IN;
  const here = window.location.pathname + window.location.search;
  return here.startsWith("/admin/") && !here.startsWith(SIGN_IN) && !here.startsWith("/admin/setup")
    ? `${SIGN_IN}?next=${encodeURIComponent(here)}`
    : SIGN_IN;
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; redirectOn401?: boolean } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/admin${path}`, {
      method: init.method ?? "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        "X-CDR-Admin": "1",
        Accept: "application/json",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "offline", "Could not reach the server. Check your connection and try again.");
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string; message?: string; field?: string }) | null;
  if (!res.ok) {
    if (res.status === 401 && init.redirectOn401 !== false && typeof window !== "undefined") {
      window.location.replace(signInUrl());
    }
    throw new ApiError(res.status, data?.error ?? "error", data?.message ?? `The server answered ${res.status}.`, data?.field);
  }
  return data as T;
}

/** GET a path; reloads when the path changes. A null path waits. */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<{ data: T | null; error: ApiError | null; loading: boolean }>({ data: null, error: null, loading: path !== null });
  const seq = useRef(0);

  const load = useCallback(async (p: string) => {
    const mine = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api<T>(p);
      if (mine === seq.current) setState({ data, error: null, loading: false });
    } catch (e) {
      if (mine === seq.current) setState((s) => ({ ...s, error: e instanceof ApiError ? e : new ApiError(0, "error", String(e)), loading: false }));
    }
  }, []);

  useEffect(() => {
    // Fetching on mount and on path change is the job of this effect.
    if (path !== null) void load(path);
  }, [path, load]);

  const reload = useCallback(() => { if (path !== null) void load(path); }, [path, load]);
  const replace = useCallback((data: T) => setState({ data, error: null, loading: false }), []);
  return { ...state, reload, replace };
}
