/* ============================================================
   PageLoader config — a plain module (no "use client") so it is shared by
   both the server (site) layout, which inlines the pre-paint guard script,
   and the client PageLoader, which reads the same storage key. One source
   of truth keeps the script and the component from drifting apart
   (the same idiom as src/components/theme/config.ts).
   ============================================================ */

// sessionStorage key marking that this browser session has already seen the
// intro. Session-scoped on purpose: reloads and re-entries within the tab
// session skip; a fresh session gets the moment again.
export const PAGE_LOADER_SEEN_KEY = "mw-loader-seen";

// Pre-paint guard, inlined at the top of the (site) layout so it runs before
// first paint. It sets data-mw-loader="active" ONLY when this load should run
// the intro. The attribute is ABSENT by default and the loader CSS is hidden
// without it, so every skip path degrades to the normal page with the normal
// Nav mount stagger: return visit (storage hit), reduced motion (matchMedia),
// no JS (script never runs), and the docs routes (script never inlined).
// The guard carries its OWN failsafe, and GUARD_CEILING_MS is the whole point of it.
//
// The attribute this script sets HIDES THE PAGE: the loader CSS holds every
// [data-mw-reveal] at opacity 0 while it is present. Until 25 Aug 2026 the only
// code that ever removed it was a React effect inside PageLoader. PageLoader does
// have its own 3250ms ceiling, but that ceiling lives INSIDE the same effect, so
// it protects against a slow load and not against the effect never running at all.
//
// An inline script always executes. A JS bundle can fail to download, fail to
// parse, or throw during hydration. In that window the visitor got a permanently
// blank page, on fourteen client sites, with no recovery but a reload.
//
// So the timeout below sits in the INLINE script, where nothing else has to work
// for it to fire. It is deliberately far above PageLoader's own ceiling: on the
// normal path the component has already removed the attribute and this finds
// nothing to do, so it never competes with the lift animation.
export const GUARD_CEILING_MS = 8000;

// Single-quote-free; double quotes inside the backtick template.
export const PAGE_LOADER_GUARD = `(function(){try{if(sessionStorage.getItem(${JSON.stringify(
  PAGE_LOADER_SEEN_KEY,
)}))return;if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;var d=document.documentElement;d.setAttribute("data-mw-loader","active");setTimeout(function(){d.removeAttribute("data-mw-loader");},${GUARD_CEILING_MS});}catch(e){}})();`;
