"use client";

import { CSSProperties } from "react";
import { Light, Asleep } from "@carbon/icons-react";
import { useTheme } from "@/components/theme/ThemeProvider";

/* ============================================================
   ThemeToggle — a two-state light/dark switch for the production chrome.

   The two glyphs are both rendered and shown/hidden by CSS keyed on the applied
   theme (the SAME resolution the tokens use: data-theme plus the
   prefers-color-scheme media query). So the correct glyph paints with no JS and
   no hydration flicker, and it tracks live OS changes for an auto visitor with no
   React involved. JS only handles the click.

   Two-state by design: clicking always writes an explicit override (the
   no-return-to-auto-after-click tradeoff is accepted). Room is left for a future
   `mode` prop (e.g. a three-state light/dark/system cycle) if a client needs it;
   not built speculatively.

   Reduced motion: the glyph swap is a CSS display change (instant, no animation);
   only the hover colour transitions, via --motion-transition, which the global
   reduced-motion reset collapses.
   ============================================================ */

const toggleCss = `
[data-mw-theme-toggle] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--control-size-md);
  height: var(--control-size-md);
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: var(--component-radius);
  color: var(--text-positive-tertiary);
  cursor: pointer;
  transition:
    color var(--motion-transition),
    background var(--motion-transition);
}
[data-mw-theme-toggle]:hover {
  color: var(--text-positive-primary);
  background: var(--background-hover-wash);
}
[data-mw-theme-toggle]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
/* Show the glyph for the APPLIED theme. Default (light / auto-light) shows the
   sun; explicit dark and auto-under-OS-dark show the moon. Mirrors the token
   theme resolution exactly, so the icon is correct with no JS. */
[data-mw-theme-toggle] [data-mw-theme-icon] { display: none; }
[data-mw-theme-toggle] [data-mw-theme-icon="sun"] { display: inline-flex; }
html[data-theme="dark"] [data-mw-theme-toggle] [data-mw-theme-icon="sun"] { display: none; }
html[data-theme="dark"] [data-mw-theme-toggle] [data-mw-theme-icon="moon"] { display: inline-flex; }
@media (prefers-color-scheme: dark) {
  html[data-theme="auto"] [data-mw-theme-toggle] [data-mw-theme-icon="sun"] { display: none; }
  html[data-theme="auto"] [data-mw-theme-toggle] [data-mw-theme-icon="moon"] { display: inline-flex; }
}
`;

export interface ThemeToggleProps {
  className?: string;
  style?: CSSProperties;
}

export function ThemeToggle({ className, style }: ThemeToggleProps) {
  const { resolvedTheme, toggle } = useTheme();
  // The glyph is CSS-driven off the html attribute, but AT needs the state in
  // words: the label names the DESTINATION theme. suppressHydrationWarning
  // because the server cannot know the resolved theme; the attribute settles
  // on the client's first render (audit: the old static label told a screen
  // reader user nothing about which theme is active).
  return (
    <>
      <style href="magentaweb-theme-toggle" precedence="default">{toggleCss}</style>
      <button
        type="button"
        data-mw-theme-toggle=""
        onClick={toggle}
        aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
        suppressHydrationWarning
        className={className}
        style={style}
      >
        <span data-mw-theme-icon="sun" aria-hidden="true">
          <Light size={18} />
        </span>
        <span data-mw-theme-icon="moon" aria-hidden="true">
          <Asleep size={18} />
        </span>
      </button>
    </>
  );
}
