import { CSSProperties, ReactNode } from "react";
import { Checkmark, Locked } from "@carbon/icons-react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { srOnly } from "@/components/internal/styles";

/* ============================================================
   TieredRung — the vertical progression list item (v3.10.0, from the
   ArtistHQ handoff: LadderRung generalized. Learn ladder, onboarding steps).

   Four states, each visually distinct at a glance:
   - done:    ink chip with a check, quiet row, mono meta.
   - current: accent chip (halo ring on --accent-wash-strong), row grounded
              on --accent-wash, a solid accent "Current" badge by the title.
   - locked:  muted row, hairline chip carrying the number or a lock glyph.
   - gated:   the warning voice: warning-bordered lock chip, and an optional
              gateProgress mini line (label + count + a small track filled
              current/required on the --status-warning-* pair).

   THE STATE IN WORDS (AX, 26 Aug 2026): the chip is aria-hidden and the
   muted ink and warning border are colour, so done, locked and gated
   reached assistive tech only through an optional meta line. Each rung
   now renders its state word visually hidden inside the title row
   (STATUS_WORD, the Stepper shape), read with the title; current is
   named by its visible Badge already.

   COMPOSES the existing primitives: Badge for the current tag, Button
   (ghost sm) for the action, the DataLabel mono voice for meta. Adjacent
   rungs separate on a hairline via a sibling rule, so a stack needs no
   wrapper component: just render rungs in a column.

   A SERVER component. `onAction` works from client trees; from a server
   page use `actionHref` (Button's link mode) instead.
   ============================================================ */

export type TieredRungState = "done" | "current" | "locked" | "gated";

export interface GateProgress {
  current: number;
  required: number;
  /** What the gate counts, e.g. "published series". */
  label: string;
}

export interface TieredRungProps {
  state: TieredRungState;
  /** The rung's ordinal, shown in the chip (done always shows the check; gated the lock). */
  number?: number | string;
  title: ReactNode;
  description?: ReactNode;
  /** Mono meta line under the title, e.g. "Done" or "Locked · finish stage 3 first". */
  meta?: ReactNode;
  /** Gated only: progress toward the gate condition. */
  gateProgress?: GateProgress;
  actionLabel?: string;
  /** Client trees only (functions cannot cross the server boundary). */
  onAction?: () => void;
  /** Link-mode action for server trees. */
  actionHref?: string;
}

export function TieredRung({
  state,
  number,
  title,
  description,
  meta,
  gateProgress,
  actionLabel,
  onAction,
  actionHref,
}: TieredRungProps) {
  const muted = state === "locked";

  const chip = (
    <span aria-hidden="true" style={{ ...chipBaseStyle, ...CHIP_STYLE[state] }}>
      {state === "done" ? (
        <Checkmark size={14} />
      ) : state === "gated" ? (
        <Locked size={14} />
      ) : number !== undefined ? (
        number
      ) : state === "locked" ? (
        <Locked size={14} />
      ) : (
        "•"
      )}
    </span>
  );

  const pct = gateProgress
    ? Math.max(0, Math.min(100, (gateProgress.current / gateProgress.required) * 100))
    : 0;

  return (
    <div data-mw-tiered-rung="" data-state={state} style={{ ...rowStyle, ...ROW_STYLE[state] }}>
      <style href="magentaweb-tiered-rung" precedence="default">{rungCss}</style>
      {chip}

      <span style={contentStyle}>
        <span style={titleRowStyle}>
          <span
            style={{
              ...titleStyle,
              color: muted ? "var(--text-positive-tertiary)" : "var(--text-positive-primary)",
              fontWeight: state === "current" ? "var(--weight-medium)" : undefined,
            }}
          >
            {title}
          </span>
          {STATUS_WORD[state] ? <span style={srOnly}>{STATUS_WORD[state]}</span> : null}
          {state === "current" ? (
            <Badge tone="accent" emphasis="solid">
              Current
            </Badge>
          ) : null}
        </span>

        {description ? (
          <span style={{ ...descriptionStyle, color: muted ? "var(--text-positive-tertiary)" : "var(--text-positive-secondary)" }}>
            {description}
          </span>
        ) : null}

        {meta ? (
          <span style={{ ...metaStyle, color: state === "gated" ? "var(--status-warning-text)" : "var(--text-positive-tertiary)" }}>
            {meta}
          </span>
        ) : null}

        {state === "gated" && gateProgress ? (
          <span style={gateLineStyle}>
            <span style={metaStyle}>
              <span style={{ color: "var(--status-warning-text)" }}>
                {gateProgress.label} ({gateProgress.current} / {gateProgress.required})
              </span>
            </span>
            <span
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={gateProgress.required}
              aria-valuenow={gateProgress.current}
              aria-label={gateProgress.label}
              style={gateTrackStyle}
            >
              <span style={{ ...gateFillStyle, width: `${pct}%` }} />
            </span>
          </span>
        ) : null}
      </span>

      {actionLabel && (onAction || actionHref) ? (
        <span style={actionStyle}>
          <Button variant="ghost" size="sm" onClick={onAction} href={actionHref}>
            {actionLabel}
          </Button>
        </span>
      ) : null}
    </div>
  );
}

/* ---------- per-state looks ---------- */

const CHIP_STYLE: Record<TieredRungState, CSSProperties> = {
  // The ink chip: the same high-contrast neutral pair Button's ink variant reads.
  done: {
    background: "var(--text-positive-primary)",
    color: "var(--text-negative-primary)",
  },
  current: {
    background: "var(--accent-base)",
    color: "var(--text-on-accent)",
    boxShadow: "0 0 0 4px var(--accent-wash-strong)",
  },
  locked: {
    background: "transparent",
    border: "1px solid var(--border-positive-secondary)",
    color: "var(--text-positive-tertiary)",
  },
  gated: {
    background: "transparent",
    border: "1px solid var(--status-warning-accent)",
    color: "var(--status-warning-text)",
  },
};

const ROW_STYLE: Record<TieredRungState, CSSProperties> = {
  done: {},
  current: { background: "var(--accent-wash)" },
  locked: {},
  gated: {},
};

// The state, in words, for assistive tech (see the header note): rendered visually
// hidden in the title row so it rides with the title, the Stepper STATUS_WORD shape.
// current is absent on purpose: its visible Badge already says "Current" in real text.
const STATUS_WORD: Partial<Record<TieredRungState, string>> = {
  done: "Completed",
  locked: "Locked",
  gated: "Locked, gated",
};

/* ---------- inline styles ---------- */

const rowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  gap: "var(--space-sm)",
  alignItems: "center",
  padding: "var(--space-sm) var(--space-md)",
};

// 28px chip: structural glyph geometry (the Rating SIZE_PX tier).
const chipBaseStyle: CSSProperties = {
  width: 28,
  height: 28,
  boxSizing: "border-box",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-xs)",
  borderRadius: "var(--component-radius)",
  flexShrink: 0,
};

const contentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3xs)",
  minWidth: 0,
};

const titleRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-xs)",
  flexWrap: "wrap",
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
};

const descriptionStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
};

const metaStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  lineHeight: "var(--leading-snug)",
};

const gateLineStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3xs)",
  marginTop: "var(--space-3xs)",
};

// TRACKS RIDE THE PILL DIAL (v4.8.0, owner — rewrites the 15 Jul "a track is a
// pill" canon): square at sharp, squircle at soft, pill at pronounced. On this
// 4px-tall gate the pill token never exceeds half-height except at pronounced —
// the same constant pill the old rule pinned. See ChannelSplitBar + SESSION_LOG.
const gateTrackStyle: CSSProperties = {
  display: "block",
  width: "min(100%, 12rem)",
  height: "var(--space-2xs)",
  background: "var(--status-warning-bg)",
  borderRadius: "var(--control-pill-radius, var(--radius-full))",
  overflow: "hidden",
};

const gateFillStyle: CSSProperties = {
  display: "block",
  height: "100%",
  background: "var(--status-warning-accent)",
};

const actionStyle: CSSProperties = {
  alignSelf: "center",
};

// Adjacent rungs separate on a hairline, so a stack needs no wrapper.
const rungCss = `
[data-mw-tiered-rung] + [data-mw-tiered-rung] {
  border-top: 1px solid var(--border-positive-secondary);
}
`;
