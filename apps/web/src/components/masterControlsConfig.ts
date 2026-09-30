/* ============================================================
   MasterControls config: a plain module (no "use client") shared by the client
   MasterControls panel and any server layout that inlines the pre-paint guard,
   the same split theme/config.ts makes for the theme. One source of truth keeps
   the dial list, the storage key and the guard from drifting apart.
   ============================================================ */

export type DialId = "spacing" | "type" | "motion" | "radius" | "neutral";

export interface DialSpec {
  id: DialId;
  attr: string;
  label: string;
  options: readonly string[];
  fallback: string;
  /** How the dial is presented. A "slider" is for an ordered AXIS whose stops
   *  have a direction; the default segmented pill is for unordered choices. */
  control?: "segmented" | "slider";
}

// The design dials. Options + fallbacks mirror tokens.css and the root layout
// <html> defaults; each maps to exactly one data-* attribute. Theme is not a
// dial here (v4.5.0): light/dark lives on the app shell's NavRail themeToggle.
export const DIALS: readonly DialSpec[] = [
  { id: "spacing", attr: "data-spacing", label: "Spacing", options: ["compact", "normal", "dramatic"], fallback: "normal" },
  { id: "type", attr: "data-type", label: "Type", options: ["composed", "stately", "dramatic"], fallback: "composed" },
  { id: "motion", attr: "data-motion", label: "Motion", options: ["still", "gentle", "sharp"], fallback: "gentle" },
  { id: "radius", attr: "data-radius", label: "Radius", options: ["sharp", "soft", "pronounced"], fallback: "sharp" },
  // The neutral temperature dial (v6.2.0). "kit" is deliberately NOT a selector
  // in tokens.css: nothing matches it, so :root's ramp applies and the kit
  // default is the unset state rather than a seventh authored ramp. Order runs
  // warm to cold so the control reads as the axis it is.
  {
    id: "neutral", attr: "data-neutral", label: "Neutral",
    options: ["forge", "ember", "warm", "kit", "cool", "arctic", "glacier"],
    fallback: "kit",
    control: "slider",
  },
];

/** localStorage key for the persisted dials (v6.37.0): a JSON object keyed by the
 *  data-* attribute, holding one of that dial's options. Written only by a
 *  MasterControls mounted with `persist`; read by the guard below and by the
 *  panel's mount effect. */
export const DIALS_STORAGE_KEY = "mw-dials";

/** Pre-paint guard for a layout whose MasterControls persists: applies the stored
 *  dials to <html> before first paint, so a reload does not flash the defaults
 *  (the theme's THEME_FLASH_GUARD, for the other five attributes). Only a known
 *  attribute with a known option is applied; anything else in storage is ignored.
 *  Inline it with dangerouslySetInnerHTML in the layout that mounts the panel. */
export const DIALS_FLASH_GUARD = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  DIALS_STORAGE_KEY,
)});if(!s)return;var v=JSON.parse(s);var d=${JSON.stringify(
  DIALS.map((d) => [d.attr, d.options]),
)};for(var i=0;i<d.length;i++){var a=d[i][0],o=d[i][1],x=v[a];if(typeof x==="string"&&o.indexOf(x)>-1){document.documentElement.setAttribute(a,x);}}}catch(e){}})();`;
