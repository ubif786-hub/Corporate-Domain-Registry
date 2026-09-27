"use client";

import { useState } from "react";
import { Light, Asleep } from "@carbon/icons-react";
import { useOptionalTheme } from "@/components/theme/ThemeProvider";

/* ============================================================
   NavRailThemeLink — the rail's light/dark control, worn as a REAL rail item.

   Not an icon dropped into the rail's footer slot: it is a <button> wearing the
   shared [data-mw-navrail-link] dress, so it renders identically to the Links
   above it (same height, same icon column, same hover, same dual-stack glyph
   choreography, same label fade on collapse). The rail's own collapse control is
   the precedent for that pattern; this is its twin, and the two sit together at
   the foot: theme on top, collapse below. Both change how the UI PRESENTS itself
   rather than anything about the account, which is why they pair, and why neither
   belongs three clicks deep in a settings page (owner, 15 Jul 2026).

   The glyph swap is CSS keyed on the applied theme (data-theme plus the
   prefers-color-scheme query), the same resolution the tokens use and the same
   trick ThemeToggle uses. So the correct glyph paints with no JS and no hydration
   flicker, and it tracks live OS changes for an auto visitor with no React
   involved. JS only handles the click.

   Provider-optional by design. WITH a ThemeProvider above it (the (site) group)
   it uses the real thing: the choice persists to localStorage and the flash guard
   honours it on the next load. WITHOUT one it degrades instead of throwing, and
   flips html[data-theme] directly (the MasterControls behaviour) with NO
   persistence. That fallback is what lets the docs showroom demo it live: the docs
   routes deliberately mount no provider, and a non-persisting flip means a demo
   click can never write the production override that (site) would read back.
   ============================================================ */

type ThemeChoice = "light" | "dark";

// The theme as APPLIED, resolved exactly the way the tokens resolve it: an
// explicit dial wins, otherwise the OS preference under "auto".
function readApplied(): ThemeChoice {
  if (typeof document === "undefined") return "light";
  const dial = document.documentElement.getAttribute("data-theme");
  if (dial === "light" || dial === "dark") return dial;
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

const themeLinkCss = `
[data-mw-navrail-theme-ico] { display: none; }
[data-mw-navrail-theme-ico="sun"] { display: inline-flex; }
html[data-theme="dark"] [data-mw-navrail-theme-ico="sun"] { display: none; }
html[data-theme="dark"] [data-mw-navrail-theme-ico="moon"] { display: inline-flex; }
@media (prefers-color-scheme: dark) {
  html[data-theme="auto"] [data-mw-navrail-theme-ico="sun"] { display: none; }
  html[data-theme="auto"] [data-mw-navrail-theme-ico="moon"] { display: inline-flex; }
}
`;

// Both glyphs always render; CSS shows the one matching the applied theme. Used
// twice (the primary and the hover clone), which is what the rail's dual-stack
// hover motion expects.
const glyphs = (
  <>
    <span data-mw-navrail-theme-ico="sun">
      <Light size={20} />
    </span>
    <span data-mw-navrail-theme-ico="moon">
      <Asleep size={20} />
    </span>
  </>
);

export interface NavRailThemeLinkProps {
  /** Mirrors the rail's state: drives the collapsed-only tooltip. The label fade
   *  and icon column are handled by the shared rail sheet. */
  collapsed?: boolean;
  /** The visible label. A single noun, like every other rail item. */
  label?: string;
}

export function NavRailThemeLink({ collapsed = false, label = "Theme" }: NavRailThemeLinkProps) {
  const theme = useOptionalTheme();

  // Provider-less fallback state. A LAZY INITIALISER, not an effect: it reads the
  // client-only source once, with no synchronous setState inside an effect (which
  // cascades renders, and which ThemeProvider avoids for the same reason). On the
  // server readApplied returns "light"; on the client's first render it reads the
  // real dial. Nothing rendered here depends on the difference, because the glyph
  // is CSS-driven and the accessible name carries suppressHydrationWarning, so the
  // differing first-render value causes no mismatch. Unused when a provider exists.
  const [applied, setApplied] = useState<ThemeChoice>(readApplied);

  const resolvedTheme = theme ? theme.resolvedTheme : applied;

  const onClick = () => {
    if (theme) {
      theme.toggle();
      return;
    }
    // No provider: flip the dial itself and remember it only in memory. Read the
    // applied theme fresh so an OS change between renders cannot flip us the wrong way.
    const next: ThemeChoice = readApplied() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    setApplied(next);
  };

  // The glyph is CSS-driven off the html attribute, but AT needs the state in
  // words, and the visible label is a static noun, so the accessible name is what
  // carries the action: it names the DESTINATION theme. suppressHydrationWarning
  // because the server cannot know the resolved theme; it settles on the client's
  // first render.
  const destination = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <>
      <style href="magentaweb-navrail-theme" precedence="default">{themeLinkCss}</style>
      <button
        type="button"
        data-mw-navrail-link=""
        data-mw-navrail-action=""
        data-active="false"
        title={collapsed ? label : undefined}
        aria-label={`Switch to ${destination} theme`}
        suppressHydrationWarning
        onClick={onClick}
      >
        <span data-mw-navrail-ico="">
          <span data-mw-navrail-ico-primary="">{glyphs}</span>
          <span data-mw-navrail-ico-clone="" aria-hidden="true">
            {glyphs}
          </span>
        </span>
        <span data-mw-navrail-label="">{label}</span>
      </button>
    </>
  );
}
