/* ============================================================
   categoryHue — the stable per-entity slot on the categorical palette
   (v4.8.0, promoted from readilyhome: Inventory room tiles, Projects card
   media, PhotoPlaceholder — 3 proven sites).

   An id hashes to one of the seven --category-N slots, so an entity's hue
   never reshuffles when items are added or removed, and every product
   shares ONE mechanism instead of hand-picking colours.

   Two steps, both mother tokens:
   - categoryHue(id)  → var(--category-N)        — the SOLID fill (charts,
     dots, saturated grounds).
   - categoryTint(id) → var(--category-N-tint)   — the soft GROUND (tiles,
     media placeholders) an INK glyph or an overlaid Badge reads on. Never
     put white ink on the tint; use the positive text tokens.

   Both token families are theme-mirrored; the tint ratio is canon in
   tokens.css (verified badge-over-tint contrast across all 7 hues).
   Plain string ops, no hashing library; server-safe.
   ============================================================ */

// Stable slot 1..7 from the id's char-code sum.
function slot(id: string): number {
  const n = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return (n % 7) + 1;
}

/** SOLID step — the full categorical fill for id. */
export function categoryHue(id: string): string {
  return `var(--category-${slot(id)})`;
}

/** TINT step — the soft categorical ground for id (ink glyphs on top, never white). */
export function categoryTint(id: string): string {
  return `var(--category-${slot(id)}-tint)`;
}
