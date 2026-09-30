import { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { DataLabel } from "@/components/DataLabel";
import { srOnly, tokenNumber } from "@/components/internal/styles";

/* ============================================================
   AssetCard — the image-led inventory card (v3.10.0, from the ArtistHQ
   handoff: PieceCard generalized. A work, a product, a listing: image on
   top, corner-anchored overlays, title and meta below).

   The image frame carries the card: `aspectRatio` is per-instance
   ("4/3" default, "1/1", "3/4"...) because MIXED ratios side by side are
   the point (real panel sizes vary intentionally); the grid row aligns on
   the cards' top edges and each frame keeps its own height. The `image`
   slot is any ReactNode stretched to fill the frame (an Image, a plain
   img, a gradient div); with no image the frame renders the quiet
   accent-soft placeholder gradient.

   Overlays COMPOSE, never rebuild: topLeft / topRight / bottomRight are
   slots whose expected occupants are Badge (status) and IdChip
   (identifier, already the inverse-scrim voice built for imagery), plus
   PriceLabel in the bottom-right price corner (give it the inverse ink,
   see the docs example). Anchoring is the card's; the occupants stay
   themselves.

   `href` makes the whole card a link via the Card covered-link pattern
   (cover anchor, z-index-lifted nothing needed here: overlays are
   non-interactive). Hover on a LINK card pulls the frame border to
   --accent-base (the reference's border-darkens-to-magenta); a static
   card never glows. `muted` is the sold / archived state: the whole card
   drops to 0.65 opacity (a literal, the Button disabled-0.5 precedent:
   state opacity is not on the token scale).

   Server component.
   ============================================================ */

export interface AssetCardProps {
  /** Fills the frame (an Image, an img, a gradient div). Omit for the placeholder gradient. */
  image?: ReactNode;
  /** CSS aspect-ratio for the image frame. Mixed ratios in one grid are expected. */
  aspectRatio?: string;
  /** Corner overlay slots. Expected occupants: Badge, IdChip, PriceLabel. */
  topLeft?: ReactNode;
  topRight?: ReactNode;
  bottomRight?: ReactNode;
  title: ReactNode;
  /** The mono metadata line under the title (series, size, buyer). */
  meta?: ReactNode;
  /** Whole-card link (cover anchor). Hover pulls the frame border to the accent. */
  href?: string;
  /** Accessible name for the cover link; pass the title when href is set. Without it
   *  a string `title` names the cover (pass 3, 27 Aug 2026); a ReactNode title with no
   *  ariaLabel falls back to visually hidden "View" text, which names the link but not
   *  its destination. */
  ariaLabel?: string;
  /** The sold / archived state: the card drops to 0.65 opacity. */
  muted?: boolean;
}

const assetCardCss = `
/* The image slot stretches whatever it is given to fill the frame; any img
   inside covers it (the frame's aspect-ratio owns the geometry). */
[data-mw-asset-card-image] > * {
  width: 100%;
  height: 100%;
}
[data-mw-asset-card-image] img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
/* Link-card hover: the frame border pulls to the accent (the reference's
   border-darkens-to-magenta). Scoped to href cards; a static card never glows. */
[data-mw-asset-card][data-link="true"]:hover [data-mw-asset-card-frame] {
  border-color: var(--accent-base);
}
/* Focus ring on the root via :has (the Card precedent): the frame's
   overflow never clips the root's own outline. House --focus-outline, one
   keyboard vocabulary product-wide (A-053). */
[data-mw-asset-card]:has([data-mw-asset-card-cover]:focus-visible) {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
`;

export function AssetCard({
  image,
  aspectRatio = "4/3",
  topLeft,
  topRight,
  bottomRight,
  title,
  meta,
  href,
  ariaLabel,
  muted = false,
}: AssetCardProps) {
  // The cover anchor's name: ariaLabel, else the title when it is a string. The
  // cover renders on href ALONE (no variant gate, unlike Card), so every href
  // card is exposed; a nameless cover was the pre-pass-3 default whenever a
  // consumer forgot ariaLabel.
  const coverName = ariaLabel || (typeof title === "string" ? title : undefined);
  return (
    <div
      data-mw-asset-card=""
      data-link={href ? "true" : "false"}
      style={{
        ...rootStyle,
        // Sold / archived: the literal 0.65 (Button's disabled-0.5 precedent;
        // state opacity is not on the token scale).
        opacity: muted ? 0.65 : undefined,
      }}
    >
      <style href="magentaweb-asset-card" precedence="default">{assetCardCss}</style>
      {href ? (
        <Link href={href} data-mw-asset-card-cover="" aria-label={coverName} style={coverStyle}>
          {coverName ? null : <span style={srOnly}>View</span>}
        </Link>
      ) : null}

      <div data-mw-asset-card-frame="" style={{ ...frameStyle, aspectRatio }}>
        {image ? (
          <div data-mw-asset-card-image="" style={imageSlotStyle}>{image}</div>
        ) : (
          // The quiet placeholder: an accent-soft drift, never a hex.
          <div aria-hidden="true" style={placeholderStyle} />
        )}
        {topLeft ? <span style={{ ...cornerStyle, top: "var(--space-xs)", left: "var(--space-xs)" }}>{topLeft}</span> : null}
        {topRight ? <span style={{ ...cornerStyle, top: "var(--space-xs)", right: "var(--space-xs)" }}>{topRight}</span> : null}
        {bottomRight ? <span style={{ ...cornerStyle, bottom: "var(--space-xs)", right: "var(--space-xs)" }}>{bottomRight}</span> : null}
      </div>

      <div style={titleStyle}>{title}</div>
      {meta ? <DataLabel as="div" style={metaStyle}>{meta}</DataLabel> : null}
    </div>
  );
}

/* ---------- inline styles ---------- */

const rootStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  transition: "opacity var(--motion-transition)",
};

// The cover anchor (the Card covered-link pattern). Overlays are
// non-interactive occupants, so nothing needs a z-index lift above it.
const coverStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 1,
  borderRadius: "var(--component-radius)",
};

const frameStyle: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  border: "1px solid var(--border-positive-primary)",
  borderRadius: "var(--component-radius)",
  background: "var(--background-positive-secondary)",
  transition: "border-color var(--motion-transition)",
};

const imageSlotStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
};

const placeholderStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(155deg, var(--accent-soft) 0%, var(--background-positive-secondary) 100%)",
};

// gap + flexWrap (v4.10.2) so a corner can hold TWO occupants cleanly — a status
// pair like "Insured" + "Quote requested". Without them the chips touched flush
// at 0px (reading as one bar with a colour seam at the sharp radius dial) and,
// past the maxWidth cap, could not wrap: both shrank instead, while Badge's own
// white-space: nowrap pushed each label out of its background. Purely additive:
// with a single occupant both properties are no-ops, so no existing card moves a
// pixel. Copied from HeroBanner's already-shipped badge row rather than invented.
const cornerStyle: CSSProperties = {
  position: "absolute",
  display: "inline-flex",
  flexWrap: "wrap",
  gap: "var(--space-2xs)",
  maxWidth: "calc(100% - var(--space-md))",
};

// The display-face title at the reference's card size, bound to its frame at
// the within-item rung; meta hugs the title one rung tighter.
const titleStyle: CSSProperties = {
  marginTop: "var(--space-xs)",
  fontFamily: "var(--font-display)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-snug)",
  color: "var(--text-positive-primary)",
};

const metaStyle: CSSProperties = {
  marginTop: "var(--space-3xs)",
};
