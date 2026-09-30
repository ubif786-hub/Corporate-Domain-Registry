/* ============================================================
   Theme config — a plain module (no "use client") so it is shared by both the
   server (site) layout, which inlines the flash-guard script, and the client
   ThemeProvider, which reads the same storage key. One source of truth keeps the
   pre-paint script and the React provider from drifting apart.
   ============================================================ */

// localStorage key for an explicit manual override. Value is "light" or "dark";
// absence means "follow the system" (data-theme stays "auto", the CSS
// prefers-color-scheme block resolves it).
export const THEME_STORAGE_KEY = "mw-theme";

// Pre-paint flash guard, inlined at the top of the (site) layout so it runs
// before any themed (site) content paints. If a manual override is stored it sets
// data-theme before first paint, so a returning visitor whose OS preference
// differs from their choice sees no flash. With no override it does nothing:
// data-theme stays the SSR "auto" default and the CSS media query resolves the
// system theme (flash-free and JS-free). Scoped to (site): it never runs on the
// docs routes, so the production override cannot leak into the DocsBar dial
// playground. Single-quote-free; double quotes inside the backtick template.
export const THEME_FLASH_GUARD = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;
