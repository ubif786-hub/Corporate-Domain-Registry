"use client";

import { CSSProperties } from "react";
import NextImage from "next/image";
import { Add } from "@carbon/icons-react";

/* ============================================================
   PhotoStrip — the thumb grid with the dashed add slot (v3.10.0, from
   the ArtistHQ handoff: the piece detail's photo record. Six square
   slots by default: the photos so far, then one dashed "add" slot
   inviting the next).

   Selection is the strip's job (the detail view renders whichever
   thumb is selected): thumbs are real buttons, `selectedIndex` +
   `onSelect` wire the controlled selection, and the selected thumb
   wears the 2px accent ring (an inset shadow, so the geometry never
   shifts). `onAdd` renders the dashed slot with the Carbon Add glyph
   in the tertiary ink, washing to --accent-wash on hover; it only
   appears while there is room (photos < maxSlots).

   Slot geometry rides the grid: maxSlots equal columns, every cell a
   square (aspect-ratio 1). `date` labels the thumb for tooltips and
   assistive tech alongside its alt.

   Client component (the selection gesture).
   ============================================================ */

export interface PhotoStripPhoto {
  src: string;
  alt: string;
  /** Optional date caption folded into the tooltip and accessible name. */
  date?: string;
}

export interface PhotoStripProps {
  photos: PhotoStripPhoto[];
  /** The controlled selection; the selected thumb wears the 2px accent ring. */
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  /** Renders the dashed add slot (Carbon Add) while there is room. */
  onAdd?: () => void;
  /** Grid width in slots. Default 6. */
  maxSlots?: number;
  /** Accessible name for the strip. Default "Photos". */
  ariaLabel?: string;
}

const photoStripCss = `
[data-mw-photo-strip-thumb] {
  border: 1px solid var(--border-positive-primary);
  transition: box-shadow var(--motion-transition), border-color var(--motion-transition);
}
[data-mw-photo-strip-thumb]:hover {
  border-color: var(--border-positive-secondary);
}
/* Selection wins over hover: same specificity, so it is placed last deliberately. */
[data-mw-photo-strip-thumb][aria-pressed="true"] {
  border-color: var(--accent-base);
}
[data-mw-photo-strip-thumb]:focus-visible,
[data-mw-photo-strip-add]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
[data-mw-photo-strip-add] {
  transition: background var(--motion-transition), color var(--motion-transition), border-color var(--motion-transition);
}
[data-mw-photo-strip-add]:hover {
  background: var(--accent-wash);
  color: var(--accent-ink);
  border-color: var(--accent-base);
}
`;

export function PhotoStrip({
  photos,
  selectedIndex,
  onSelect,
  onAdd,
  maxSlots = 6,
  ariaLabel = "Photos",
}: PhotoStripProps) {
  const shown = photos.slice(0, maxSlots);
  const hasAdd = Boolean(onAdd) && shown.length < maxSlots;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{ ...gridStyle, gridTemplateColumns: `repeat(${maxSlots}, 1fr)` }}
    >
      <style href="magentaweb-photo-strip" precedence="default">{photoStripCss}</style>
      {shown.map((photo, i) => {
        const selected = i === selectedIndex;
        const name = photo.date ? `${photo.alt}, ${photo.date}` : photo.alt;
        return (
          <button
            key={i}
            type="button"
            data-mw-photo-strip-thumb=""
            aria-pressed={selected}
            aria-label={name}
            title={name}
            onClick={() => onSelect?.(i)}
            style={thumbStyle}
          >
            <NextImage src={photo.src} alt="" fill sizes="10rem" style={imgStyle} />
            {/* The ring overlay sits above the covering image (an inset shadow on
                the button itself would paint below it). */}
            {selected ? <span aria-hidden="true" style={ringStyle} /> : null}
          </button>
        );
      })}
      {hasAdd ? (
        <button
          type="button"
          data-mw-photo-strip-add=""
          aria-label="Add photo"
          onClick={onAdd}
          style={addStyle}
        >
          <Add size={20} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

/* ---------- inline styles ---------- */

const gridStyle: CSSProperties = {
  display: "grid",
  gap: "var(--space-xs)",
  width: "100%",
};

// The border lives in the hoisted sheet, not here: an inline shorthand always beats
// a sheet rule, so both the :hover lift and the selected accent were unreachable and
// the thumb's border never changed. The sheet now owns colour across all three states.
const thumbStyle: CSSProperties = {
  position: "relative",
  aspectRatio: "1",
  padding: 0,
  borderRadius: "var(--component-radius)",
  overflow: "hidden",
  background: "var(--background-positive-secondary)",
  cursor: "pointer",
};

const imgStyle: CSSProperties = {
  objectFit: "cover",
};

// The 2px accent selection ring: an overlay above the image (never a size
// change), inset so it reads inside the frame.
const ringStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  boxShadow: "inset 0 0 0 2px var(--accent-base)",
  borderRadius: "inherit",
  pointerEvents: "none",
};

const addStyle: CSSProperties = {
  aspectRatio: "1",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  background: "transparent",
  border: "1px dashed var(--border-positive-secondary)",
  borderRadius: "var(--component-radius)",
  color: "var(--text-positive-tertiary)",
  cursor: "pointer",
};
