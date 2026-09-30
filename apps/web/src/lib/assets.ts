// The project asset manifest: the single source of truth for every image slot on the site.
// The pages render FROM this module (look a slot up with `assetBySlot`), the
// /assets-manifest.json route publishes it, and the HQ assets tab reads that route from
// production and staging.
//
// TWO HALVES, AND THE SPLIT IS THE RULE (owner, 5 Sep 2026): JUDGEMENT IS TYPED HERE, DERIVED
// FACTS ARE GENERATED. A slot below carries what a person decides: what the image is for, where it
// renders, what shape it needs, whether it is a placeholder, a licensed stand-in or the client's
// final, and where it came from. Everything the file itself can answer (the Blob URL, the
// pathname, width, height, bytes, format) lives in `assets.files.json` beside this module and is
// written by the mother's `scripts/assets.mjs` when a file is uploaded. Never type those by hand.
//
//   node scripts/assets.mjs put ../<fork> <slot-id> <file>   # optimise, upload to the fork's store, record
//   node scripts/assets.mjs sync ../<fork>                    # reconcile the store with the slots
//
// Statuses: "placeholder" (the slot renders an empty frame), "standin" (a licensed image holds the
// slot until the client's own asset arrives), "final".
//
// ALT TEXT DOES NOT LIVE HERE. It is content, so it sits with the copy the image runs beside.
import files from "./assets.files.json";

export type AssetStatus = "placeholder" | "standin" | "final";
export type AssetAspect = "wide" | "tall" | "square" | "landscape" | "standard";

export interface AssetSlot {
  /** Stable id; the key the pages and the HQ use. Never renamed once a file is recorded. */
  id: string;
  /** The route the slot renders on. */
  page: string;
  /** What the image is for (art direction note). */
  purpose: string;
  /** Aspect the slot renders at. */
  aspect: AssetAspect;
  /** Aspect below the tablet breakpoint, when the crop changes. */
  mobileAspect?: AssetAspect;
  /** The width the slot displays at on desktop (px), for oversize checks. */
  targetWidth: number;
  status: AssetStatus;
  /** "generated" art is drawn at render time by a component and has no file. Default "image". */
  kind?: "image" | "generated";
  /** For generated art: the component that draws it. */
  component?: string;
  /** Photographer and source, for provenance. */
  credit?: string;
  license?: string;
  /** Free note shown in the HQ (e.g. why a stand-in is acceptable). */
  note?: string;
  // Derived, from assets.files.json. Present on a slot only once a file has been recorded.
  src?: string;
  file?: string;
  blobName?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

/** The recorded file for a slot, as `scripts/assets.mjs` writes it. */
export interface AssetFile {
  src: string;
  file?: string;
  blobName?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

const FILES = files as Record<string, AssetFile>;

/** Judgement: one entry per image slot on the site. Keep the order the pages read in. */
const SLOTS: AssetSlot[] = [
  {
    id: "home-hero",
    page: "/",
    purpose:
      "The plate behind the home hero's headline and search field. Held well back under the accent glow: the words are the subject and the picture is the ground, so anything with a busy centre fails here whatever it looks like on its own.",
    aspect: "wide",
    targetWidth: 2400,
    status: "standin",
    credit: "Milad Fakurian, Unsplash",
    license: "Unsplash License (free, commercial use, no attribution required)",
    note:
      "Added 18 Sep 2026 on the client's feedback ('no slider image, its showing gradient as of now'). CHOSEN FOR WHAT IT DOES NOT DO: it carries no hue at all, charcoal on near-black, so the accent glow stays the only colour on the band and nothing competes with the red mark. The shortlist's fibre-optic and gradient candidates were both strong blues and would have. A stand-in until the client has a view: a studio pick, not their art direction. Cropped to a 2400x1000 banner from a 7:6 original.",
  },
  {
    id: "search-backdrop",
    page: "/search",
    purpose:
      "The ground behind the search panel's head. The client's reference shows 'a nice picture at the back' on this page; same rule as the hero, the field and the extension lists sit on top of it.",
    aspect: "wide",
    targetWidth: 2400,
    status: "standin",
    credit: "Rafael Garcin, Unsplash",
    license: "Unsplash License (free, commercial use, no attribution required)",
    note:
      "Added 18 Sep 2026 with the home hero, same feedback sheet. A glass tower shot straight up, the two facades converging on a clear apex of sky: geometric and corporate rather than touristy, and the apex gives the panel head something quiet to sit over. A Vancouver skyline was the other finalist and was passed over as too warm and too busy behind a white card. A stand-in until the client has a view. Vetted at full resolution for legible signage, which is the check that matters: both Toronto candidates failed it (ROGERS CENTRE, BMO, TD and Sun Life all readable when zoomed) and neither showed it at thumbnail size.",
  },
];

/** The published shape: every slot with its recorded file merged in. */
export const ASSET_SLOTS: AssetSlot[] = SLOTS.map((s) => (FILES[s.id] ? { ...s, ...FILES[s.id] } : s));

export const assetBySlot = (id: string): AssetSlot | undefined => ASSET_SLOTS.find((s) => s.id === id);
export const pendingAssets = (): AssetSlot[] => ASSET_SLOTS.filter((s) => s.status !== "final");

// THE BRAND, DECLARED (v6.10.0). The Nav and Footer render `<BrandWordmark {...BRAND} />`, the
// manifest route publishes it, and the HQ Assets tab reads the status, so "which forks have the
// client's real logo" is a fact on a screen rather than a memory. Three statuses:
//   "placeholder": no official assets. The wordmark is the NAME in the brand face, the fleet's one
//                  placeholder treatment, identical on every fork that has nothing yet.
//   "standin":     the fork drew something deliberate to hold the slot (pass it as children).
//   "final":       the client's real wordmark, as an image slot ("brand-wordmark") or a typographic
//                  wordmark that IS the brand.
export type BrandStatus = "placeholder" | "standin" | "final";
export interface BrandAssets {
  /** The name as the wordmark reads it, case included. */
  name: string;
  status: BrandStatus;
  /** Slot ids in SLOTS above, once the client's files are recorded. */
  wordmarkSlot?: string;
  markSlot?: string;
  /** Why a stand-in is acceptable, or what is awaited. Shown in the HQ. */
  note?: string;
}
export const BRAND: BrandAssets = { name: "Corporate Domain Registry", status: "standin", note: "19 Sep 2026: the client sent two new lockups as opaque 6250px PNGs (a flag for everyone, a maple leaf for Canada) and an animated GIF globe for the favicon, no vector. The suite in public/logo-*.svg is a studio RECONSTRUCTION, generated by scripts/brand/domain-services.mjs in the mother: the flag drawn by construction from measured boxes, the leaf traced, the name re-set in DM Sans 600 with its tracking solved from the source. The US set is the declared brand; logo-*-ca.svg is its Canadian variant, and the header picks by the visitor's region (SiteHeader -> CdrLogo). standin, not final: a studio reconstruction cannot ratify itself." };
