"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { THEME_STORAGE_KEY } from "@/components/theme/config";

/* ============================================================
   ThemeProvider — the production theme system (the (site) group).

   The CSS theme machinery already exists in tokens.css: :root is light,
   html[data-theme="dark"] is the dark override, and
   @media (prefers-color-scheme: dark) html[data-theme="auto"] follows the OS.
   This is the thin JS shim over it (hand-rolled, no next-themes): it tracks the
   stored manual override, the live system preference, and exposes a toggle.

   Detection model:
   - override (a persisted "light" | "dark") wins.
   - with no override, the default is the ROOT LAYOUT'S <html data-theme> dial:
     the provider captures it at first client render and re-asserts it, so a
     fork pins its theme in ONE place (the html attribute) and hard loads, soft
     navigation, and the toggle all agree with zero per-fork provider code
     (owner, 9 Jul). "auto" lets the CSS media query resolve the OS theme; a
     pinned "light"/"dark" renders that theme for everyone until they toggle.
   - an explicit defaultTheme prop still wins over the captured dial, for a
     surface that pins differently from its layout (the mother's (site) demo
     passes "auto" so a docs->site soft nav cannot leak the docs-forced dark
     into the capture; forks have no docs group, so they never need the prop).

   The mount effect re-asserts data-theme so client-side navigation INTO the
   (site) group (where the pre-paint flash-guard script does not re-run) lands on
   the right theme. On a fresh load this is idempotent: the flash guard (override)
   or the SSR dial (no override) already set the attribute, so there is no mount
   re-flip and no flash.

   Docs note: this provider is mounted only in the (site) layout. The docs routes
   keep the MasterControls dials as an ephemeral playground; they never read the
   override, so theme does not persist there while the other four dials reset.
   ============================================================ */

type ThemeChoice = "light" | "dark";

export interface ThemeContextValue {
  // The currently applied theme (override ?? system). Drives the toggle's flip
  // target. The toggle's icon is CSS-driven, so it does not depend on this.
  resolvedTheme: ThemeChoice;
  setTheme: (theme: ThemeChoice) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readSystem(): ThemeChoice {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredOverride(): ThemeChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    /* storage unavailable */
  }
  return null;
}

function readDial(): "auto" | ThemeChoice | null {
  if (typeof window === "undefined") return null;
  const a = document.documentElement.getAttribute("data-theme");
  return a === "light" || a === "dark" || a === "auto" ? a : null;
}

export function ThemeProvider({
  children,
  defaultTheme,
}: {
  children: ReactNode;
  /** Optional override of the inherited <html data-theme> dial. Leave unset in
   *  forks: the root layout's dial is the single source and the provider
   *  inherits it. Pass a value only when the surface must pin differently from
   *  its layout (the mother's (site) demo passes "auto"). */
  defaultTheme?: "auto" | ThemeChoice;
}) {
  // Lazy initialisers read the client-only sources once, with no synchronous
  // setState inside an effect. They return SSR-safe defaults (null / "light") on
  // the server; nothing this provider renders depends on them (the toggle's icon
  // is CSS-driven), so the differing client-first-render values cause no
  // hydration mismatch. The dial capture happens at FIRST client render, when
  // the attribute is still the SSR value (or the flash-guard override, which
  // readStoredOverride wins over anyway), so later attribute writes never feed
  // back into the default.
  const [override, setOverride] = useState<ThemeChoice | null>(readStoredOverride);
  const [system, setSystem] = useState<ThemeChoice>(readSystem);
  const [inheritedDial] = useState(readDial);
  const effectiveDefault = defaultTheme ?? inheritedDial ?? "auto";

  useEffect(() => {
    // Re-assert data-theme so client-side navigation INTO (site) lands correctly
    // (the pre-paint flash guard does not re-run on client nav); idempotent on a
    // fresh load. Then subscribe to live OS changes, calling setState in the
    // change callback rather than synchronously in the effect body.
    document.documentElement.setAttribute("data-theme", readStoredOverride() ?? effectiveDefault);
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = () => setSystem(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [effectiveDefault]);

  const setTheme = useCallback((theme: ThemeChoice) => {
    setOverride(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* storage unavailable: the attribute still applies for this session */
    }
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  // With a pinned default, the un-overridden resolved theme IS the pin (that is
  // what the visitor sees), so the toggle flips away from it correctly.
  const resolvedTheme: ThemeChoice =
    override ?? (effectiveDefault === "auto" ? system : effectiveDefault);

  const toggle = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ resolvedTheme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

/** The NON-throwing read, for shared chrome that must survive outside a provider:
 *  the docs showroom island (which deliberately mounts none, so a demo click can
 *  never write the production override that (site) reads back), or a fork that has
 *  not wired one yet. Returns null instead of throwing, so the consumer degrades
 *  rather than white-screens.
 *
 *  Product code inside (site) should keep using useTheme: a missing provider there
 *  is a bug, and the throw is how you find out. */
export function useOptionalTheme(): ThemeContextValue | null {
  return useContext(ThemeContext);
}
