import { ComponentProps, CSSProperties, ReactNode } from "react";
import { Heading } from "@/components/Heading";
import { Icon } from "@/components/Icon";

/* ============================================================
   EmptyState — the canonical empty state (v4.3.0, promoted from the
   readilyhome fork's shipped original per its own header note: "If a
   second fork wants it, promote it to the mother", and Artist HQ is
   the second fork). The state a region shows when it legitimately
   holds nothing: an unfilled list, a void filter result, a cleared
   queue, a section that couldn't load. An invitation, not an apology.

   COMPOSES Heading (as="p" for the title), Icon (the glyph, sized by
   register), the Card.Icon tile idiom (the page register's tinted
   ground, re-inked per tone), and the CalloutCard tone-ink mechanic
   (one hoisted record of text-grade inks — minus danger, excluded by
   design: a region-level load failure is an interruption, not a
   destructive event, and a red centered column reads as shouting at
   nobody).

   NO SURFACE OF ITS OWN. It draws no border, no card, no fill: it is
   the CONTENTS of a caller's Card, Panel, or page main, never a
   competing box. An empty region already sits inside something; a
   second outline around an absence reads as a broken component.

   Quiet by construction: the title takes Heading's dress a tier down
   in secondary ink, and the description rides secondary too — NOT the
   readilyhome original's tertiary, deliberately resolving the queued
   REFACTOR_QUEUE concern (full guidance sentences at ~2.5:1) at
   birth. Tone ink touches only the glyph; the words stay calm.

   The title renders as a <p> (Heading `as`), NOT a heading. It keeps
   the size-6/5 visual treatment but stays out of the document
   outline: the caller's region already owns the real heading, and a
   transient "No contacts yet" at an ambiguous level would pollute
   heading navigation with a state that vanishes the moment one row
   exists.

   No built-in live region: server-rendered first paint can't announce
   anyway, and a blanket role="status" would over-announce static
   first-runs. A caller that swaps content ↔ EmptyState at runtime
   owns aria-live on the region itself.

   Server component; zero client state. Every value is a semantic
   token, so a fork's brand layer re-skins it with no component work.
   ============================================================ */

export type EmptyStateTone = "neutral" | "success" | "warning";
export type EmptyStateSize = "panel" | "page";
export type EmptyStateAlign = "center" | "start";

type IconElement = ComponentProps<typeof Icon>["children"];

export interface EmptyStateProps {
  /** The headline. Sentence case, concrete, a statement: "No contacts yet". */
  title: string;
  /** The guiding line. One sentence; say what fills the region or what the
   *  absence means — never what went wrong in system terms. */
  description?: string;
  /** A Carbon glyph element, e.g. <Folders />. The component sizes it through
   *  Icon (lg/24 at panel, xl/32 at page) and inks it per tone — with two size
   *  registers the geometry is the component's opinion, not the call sites'.
   *  Always decorative: the title carries the meaning. */
  icon?: IconElement;
  /** Fork-owned brand art; replaces `icon` when present. Capped at 16rem,
   *  corners follow --component-radius. Prefer the icon at panel size — art
   *  overwhelms a small region. The mother never ships one: art is brand,
   *  and brand lives fork-side. */
  illustration?: ReactNode;
  /** neutral (default) = the quiet fact · success = the earned quiet ("all
   *  caught up") · warning = the region couldn't load. No danger tone by
   *  design — anything that genuinely warrants red is not an empty state. */
  tone?: EmptyStateTone;
  /** panel (default) = inside a Card/Panel/tab · page = the region IS the
   *  page (first-run). */
  size?: EmptyStateSize;
  /** Centered by default. "start" for narrow asides and table interiors,
   *  where centering orphans. */
  align?: EmptyStateAlign;
  /** Button row. First button is the fill action; two buttons maximum, the
   *  second always one variant quieter than the first. */
  actions?: ReactNode;
}

// The glyph inks, panel register: text-grade tones (AA beside body copy), the
// CalloutCard ACCENT_INK mechanic. Neutral sits at the faintest tier — a bare
// grey glyph over a quiet fact.
const PANEL_INK: Record<EmptyStateTone, string> = {
  neutral: "var(--text-positive-tertiary)",
  success: "var(--status-success-text)",
  warning: "var(--status-warning-text)",
};

// Page register: the glyph rides a tinted tile (the Card.Icon idiom, re-inked
// per tone). Neutral escalates grey → accent between the registers on purpose:
// the panel register is a fact among other content; the page register is the
// product inviting the first action. The escalation is the invitation.
const PAGE_INK: Record<EmptyStateTone, string> = {
  neutral: "var(--accent-emphasis)",
  success: "var(--status-success-text)",
  warning: "var(--status-warning-text)",
};

const PAGE_TILE_GROUND: Record<EmptyStateTone, string> = {
  neutral: "var(--accent-soft)",
  success: "var(--status-success-bg)",
  warning: "var(--status-warning-bg)",
};

export function EmptyState({
  title,
  description,
  icon,
  illustration,
  tone = "neutral",
  size = "panel",
  align = "center",
  actions,
}: EmptyStateProps) {
  const page = size === "page";

  const rootStyle: CSSProperties = {
    ...rootBaseStyle,
    ...(page ? pageRootStyle : panelRootStyle),
    alignItems: ALIGN_ITEMS[align],
    textAlign: TEXT_ALIGN[align],
  };

  const stackStyle: CSSProperties = {
    ...textBaseStyle,
    gap: page ? "var(--space-xs)" : "var(--space-2xs)",
    alignItems: ALIGN_ITEMS[align],
  };

  return (
    <div style={rootStyle}>
      {illustration != null ? (
        <div style={illustrationStyle} aria-hidden="true">
          {illustration}
        </div>
      ) : icon ? (
        page ? (
          <span style={{ ...tileStyle, background: PAGE_TILE_GROUND[tone], color: PAGE_INK[tone] }}>
            <Icon size="xl">{icon}</Icon>
          </span>
        ) : (
          <span style={{ ...glyphStyle, color: PANEL_INK[tone] }}>
            <Icon size="lg">{icon}</Icon>
          </span>
        )
      ) : null}
      <div style={stackStyle}>
        <Heading as="p" size={page ? 5 : 6} style={titleInkStyle}>
          {title}
        </Heading>
        {description ? <p style={descriptionStyle}>{description}</p> : null}
      </div>
      {actions != null ? (
        <div style={{ ...actionsStyle, justifyContent: ALIGN_ITEMS[align] }}>{actions}</div>
      ) : null}
    </div>
  );
}

/* ---------- inline styles ---------- */

const ALIGN_ITEMS: Record<EmptyStateAlign, CSSProperties["alignItems"]> = {
  center: "center",
  start: "flex-start",
};

const TEXT_ALIGN: Record<EmptyStateAlign, CSSProperties["textAlign"]> = {
  center: "center",
  start: "left",
};

/* The spacing ladder: deeper is tighter. The root gap separates the BLOCKS
   (glyph, text, actions); the text stack's own gap binds title to description
   so they read as one thought. Generous block padding buys the vertical
   comfort an empty region needs (page takes the TabStub register's air,
   because there the void IS the content); the inline padding only keeps text
   off a narrow region's edge. The column's gaps own all rhythm. */
const rootBaseStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  minWidth: 0,
};

const panelRootStyle: CSSProperties = {
  gap: "var(--space-md)",
  padding: "var(--space-xl) var(--space-md)",
};

const pageRootStyle: CSSProperties = {
  gap: "var(--space-lg)",
  padding: "var(--space-4xl) var(--space-md)",
};

// Carbon icons fill with currentColor, so colouring the wrapper inks the
// glyph; Icon owns the geometry (and renders it aria-hidden — decorative).
const glyphStyle: CSSProperties = {
  display: "inline-flex",
};

// The Card.Icon tile, verbatim geometry: the ground and ink swap per tone at
// render. Rides the radius dial — a sharp fork gets a sharp tile, a soft fork
// a soft one. No hard circle.
const tileStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-sm)",
  borderRadius: "var(--component-radius)",
  width: "fit-content",
};

// The illustration cap: brand art never outgrows the figure it decorates
// (CalloutCard's thumb cap precedent — deliberate fixed geometry).
const illustrationStyle: CSSProperties = {
  maxWidth: "16rem",
  overflow: "hidden",
  borderRadius: "var(--component-radius)",
};

const textBaseStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

// Heading defaults to primary ink; an empty state is quiet, so it drops a
// tier. Face, size, and weight stay Heading's.
// AUD-5 (4 Sep 2026): with no cap the title ran a measured 693px on one
// uncapped line. --measure-narrow (48ch) is the same token the description
// below already reads, so the two lines of the stack share one measure;
// text-wrap: balance (the studio page's own hero-heading idiom) keeps a
// two-word overflow from dropping alone onto its own line.
const titleInkStyle: CSSProperties = {
  color: "var(--text-positive-secondary)",
  maxWidth: "var(--measure-narrow)",
  ...({ textWrap: "balance" } as CSSProperties),
};

// The measure cap is a `ch` text-measure, not a layout literal: font-relative, and the
// system's established idiom for capping a quiet line. It reads --measure-narrow (48ch),
// the narrowest of the family D12 minted in v5.9.0; Panel takes --measure-prose and
// FormGroup --measure-form. Narrower than either because this line is usually CENTRED,
// and centred text past about fifty characters loses the return sweep.
//
// Corrected 27 Aug 2026 (pass 4): this comment still said "no --measure-* token to reach
// for yet (REFACTOR_QUEUE, 15 Jul); this literal joins that queue item's inventory when
// the family lands", two releases after the family landed and this very line started
// reading it. It also said the cap "rides the type dial", which was never true of any of
// them: these are ch units, so they ride the FACE and the fluid root, and the type-ratio
// dial leaves a --type-sm line where it found it.
const descriptionStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
  maxWidth: "var(--measure-narrow)",
};

const actionsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--space-sm)",
};
