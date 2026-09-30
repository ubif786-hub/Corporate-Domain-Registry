import { CSSProperties, ReactNode } from "react";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { DataLabel } from "@/components/DataLabel";
import { Divider } from "@/components/Divider";
import { Heading } from "@/components/Heading";

/* ============================================================
   Panel — the dashboard content block: a Card whose HEADER (title,
   optional subheading, optional meta badges, optional interactive
   controls like a SegmentedControl) is separated from the BODY by a
   full-width hairline.

   Graduated from the HQ scaffold (v3.5.0) after proving out across
   the HQ dashboards: this is the shape for dashboard/admin content
   blocks ONLY. List cards, task cards, and asset tiles are Cards,
   not panels, and stay chrome-free.

   Anatomy: header row (title stack left, meta + controls right,
   wrapping) > hairline (regular weight, stretched: Card.Body aligns
   items flex-start, so the rule must opt into full width or it
   renders zero-width) > body.

   The subheading speaks two voices (the ArtistHQ reference canvas,
   owner, 9 Jul): "quiet", the sentence line (what the panel measures,
   where data comes from), and "mono", the metadata scope line in the
   DataLabel voice (mono, uppercase, tracked) for a compact enumeration
   of what the panel holds. One slot, two treatments; never a fork.

   TWO VARIANTS (v6.30.0, HQ v7 system pass, theme 5). "bordered" is
   the original: the hairline card with the header rule, which holds
   against a busy ground and is what the sites use. "surface" is the
   data-surface panel: no border, no shadow, no header rule; the panel
   is separated from the page by its ground alone (the Card's surface
   logic decides which ground: secondary on the page ground, primary
   inside an AppShell secondary canvas), padding at the lg rung, and
   the head binds to the body at --flow-heading (md), which clears the
   largest gap inside any body the HQ puts in a panel (rows at sm,
   KeyValue at xs), so the second spacing law holds without a rule.
   The two looks exclude each other, so they are one `variant` prop.
   Use surface for a page region on a data surface where a border
   would be a rule the page did not earn; keep bordered for the sites.

   The head also gains `count` and `sum` (theme 1's group-head
   fragment): the count as a solid neutral Badge on the title's
   baseline, the sum as a mono figure beside it ("$1,500 outstanding"),
   so a group head over rows or cards on the page ground and a panel
   head read as the same fragment.
   ============================================================ */

export type PanelVariant = "bordered" | "surface";

export interface PanelProps {
  title: ReactNode;
  /** A quiet line under the title (what the panel measures / where data comes from). */
  subheading?: ReactNode;
  /** Subheading voice: "quiet" (default) is the sentence line; "mono" renders the
      DataLabel metadata voice, the reference's header-with-subtext treatment; "inline"
      (v6.32.0, the HQ v7 boards) sets the subheading on the TITLE'S LINE after the count and
      the sum, in the mono face at the 2xs rung, tertiary, as written (no uppercase): the data
      surface's scope line, which reads as a caption to the title rather than a second title. */
  subheadingVariant?: "quiet" | "mono" | "inline";
  /** Badges, chips, or counts shown at the header's end. */
  meta?: ReactNode;
  /** Interactive header widgets (SegmentedControl, actions), after the meta. */
  controls?: ReactNode;
  headingLevel?: 2 | 3;
  /** Anchor id on the title heading (a PageNav section target). Adds a scroll
      margin that clears the fixed chrome bar, the kit pages' anchor treatment. */
  id?: string;
  /** The full-width hairline between header and body (v4.8.0: now an opt-out).
      Default true on the bordered variant — the panel's defining rule — and false
      on the surface variant, where the head binds to the body at --flow-heading. */
  divider?: boolean;
  /** The look (v6.30.0). "bordered" (default): the hairline card with the header
      rule. "surface": no border, no shadow, no rule; the ground separates. */
  variant?: PanelVariant;
  /** The count of what the panel holds, as a solid neutral Badge beside the title
      (v6.30.0): "Needs attention  4". A number or a preformatted node. */
  count?: ReactNode;
  /** A sum beside the count as a mono figure (v6.30.0): "$1,500 outstanding". */
  sum?: ReactNode;
  children: ReactNode;
}

// Anchored panels scroll their title in under the fixed chrome bar with air,
// the same token-derived clearance the kit pages' bare section heads used.
const anchorScrollMargin = "calc(var(--chrome-bar-height) + var(--space-fixed-lg))";

export function Panel({
  title,
  subheading,
  subheadingVariant = "quiet",
  meta,
  controls,
  headingLevel = 2,
  id,
  divider,
  variant = "bordered",
  count,
  sum,
  children,
}: PanelProps) {
  const surface = variant === "surface";
  const showDivider = divider ?? !surface;
  return (
    <div data-mw-panel="" data-variant={variant} style={rootStyle}>
      <Card elevation={surface ? "none" : "subtle"} border={surface ? "none" : undefined} padding={surface ? "relaxed" : "normal"}>
        <Card.Body>
          <div style={panelHeadStyle}>
            <div style={panelHeadTextStyle}>
              <div style={titleRowStyle}>
                <Heading
                  level={headingLevel}
                  size={6}
                  id={id}
                  style={id ? { scrollMarginTop: anchorScrollMargin } : undefined}
                >
                  {title}
                </Heading>
                {count != null ? <Badge tone="neutral" emphasis="solid">{count}</Badge> : null}
                {sum != null ? <span style={sumStyle}>{sum}</span> : null}
                {subheading && subheadingVariant === "inline" ? <span style={inlineSubStyle}>{subheading}</span> : null}
              </div>
              {subheading && subheadingVariant !== "inline" ? (
                subheadingVariant === "mono" ? (
                  <DataLabel as="p" style={panelSubheadMonoStyle}>{subheading}</DataLabel>
                ) : (
                  <p style={panelSubheadStyle}>{subheading}</p>
                )
              ) : null}
            </div>
            {meta || controls ? (
              <div style={panelHeadEndStyle}>
                {meta}
                {controls}
              </div>
            ) : null}
          </div>
          {/* spacing none: Card.Body's own sm gap owns both sides of the rule;
              alignSelf stretch because Card.Body aligns flex-start (a plain hr
              shrinks to zero width there and never paints). divider={false}
              skips it (v4.8.0); the surface variant skips it by default and
              binds the body at the heading rung instead. */}
          {showDivider ? (
            <Divider spacing="none" weight="regular" style={{ alignSelf: "stretch" }} />
          ) : null}
          <div style={surface && !showDivider ? panelBodySurfaceStyle : panelBodyStyle}>{children}</div>
        </Card.Body>
      </Card>
    </div>
  );
}

// The wrapper carries the variant hook for descendants (a ghost's hover wash reads it) and
// no box of its own.
const rootStyle: CSSProperties = {
  display: "contents",
};
// The head row aligns on the BASELINE (v6.35.0): the title's first line, a control's label and a
// stamp read as one line of type (the HQ boards; the owner: "title, info and filters all
// horizontally aligned"). Top-aligned, a 32 px control hung below a 20 px title's cap.
const panelHeadStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "var(--space-sm)",
  alignSelf: "stretch",
};
const panelHeadTextStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2xs)",
  minWidth: 0,
};
// The title, the count chip and the sum on one baseline, the chip at xs from the title.
const titleRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  flexWrap: "wrap",
  gap: "var(--space-xs)",
  minWidth: 0,
};
// The sum is an inline figure (theme 7): mono at the sm rung, tabular, secondary ink.
const sumStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-sm)",
  fontVariantNumeric: "tabular-nums",
  color: "var(--text-positive-secondary)",
};
// The inline scope line: mono 2xs, tertiary, as written, on the title's baseline.
const inlineSubStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  color: "var(--text-positive-tertiary)",
  minWidth: 0,
};
const panelSubheadStyle: CSSProperties = {
  margin: 0,
  fontSize: "var(--type-xs)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-tertiary)",
  maxWidth: "var(--measure-prose)",
};
// The mono voice keeps the quiet line's measure; DataLabel owns face, size,
// case, tracking, and the tertiary tier.
const panelSubheadMonoStyle: CSSProperties = {
  maxWidth: "var(--measure-prose)",
};
const panelHeadEndStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--space-sm)",
};
const panelBodyStyle: CSSProperties = {
  minWidth: 0,
  alignSelf: "stretch",
};
// The surface body binds to the head at the heading rung. Card.Body's own sm gap already
// separates them, so the body adds the difference between md and sm.
const panelBodySurfaceStyle: CSSProperties = {
  ...panelBodyStyle,
  marginTop: "calc(var(--flow-heading) - var(--space-sm))",
};
