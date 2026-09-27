/* ============================================================
   OverlayMotion — the shared overlay open/close choreography (owner-approved
   Option A: presentational preset). One vocabulary for every overlay surface:
   the Nav fullscreen menu, the docs drawer, and the app-shell mobile rail ran
   three divergent copies of the same idea; their choreography now reads from
   this one sheet, parameterized by CSS custom properties.

   PRESENTATIONAL only, by decision: this standardizes how an overlay and its
   items enter and leave. The true end-to-end "old page out, new page in"
   cross-page swap (View Transitions) is a deferred post-seal session; see
   REFACTOR_QUEUE "NavOverlay v2".

   Vocabulary (mark elements, set knobs, keep your own DOM):
   - Surface: data-mw-overlay="fade" (fullscreen rooms: opacity, with a
     close-delay knob so the backdrop leaves last) or "slide-left"/"slide-right"
     (off-canvas panels: transform). Open state: data-open="true" on the
     surface, or an open [popover] ancestor (zero-specificity :where, so a
     consumer's own overrides always win).
   - Backdrop: data-mw-overlay-backdrop with data-open="true" (scrim fade).
   - Items: data-mw-overlay-item with --mw-overlay-index (and
     --mw-overlay-count on the surface). Entrance: a lead beat then an index
     stagger; exit: last in, first out. The defaults are the Nav overlay's
     proven formulas (the richest copy, the reference choreography).

   The preset owns CHOREOGRAPHY ONLY: a closed surface here is off-screen or
   transparent, never gone, so every closed surface MUST carry `inert` (or
   `hidden`) from its consumer, or its controls stay in the tab order and the
   accessibility tree a viewport away from where the user is looking. Nav's
   overlay is the model (inert={!mobileOpen}); the app-shell rail shipped
   without it until 26 Aug 2026 and Tab walked into its closed links.

   Knobs (set on the surface or any ancestor):
   --mw-overlay-count        item count (LIFO math), default 6
   --mw-overlay-index        per item, default 0
   --mw-overlay-item-hidden  the hidden transform, default translateY(-8px)
                             (the Nav value, predating the preset)
   --mw-overlay-item-lead    entrance lead, default 0.5x --motion-duration
   --mw-overlay-close-lead   exit lead before the LIFO spread, default 1x
   --mw-overlay-close-delay  the fade surface's own close delay, default 0ms
                             (Nav sets its items+frame total here)

   Token-driven; the still dial and prefers-reduced-motion zero every
   duration, so state changes collapse to instant flips. Server component,
   emits the sheet once per surface (React dedupes by href).
   ============================================================ */

export function OverlayMotion() {
  return (
    <style href="magentaweb-overlay-motion" precedence="default">
      {overlayMotionCss}
    </style>
  );
}

const overlayMotionCss = `
/* ---------- surfaces ---------- */

/* The fullscreen room: opacity in, and on close it waits for its contents
   (items, flourishes) through the close-delay knob, leaving last. */
[data-mw-overlay="fade"] {
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--motion-duration) var(--motion-ease);
  transition-delay: var(--mw-overlay-close-delay, 0ms);
}
[data-mw-overlay="fade"][data-open="true"] {
  opacity: 1;
  pointer-events: auto;
  transition-delay: 0ms;
}

/* The off-canvas panel: transform in from its edge. Open state comes from
   data-open or an open popover ancestor. BOTH states are :where-wrapped
   (zero specificity): the open rule sits later in the sheet so source order
   opens the panel, and a consumer's own overrides (a desktop force-close, a
   sticky desktop rail) carry real specificity so they always win over both.
   The closed base MUST NOT out-specify the open state: an unwrapped base
   (0-1-0) beats a :where'd open rule (0-0-0) regardless of order, which is
   exactly the bug that kept the app-shell mobile rail shut. */
:where([data-mw-overlay="slide-left"]) {
  transform: translateX(-100%);
  transition: transform var(--motion-duration) var(--motion-ease);
}
:where([data-mw-overlay="slide-right"]) {
  transform: translateX(100%);
  transition: transform var(--motion-duration) var(--motion-ease);
}
:where([data-mw-overlay="slide-left"][data-open="true"]),
:where([popover]:popover-open [data-mw-overlay="slide-left"]) {
  transform: translateX(0);
}
:where([data-mw-overlay="slide-right"][data-open="true"]),
:where([popover]:popover-open [data-mw-overlay="slide-right"]) {
  transform: translateX(0);
}
/* Popover enter plays from the offscreen state (popovers display from
   nothing; without this the slide-in would start at its end frame). */
@starting-style {
  :where([popover]:popover-open [data-mw-overlay="slide-left"]) {
    transform: translateX(-100%);
  }
  :where([popover]:popover-open [data-mw-overlay="slide-right"]) {
    transform: translateX(100%);
  }
}

/* ---------- backdrop ---------- */

[data-mw-overlay-backdrop] {
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--motion-transition);
}
[data-mw-overlay-backdrop][data-open="true"] {
  opacity: 1;
  pointer-events: auto;
}

/* ---------- items: lead-in stagger, LIFO out ---------- */

/* The closed base is :where-wrapped for the same reason as the slide
   surfaces above: an unwrapped base (0-1-0) beats the :where'd open rule
   (0-0-0) regardless of order, so the items could never appear. Both states
   sit at zero specificity; source order opens, consumer overrides win. */
:where([data-mw-overlay-item]) {
  opacity: 0;
  transform: var(--mw-overlay-item-hidden, translateY(-8px));
  transition:
    opacity calc(var(--motion-duration) * 0.75) var(--motion-ease),
    transform calc(var(--motion-duration) * 0.75) var(--motion-ease);
  /* Closing: the lead beat, then last in, first out. max() clamps any item
     indexed at or past the count (a close control that leads at zero). */
  transition-delay: max(0ms, calc(
    var(--mw-overlay-close-lead, var(--motion-duration))
    + (var(--mw-overlay-count, 6) - 1 - var(--mw-overlay-index, 0)) * var(--motion-stagger) / 2
  ));
}
:where([data-open="true"] [data-mw-overlay-item]),
:where([popover]:popover-open [data-mw-overlay-item]) {
  opacity: 1;
  transform: none;
  transition-duration: var(--motion-reveal-duration), var(--motion-reveal-duration);
  transition-delay: calc(
    var(--mw-overlay-item-lead, calc(var(--motion-duration) * 0.5))
    + var(--mw-overlay-index, 0) * var(--motion-stagger)
  );
}
`;
