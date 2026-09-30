import { CSSProperties, ReactNode } from "react";
import { Checkmark } from "@carbon/icons-react";

/* ============================================================
   Stepper — the horizontal numbered WIZARD HEADER: a row of numbered
   nodes (done = a check, current = a filled step-dot green node,
   upcoming = a quiet hairline node) joined by connectors, each under its step label
   (and optional description). It answers "where am I in this multi-step
   flow, and how far is left" at the top of a wizard — a checkout, an
   onboarding, a partner activation form split across screens.

   DISTINCT from its neighbours, on purpose:
   - Breadcrumbs is a NAV path trail (navigable hierarchy, chevrons, links).
     The Stepper is not navigable and holds no links: it REPORTS progress
     through a linear flow, it does not move you through a hierarchy.
   - TieredRung is a VERTICAL gated ladder of rows (locked/gated states,
     actions, gate progress). The Stepper is a horizontal, ungated header
     with three plain states and no per-step affordance.

   TWO LAYOUTS (v4.10.2). "labelled" is the original: a label under every node,
   right for the 3-to-5-step flows this was built for. "compact" drops the
   per-step labels and puts ONE caption under the track ("Step 4 of 7 · Roof
   material"), for longer flows and narrower containers where dividing the width
   by the step count leaves seven labels wrapping into a ragged row. Compact also
   fixes a composition problem the labelled variant pushed onto consumers: a
   wizard that wants a "step N of M" counter had to render one itself and place
   it near the nodes, which is how ReadilyHome's homeowner onboarding ended up
   with a counter and a separate dot row reading as two unrelated pieces. In
   compact the counter IS the component.

   The connectors read the progression: every segment up to and including
   the one entering the current node is drawn in the travelled green
   (--step-dot-active); segments beyond it rest in the quiet secondary border. The
   nodes are decorative (aria-hidden); the list carries the semantics — an
   ordered list, aria-current="step" on the current item, and a
   visually-hidden state word per step so a screen reader hears
   "Completed / Current step / Upcoming" alongside each label.

   Server component: presentational, no hooks, no directive.
   ============================================================ */

export interface StepperStep {
  /** The step's short label, e.g. "Details". */
  label: ReactNode;
  /** Optional one-line hint under the label, e.g. "Name and contact". */
  description?: ReactNode;
}

/** "labelled" (default): every step carries its own label under its node, the
 *  original wizard header. "compact": the nodes keep the progression but drop
 *  the per-step labels, and ONE caption under the track names where you are
 *  ("Step 4 of 7 · Roof material").
 *
 *  Why the variant exists: the labelled layout divides the width by the step
 *  count, which is right for the 3-to-5-step flows it was built for and cramped
 *  by 7 in a form panel — seven labels at type-sm wrap and the label row goes
 *  ragged. Compact spends the width on the progression and puts the naming in
 *  one line, which also keeps the counter and the indicator as a single block
 *  instead of two pieces the consumer has to place near each other and hope. */
export type StepperVariant = "labelled" | "compact" | "bar";

export interface StepperProps {
  /** The steps, in order, left to right. */
  steps: StepperStep[];
  /** Zero-based index of the active step. Earlier steps read as done,
   *  later ones as upcoming. Clamped to the valid range. */
  current: number;
  /** Layout. Default "labelled". */
  variant?: StepperVariant;
  /** Accessible name for the ordered list. Default "Progress". */
  ariaLabel?: string;
  /** BAR only (v6.30.0): the line under the bar. Left, the caption ("Build, 12 d"; defaults to
   *  the current step's label); right, the count ("3 of 5"). Pass `caption` to replace the
   *  left text. */
  caption?: ReactNode;
  /** BAR only: a paused flow. Every segment rests on the track, the count reads "0 of N" and
   *  the caption should say so ("Paused, 40 d"). `current` is ignored while paused. */
  paused?: boolean;
  /** BAR only (v6.32.0): each step's label under its own segment, in the mono 2xs tertiary
   *  voice with the current one in the primary ink. For a bar whose phases ARE the story (a
   *  lead's stages) rather than a phase the card's grid names elsewhere. An option: it composes
   *  with `paused`, `caption` and `count`. */
  stepLabels?: boolean;
  /** BAR only (v6.32.0): replaces the right side of the line ("3 of 5") with the count and its
   *  provenance ("5 of 6 · entered 15 Sep by Ali"). */
  count?: ReactNode;
}

type NodeStatus = "done" | "current" | "upcoming";

export function Stepper({ steps, current, variant = "labelled", ariaLabel = "Progress", caption, paused = false, stepLabels = false, count }: StepperProps) {
  if (steps.length === 0) return null;
  const active = Math.max(0, Math.min(current, steps.length - 1));
  const compact = variant === "compact";

  /* BAR (v6.30.0, HQ v7 system pass, theme 5): a phase progress inside a card where the phase
     names live elsewhere (the KeyValue grid under it). One segment per step, 2xs tall, 3xs
     apart: done in --step-dot-complete, the current in --step-dot-active, upcoming the track
     (--step-dot-upcoming). No dots, no numerals, no labels; under the bar one line, the
     caption left in body small and the count right as a mono figure. The <ol> keeps every
     semantic the other variants carry (aria-current, the sr-only state words), so a screen
     reader hears the same progression; the caption line is aria-hidden, the count is in it. */
  if (variant === "bar") {
    const done = paused ? 0 : active;
    return (
      <div data-mw-stepper-bar="" style={barWrapStyle}>
        <ol data-mw-stepper="" data-variant="bar" data-paused={paused ? "true" : undefined} aria-label={ariaLabel} style={barListStyle} role="list">
          {steps.map((step, i) => {
            const status: NodeStatus = paused ? "upcoming" : i < active ? "done" : i === active ? "current" : "upcoming";
            return (
              <li
                key={i}
                data-mw-stepper-item=""
                data-status={status}
                aria-current={status === "current" ? "step" : undefined}
                style={{ ...barSegmentStyle, background: BAR_FILL[status] }}
              >
                <span style={srOnlyStyle}>
                  {step.label} {STATUS_WORD[status]}
                </span>
              </li>
            );
          })}
        </ol>
        {stepLabels ? (
          <span aria-hidden="true" style={barLabelsStyle}>
            {steps.map((step, i) => (
              <span key={i} style={{ ...barStepLabelStyle, ...(!paused && i === active ? { color: "var(--text-positive-primary)" } : null) }}>{step.label}</span>
            ))}
          </span>
        ) : null}
        <span aria-hidden="true" style={barCaptionStyle}>
          <span style={barCaptionLabelStyle}>{caption ?? steps[active].label}</span>
          {count != null ? <span style={barCountDetailStyle}>{count}</span> : (
            <span style={barCountStyle}>
              {paused ? 0 : done + 1} of {steps.length}
            </span>
          )}
        </span>
      </div>
    );
  }

  // Compact wraps the list so the caption can sit under the full track and the
  // pair reads as one unit. The <ol> keeps every semantic it has in labelled
  // mode; the caption is aria-hidden because the same information is already in
  // the list (the step labels plus the per-item state words).
  if (compact) {
    return (
      <div data-mw-stepper-compact="" style={compactWrapStyle}>
        {/* width:100% is load-bearing. The wrapper centres its children on the
            cross axis, which shrink-wraps the list to its nodes and leaves the
            flex:1 connectors 0px wide — the track silently degrades to a bare
            dot row, which is the pattern this variant exists to replace. */}
        <ol data-mw-stepper="" data-variant="compact" aria-label={ariaLabel} style={compactListStyle} role="list">
          {steps.map((step, i) => renderItem(step, i, steps.length, active, true))}
        </ol>
        <span aria-hidden="true" style={captionStyle}>
          <span style={captionCountStyle}>
            Step {active + 1} of {steps.length}
          </span>
          <span style={captionSepStyle}>·</span>
          <span style={captionLabelStyle}>{steps[active].label}</span>
        </span>
      </div>
    );
  }

  return (
    <ol data-mw-stepper="" data-variant="labelled" aria-label={ariaLabel} style={listStyle} role="list">
      {steps.map((step, i) => renderItem(step, i, steps.length, active, false))}
    </ol>
  );
}

/* One item renderer for both variants, so the progression logic, the state
   words and aria-current can never drift apart between them. Compact differs in
   exactly two ways: the node loses its numeral (seven numerals at this size read
   as noise, and the caption carries the precise count anyway) and the label
   column is dropped, leaving the sr-only state word so a screen reader still
   hears every step and its status. */
function renderItem(
  step: StepperStep,
  i: number,
  total: number,
  active: number,
  compact: boolean,
) {
  const status: NodeStatus = i < active ? "done" : i === active ? "current" : "upcoming";
  const isFirst = i === 0;
  const isLast = i === total - 1;
  // The path travelled: the segment entering a reached node (index <= active)
  // is accent; the segment leaving a fully-past node (active > index) too.
  const leftDone = i <= active;
  const rightDone = active > i;

  return (
    <li
      key={i}
      data-mw-stepper-item=""
      data-status={status}
      aria-current={status === "current" ? "step" : undefined}
      style={compact ? compactItemStyle : itemStyle}
    >
      <span style={trackStyle}>
        <span
          aria-hidden="true"
          style={{
            ...connectorStyle,
            ...(isFirst ? connectorHiddenStyle : leftDone ? connectorDoneStyle : connectorMutedStyle),
          }}
        />
        <span
          aria-hidden="true"
          style={{
            ...nodeBaseStyle,
            ...(compact ? compactNodeStyle : null),
            ...NODE_STYLE[status],
            ...(compact && status === "current" ? compactCurrentHaloStyle : null),
          }}
        >
          {compact ? null : status === "done" ? <Checkmark size={16} /> : i + 1}
        </span>
        <span
          aria-hidden="true"
          style={{
            ...connectorStyle,
            ...(isLast ? connectorHiddenStyle : rightDone ? connectorDoneStyle : connectorMutedStyle),
          }}
        />
      </span>

      {compact ? (
        <span style={srOnlyStyle}>
          {step.label} {STATUS_WORD[status]}
        </span>
      ) : (
        <span style={labelWrapStyle}>
          <span style={{ ...labelStyle, ...LABEL_STYLE[status] }}>{step.label}</span>
          {step.description ? <span style={descriptionStyle}>{step.description}</span> : null}
          <span style={srOnlyStyle}>{STATUS_WORD[status]}</span>
        </span>
      )}
    </li>
  );
}

/* ---------- per-state looks ---------- */

const NODE_STYLE: Record<NodeStatus, CSSProperties> = {
  // done: the RECESSIVE settled-green chip with a check (--step-dot-complete,
  // v4.8.0). The fill sits NEAR the theme ground (lighter green on light,
  // darker green on dark), so the theme-side primary ink is the legible one
  // on it in both themes (6.1:1 light / 5.9:1 dark).
  done: {
    background: "var(--step-dot-complete)",
    color: "var(--text-positive-primary)",
  },
  // current: the strong theme-mirrored green node (--step-dot-active, v4.8.0)
  // with a soft halo — the success wash is the green equivalent of the old
  // --accent-wash-strong ring, composing over any ground the same way. The
  // fill is the INVERSE band relative to the theme (dark chip on light, light
  // chip on dark), so the negative primary ink carries the number.
  current: {
    background: "var(--step-dot-active)",
    color: "var(--text-negative-primary)",
    // S-11, sanctioned at D35 (27 Aug 2026). 4px is a DRAWN RING on the node,
    // the same kind of value as a border width, not a gap between two things.
    // It is off the --space ladder and off the spacing dial on purpose: a ring
    // that grew with a client's spacing dial would stop reading as a halo and
    // start reading as a second, fatter dot, and it would drift out of step with
    // the node it rings, which is itself dial-independent control geometry. The
    // compact size takes 3px for the same reason (compactCurrentHaloStyle): the
    // ring is scaled to its node, not to the dial. That sanction stands; only the
    // bare "4px" is gone (skeptic pass, 5 Sep 2026), read from --space-fixed-2xs,
    // the same dial-independent chrome-geometry rung --control-adornment-inset
    // already composes, so the ring reads a real token instead of a private literal.
    boxShadow: "0 0 0 var(--space-fixed-2xs) var(--status-success-bg)",
  },
  // upcoming: the quiet neutral outline ring (--step-dot-upcoming resolves to
  // the same theme-mirrored secondary border) in the tertiary ink.
  upcoming: {
    background: "transparent",
    border: "1px solid var(--step-dot-upcoming)",
    color: "var(--text-positive-tertiary)",
  },
};

const LABEL_STYLE: Record<NodeStatus, CSSProperties> = {
  done: { color: "var(--text-positive-secondary)" },
  current: { color: "var(--text-positive-primary)", fontWeight: "var(--weight-medium)" },
  upcoming: { color: "var(--text-positive-tertiary)" },
};

const STATUS_WORD: Record<NodeStatus, string> = {
  done: "Completed",
  current: "Current step",
  upcoming: "Upcoming",
};

/* ---------- inline styles (token-pure) ---------- */

const listStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  alignItems: "flex-start",
};

const itemStyle: CSSProperties = {
  flex: "1 1 0",
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "var(--space-xs)",
};

// The node row: two flex-grow connector halves meeting at the centred node,
// so adjacent items' halves join into one continuous line across the header.
const trackStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  width: "100%",
};

/* ---------- compact variant ---------- */

// The track and its caption as ONE block. This is the variant's whole point:
// the counter is not a sibling the consumer places nearby and hopes reads as
// related, it is part of the component.
const compactWrapStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "var(--space-xs)",
  width: "100%",
};

const compactListStyle: CSSProperties = {
  ...listStyle,
  width: "100%",
};

// No label column, so the item is just its share of the track.
const compactItemStyle: CSSProperties = {
  flex: "1 1 0",
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

// A dot, not a numbered chip. Colour still carries all three states; the count
// lives in the caption, so the node only has to say done / here / ahead.
const compactNodeStyle: CSSProperties = {
  width: "var(--control-mark-dot)",
  height: "var(--control-mark-dot)",
  // Colour moves on the shared motion token, which the token layer collapses to
  // still under prefers-reduced-motion — reduced-motion safe by construction,
  // the ProgressBar guarantee, so there is no local media query to keep in sync.
  transition: "background var(--motion-transition), box-shadow var(--motion-transition)",
};

// The current dot's halo scales with the smaller node so the ring stays a ring.
// S-11, sanctioned at D35: 3px is the 4px ring above, taken down one step for
// the smaller node. Both are drawn rings rather than gaps, so both stay off the
// --space ladder and off the spacing dial; see the note on `current`. The bare
// "3px" is gone (skeptic pass, 5 Sep 2026): derived from the same
// --space-fixed-2xs rung the full-size ring now reads, at the sanctioned 3/4
// scale-down for the smaller node, so both rings read one token, not two
// private numbers.
const compactCurrentHaloStyle: CSSProperties = {
  boxShadow: "0 0 0 calc(var(--space-fixed-2xs) * 0.75) var(--status-success-bg)",
};

// The caption: the precise count in the mono voice the system uses for counters,
// then the current step's name in the body voice. One line, one unit.
const captionStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "center",
  flexWrap: "wrap",
  gap: "var(--space-2xs)",
  minWidth: 0,
};

const captionCountStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-xs)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--text-positive-tertiary)",
};

const captionSepStyle: CSSProperties = {
  color: "var(--text-positive-tertiary)",
};

const captionLabelStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  fontWeight: "var(--weight-medium)",
  color: "var(--text-positive-primary)",
  minWidth: 0,
};

/* ---------- bar variant ---------- */

// The bar reads in the page's own voice (v6.32.0, the HQ v7 boards, K1 taken by the owner):
// done in the primary ink, the current phase in the accent, upcoming on the track. The step-dot
// greens belong to the wizard header, where a travelled path is a success; in a card that
// reports a phase, green read as a status the phase does not have.
const BAR_FILL: Record<NodeStatus, string> = {
  done: "var(--text-positive-primary)",
  current: "var(--accent-base)",
  upcoming: "var(--step-dot-upcoming)",
};

const barWrapStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xs)",
  width: "100%",
};

const barListStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  gap: "var(--space-3xs)",
  width: "100%",
};

// A segment is a bar 2xs tall (4 px at the default dial), the shared width of the row; the
// colour carries all three states. It rides the same motion token the compact dot does.
const barSegmentStyle: CSSProperties = {
  flex: "1 1 0",
  minWidth: 0,
  height: "var(--space-2xs)",
  borderRadius: "var(--control-pill-radius)",
  transition: "background var(--motion-transition)",
};

// The caption line: body small left, the count as a mono figure right (theme 7's inline
// figure), on one baseline.
const barCaptionStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "var(--space-md)",
  minWidth: 0,
};

const barCaptionLabelStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  color: "var(--text-positive-secondary)",
  minWidth: 0,
};

// The per-step labels ride the segments' own tracks (the same flex, the same 3xs gap), so a
// label always starts where its segment starts.
const barLabelsStyle: CSSProperties = {
  display: "flex",
  gap: "var(--space-3xs)",
  width: "100%",
  marginTop: "calc(-1 * var(--space-2xs))",
};
const barStepLabelStyle: CSSProperties = {
  flex: "1 1 0",
  minWidth: 0,
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  color: "var(--text-positive-tertiary)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const barCountDetailStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  color: "var(--text-positive-secondary)",
  textAlign: "right",
  minWidth: 0,
};

const barCountStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-sm)",
  fontVariantNumeric: "tabular-nums",
  color: "var(--text-positive-primary)",
  whiteSpace: "nowrap",
};

/* ---------- shared ---------- */

// 1.75rem node: structural glyph geometry (the TieredRung chip tier).
const nodeBaseStyle: CSSProperties = {
  flex: "0 0 auto",
  width: "1.75rem",
  height: "1.75rem",
  boxSizing: "border-box",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "var(--radius-full)",
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-xs)",
  lineHeight: 1,
};

// A hairline segment (the BrandLockup divider idiom); colour carries progress.
const connectorStyle: CSSProperties = {
  flex: "1 1 0",
  height: "var(--rule-weight)",
  margin: "0 var(--space-2xs)",
};

// The travelled path rides the strong step green so the line reads as one
// treatment with the dots it joins (a magenta connector into green dots would
// split the progression's voice).
const connectorDoneStyle: CSSProperties = { background: "var(--step-dot-active)" };
const connectorMutedStyle: CSSProperties = { background: "var(--border-positive-secondary)" };
// The outer half of the first/last node: kept for symmetric centring, unseen.
const connectorHiddenStyle: CSSProperties = { visibility: "hidden" };

const labelWrapStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "var(--space-3xs)",
  minWidth: 0,
  textAlign: "center",
  padding: "0 var(--space-2xs)",
};

const labelStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-snug)",
};

const descriptionStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  lineHeight: "var(--leading-snug)",
  color: "var(--text-positive-tertiary)",
};

// Visually hidden, still in the accessibility tree (the sr-only idiom).
const srOnlyStyle: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};
