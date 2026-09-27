import { CSSProperties, ReactNode } from "react";
import { Glance } from "@/components/Glance";
import { DataLabel } from "@/components/DataLabel";
import { CountUp } from "@/components/motion/CountUp";

/* ============================================================
   Stat — the KPI unit (owner, 7 Jul: promoted from the HQ dashboard so the HQ
   bands and the docs surfaces render the identical stat). A Glance figure over
   a DataLabel caption: mono number over mono label, one visual unit. countUp
   animates the figure on mount via the CountUp motion primitive, which rides
   the motion dial (still = instant, like every reveal).

   A null value is not a number: it renders a muted "n/a" and ignores accent /
   count-up / affixes (a lone "$" with no figure would mislead). Zero is real
   data: it keeps the figure and affixes but drops the accent, so an all-clear
   0 reads calm rather than alarmed. Server component; CountUp is the client
   leaf when animation is on.
   ============================================================ */

/** The three mutually exclusive cell looks. See `treatment`. */
export type StatTreatment = "bare" | "outlined" | "filled";

/** The figure's ink (v6.30.0). `accent` is the vivid display magenta for the one figure a
 *  band is about; the three status tones colour a figure by what it says (a warning count
 *  above zero, a failed read, an all-clear). Zero and null keep their own quiet states
 *  whatever the tone, as they always did for `accent`. */
export type StatTone = "accent" | "success" | "warning" | "danger";

export interface StatProps {
  label: string;
  value: ReactNode;
  /** The accent figure colour (the vivid display magenta, --accent-figure). Off by default.
   *  DEPRECATED in v6.30.0 for `tone="accent"`, which it aliases: two ways to colour a
   *  figure are an enum wearing boolean clothes (the Stat treatment lesson). Fleet census at
   *  the rename: five fork app consumers plus the kit pages, so the alias stays one release
   *  and the removal is a MAJOR. */
  accent?: boolean;
  /** The figure's ink. Folds `accent` in; wins over it when both are set. */
  tone?: StatTone;
  /** Animate the figure up on mount via CountUp. Requires value to be a number. */
  countUp?: boolean;
  /** Glance affixes: a unit/symbol at the figure's size, muted, around the figure. */
  prefix?: ReactNode;
  suffix?: ReactNode;
  /** The comparison row under the caption (v3.9.0, the ArtistHQ WoW delta):
   *  a mono micro line colored by direction, up = --status-success-text,
   *  down = --status-danger-text. The consumer formats the value ("+38 vs Q1");
   *  direction picks the ink only. Ignored for a null value (no figure, no
   *  comparison). */
  delta?: { value: ReactNode; direction: "up" | "down" };
  /** The explicit muted zero state (v3.9.0): the figure renders in
   *  --text-positive-tertiary so an empty count reads as a quiet fact.
   *  Stronger than the accent's own zero fallback (which only drops to
   *  secondary); wins over accent when both are set. */
  zero?: boolean;
  /** The cell treatment. ONE enum, not two booleans (v6.0.0, D37/D38, owner).
   *
   *  - `bare` (default): the plain column, figure over caption, no cell.
   *  - `outlined`: the "studio door" (v4.5.0) — a thin bordered cell with
   *    generous padding, wider inline than block, so a KPI reads as a quiet
   *    card. Was `panel`.
   *  - `filled`: the outlined cell FILLED with the primary surface, so a KPI
   *    band on an app canvas reads as a row of quiet panels without wrapping
   *    each Stat in a Card. Flat by design: hairline, no shadow. Was `surface`.
   *
   *  WHY IT CHANGED. These were `panel` and `surface`, two booleans, and
   *  `surface` silently won when both were set. The system's rule is that a
   *  variant is a MUTUALLY EXCLUSIVE look and an option composes, so a set of
   *  exclusive looks must be one named enum: that is what an enum is for, and
   *  it makes both-at-once unrepresentable rather than quietly resolved. The
   *  tell that they were always exclusive is that the component had to write
   *  code to decide which one won. */
  treatment?: StatTreatment;
}

const TONE_INK: Record<StatTone, string> = {
  accent: "var(--accent-figure)",
  success: "var(--status-success-text)",
  warning: "var(--status-warning-text)",
  danger: "var(--status-danger-text)",
};

export function Stat({ label, value, accent = false, tone, countUp = false, prefix, suffix, delta, zero = false, treatment = "bare" }: StatProps) {
  const figureTone: StatTone | undefined = tone ?? (accent ? "accent" : undefined);
  // One lookup, no precedence to resolve: the type already guarantees exactly one.
  const wrap = treatment === "filled" ? filledWrap : treatment === "outlined" ? outlinedWrap : statWrap;
  if (value === null || value === undefined) {
    return (
      <div style={wrap}>
        <Glance size="sm" style={{ color: "var(--text-positive-tertiary)" }}>
          n/a
        </Glance>
        <DataLabel>{label}</DataLabel>
      </div>
    );
  }
  const isZero = value === 0;
  // CountUp animates the bare number; any unit affix is Glance's, outside the count.
  const figure = countUp && typeof value === "number" ? <CountUp value={value} /> : value;
  // --accent-figure, not --accent-base: light's darkened accent-base measures near-black beside
  // the neutral figures at KPI size; the figure token stays the vivid magenta in both themes.
  // The explicit `zero` muted state outranks the accent (a deliberate quiet).
  const figureColor = zero
    ? "var(--text-positive-tertiary)"
    : figureTone
      ? (isZero ? "var(--text-positive-secondary)" : TONE_INK[figureTone])
      : undefined;
  return (
    <div style={wrap}>
      <Glance
        size="sm"
        prefix={prefix}
        suffix={suffix}
        style={figureColor ? { color: figureColor } : undefined}
      >
        {figure}
      </Glance>
      <DataLabel>{label}</DataLabel>
      {delta ? (
        <span
          style={{
            ...deltaStyle,
            color:
              delta.direction === "up"
                ? "var(--status-success-text)"
                : "var(--status-danger-text)",
          }}
        >
          {delta.value}
        </span>
      ) : null}
    </div>
  );
}

// The delta row wears the DataLabel dress (mono micro, uppercase, tracked) in
// the status ink, so the comparison reads in the same metadata voice as the
// caption above it. The status text tokens are theme-mirrored.
const deltaStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  lineHeight: "var(--leading-snug)",
};

const statWrap: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3xs)",
};

// The outlined "studio door": the bare column inside a thin bordered cell with
// generous padding, deliberately wider inline (L/R) than block (T/B).
const outlinedWrap: CSSProperties = {
  ...statWrap,
  paddingBlock: "var(--space-md)",
  paddingInline: "var(--space-lg)",
  border: "1px solid var(--border-positive-primary)",
  borderRadius: "var(--component-radius)",
};

// The filled KPI cell (v4.8.0, was `surface`): the outlined cell filled with the primary
// surface. On an app canvas (secondary ground) it reads as a white panel; on a
// primary (marketing) ground the fill matches and the hairline delineates —
// correct in both, flat in both (no shadow by design).
const filledWrap: CSSProperties = {
  ...outlinedWrap,
  background: "var(--background-positive-primary)",
};
