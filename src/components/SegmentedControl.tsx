import { CSSProperties, useId } from "react";
import { srOnly } from "@/components/internal/styles";

/* ============================================================
   SegmentedControl — two to four mutually-exclusive options, all visible at
   once (view / mode switches, on / off / auto).

   A SERVER component built on a native radio group: no client JS, and it
   submits the chosen value under `name` in a plain <form> (server actions
   included). Each segment is a <label> wrapping a visually-hidden native
   <input type="radio">, so the whole segment is the click target, keyboard
   arrow-key navigation and form submission come for free, and the checked /
   focus styling is driven by :has() on the segment (well-supported modern CSS,
   consistent with the system's color-mix usage). No shared context, so this is
   a single component, not a compound family.

   Base surface tokens live in the hoisted sheet so the checked / hover / focus
   / disabled rules win the cascade. Uses the accent-soft / accent-emphasis
   pair for the active segment, matching the nav rail's active state.

   COMFORTABLE variant: the friendly register (the Purchase Plan Monthly/Yearly
   billing toggle's intended look). One type-scale step up and one space rung
   roomier at each size, the track takes the PILL posture (--control-pill-radius,
   the Switch/Slider geometry: square at sharp, softened at soft, the classic
   pill at pronounced), and the active segment trades the flat accent-soft wash
   for the raised-surface language (v4.8.0 surface hierarchy): the PRIMARY
   surface fill lifted by --shadow-subtle, keeping the accent-emphasis ink so
   "selected" still reads as "current". Additive: variant unset renders the
   byte-identical default control (the attribute is only stamped when
   comfortable), so nothing changes for existing consumers.

   SIZE xs (owner request, 4 Aug 2026: "a shorter size so it sits neatly in a
   PANEL HEADER beside the title"). Asked for as "mini"; named `xs` because every
   size scale in this system is a t-shirt scale (Spacer already ships xs) and the
   intent names live on the OTHER axis, the register: `variant` already spends
   "comfortable", and `default` is documented as the compact register, so a
   density word here would collide with a name already in use. Same behaviour,
   the findable name.

   Why a third step and not `sm`. Panel's header is align-items flex-start and
   its title is a Heading size 6, which resolves to --type-md-plus at
   --leading-tight: about 21px at the default dials.

   READ THIS WITH THE LINE-HEIGHT FIX BELOW, because the two landed together on
   4 Aug 2026 and the arithmetic only makes sense as a pair. Before that fix sm
   measured about 39px, and a large part of the reason it would not sit in a
   header was a defect rather than the size: the label inherited --leading-normal
   where every peer control runs tight, so the control stood about 4px taller
   than the button next to it. Fixing that takes sm to about 35px, which is
   exactly Button sm, and is the right answer for every toolbar in the fleet.

   xs still earns its place after the fix, which is the test it had to pass. At
   about 25px it sits a few pixels above the title's 21px line box and reads as
   one object beside another; sm at 35px still stands two-thirds taller than the
   title and still reads as a second row that happens to be inline. So the fix
   is not a substitute for the rung and the rung is not a workaround for the
   fix. sm stays the toolbar size; xs is the header size.

   xs is the SAME LADDER one rung down, not an exception: each step drops one
   type rung and one space rung, matching Button, Input and Select.
       xs  --type-xs   --space-2xs / --space-xs
       sm  --type-sm   --space-xs  / --space-sm
       md  --type-md   --space-sm  / --space-md
   No height is set at any size (here or below): height is derived from the type
   rung plus block padding, so it tracks the spacing dial and the fluid root. A
   literal height would break both.
   ============================================================ */

export type SegmentedSize = "xs" | "sm" | "md";
/* TRACK (v6.30.0, HQ v7 system pass, theme 2): the data-surface register. A view or mode
   switch beside a title or inside a toolbar, where the bordered default reads as a button
   group and its accent wash would be the third accent on the panel. The track is the control
   wash with no border; the active segment is the primary surface lifted by the subtle shadow
   in the primary ink, so the third accent leaves the panel. Still a native radio group. */
export type SegmentedVariant = "default" | "comfortable" | "track";

export interface SegmentedOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  /** Submitted form field name; also groups the radios. */
  name: string;
  options: SegmentedOption[];
  /** Initially-checked value. Defaults to the first option when omitted. */
  defaultValue?: string;
  /** Segment type rung and padding rung. "md" is the default; "sm" is the
   *  toolbar rung; "xs" is the PANEL HEADER rung, short enough to sit beside a
   *  Panel title (a Heading size 6) rather than tower over it. */
  size?: SegmentedSize;
  /** "comfortable": the larger, softer register — one type step up, roomier
   *  padding, the pill posture, and a raised active segment. Default
   *  "default" keeps today's look, byte-identical. */
  variant?: SegmentedVariant;
  /** Accessible name for the radio group (it has no visible label of its own). */
  ariaLabel: string;
}

export function SegmentedControl({
  name,
  options,
  defaultValue,
  size = "md",
  variant = "default",
  ariaLabel,
}: SegmentedControlProps) {
  // The option ELEMENT ids are minted per instance (D33, 27 Aug 2026). They used to be
  // `${name}-${value}`, so two SegmentedControls submitting the same field on one page emitted
  // duplicate ids and each label pointed at whichever input the browser resolved first. The
  // radio NAME below deliberately stays the caller's `name`: unlike FilterPanel's, it is a
  // documented part of this component's contract (it is the submitted field, and it is also what
  // groups the radios), so two controls sharing a name is the caller's decision, not an accident.
  // useId works in a server component in react 19.2.4, so this needs no client boundary.
  const gid = useId();
  const checkedValue = defaultValue ?? options[0]?.value;
  const comfortable = variant === "comfortable";
  const track = variant === "track";
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-mw-segmented=""
      data-size={size}
      // Stamped only when comfortable so the default DOM stays byte-identical.
      data-variant={comfortable ? "comfortable" : track ? "track" : undefined}
      data-cursor-grow=""
      // The pill posture must beat the inline default radius, so comfortable
      // swaps it here (inline) rather than fighting the cascade from the sheet.
      // The track drops the border inline for the same reason and pads itself
      // one 3xs so the active segment floats inside it.
      style={comfortable ? { ...groupStyle, borderRadius: "var(--control-pill-radius)" } : track ? { ...groupStyle, border: 0, padding: "var(--space-3xs)", gap: "var(--space-3xs)" } : groupStyle}
    >
      <style href="magentaweb-segmented" precedence="default">{segmentedCss}</style>
      {options.map((o) => {
        const oid = `${gid}-${o.value}`;
        return (
          <label key={o.value} htmlFor={oid} data-mw-segment="" style={segmentStyle}>
            <input
              type="radio"
              id={oid}
              name={name}
              value={o.value}
              defaultChecked={o.value === checkedValue}
              disabled={o.disabled}
              style={srOnly}
            />
            <span>{o.label}</span>
          </label>
        );
      })}
    </div>
  );
}

/* ---------- inline styles ---------- */

const groupStyle: CSSProperties = {
  display: "inline-flex",
  borderRadius: "var(--component-radius)",
  border: "1px solid var(--border-positive-secondary)",
  // background lives in the hoisted sheet (not inline) so the app shell's
  // canvas-flip can raise it to the panel surface — v4.8.0 surface hierarchy.
  overflow: "hidden",
  maxWidth: "100%",
};

const segmentStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--font-body)",
  /* DEFECT FIX, 4 Aug 2026. This label was the only control label in the system
     inheriting body's --leading-normal: Button sets tight, Input and Select run
     at the UA's normal for a form control. The consequence was that a segmented
     control rendered about 4px TALLER than the button beside it at identical
     type and space rungs, roughly 12%, which is why it never sat right in a
     panel header and why the first instinct was to add a smaller size to escape
     it. Under the DEFECT vs CHOICE test the answer is unambiguous: no product
     wants a control that fails to line up with its own peers, so this is fixed
     in the base rather than made an option. Every size gets shorter by the same
     amount and the scale keeps its proportions. */
  lineHeight: "var(--leading-tight)",
  color: "var(--text-positive-secondary)",
  // cursor lives in the SHEET now, not inline (same fix as Slider/Switch/
  // Checkbox, audit finding 4 Sep 2026: an inline cursor can never lose to
  // the disabled sheet rule below, since inline always outranks a same-
  // origin stylesheet rule). Before this fix a disabled segment showed a
  // pointer across its whole surface, label included.
  userSelect: "none",
  whiteSpace: "nowrap",
  transition: "background var(--motion-transition), color var(--motion-transition)",
};

const segmentedCss = `
/* Surface hierarchy (v4.8.0): the control takes the PANEL surface fill from the
   sheet so the app shell's canvas-flip can raise it to the panel surface on a
   secondary canvas; the outline is the tier separator on any ground. */
[data-mw-segmented] {
  background: var(--background-positive-secondary);
}
/* The srOnly input's containing block (see the contract in internal/styles.ts).
   cursor lives here too, in the SHEET, so the disabled rule below can win
   (the Switch/Checkbox pattern, audit F7): an inline cursor on the label
   always outranks a same-origin stylesheet rule, so the disabled segment's
   not-allowed cursor below could never have beaten one set on segmentStyle. */
[data-mw-segment] {
  position: relative;
  cursor: pointer;
}
[data-mw-segment] + [data-mw-segment] {
  border-inline-start: 1px solid var(--border-positive-secondary);
}
/* xs: the panel-header rung (4 Aug 2026). One type rung and one space rung below
   sm, so the three sizes are one scale, not two plus an exception. */
[data-mw-segmented][data-size="xs"] [data-mw-segment] {
  font-size: var(--type-xs);
  padding: var(--space-2xs) var(--space-xs);
}
[data-mw-segmented][data-size="sm"] [data-mw-segment] {
  font-size: var(--type-sm);
  padding: var(--space-xs) var(--space-sm);
}
[data-mw-segmented][data-size="md"] [data-mw-segment] {
  font-size: var(--type-md);
  padding: var(--space-sm) var(--space-md);
}
/* COMFORTABLE register: one type-scale step up and one space rung roomier at
   each size, mirroring the Button size ladder (xs -> sm metrics, sm -> md,
   md -> lg). These rules are keyed PER SIZE, and the pill radius and the raised
   active segment are not, so every size in the union needs its own rule here or
   that size gets comfortable's posture with the base register's metrics. */
[data-mw-segmented][data-variant="comfortable"][data-size="xs"] [data-mw-segment] {
  font-size: var(--type-sm);
  padding: var(--space-xs) var(--space-sm);
}
[data-mw-segmented][data-variant="comfortable"][data-size="sm"] [data-mw-segment] {
  font-size: var(--type-md);
  padding: var(--space-sm) var(--space-md);
}
[data-mw-segmented][data-variant="comfortable"][data-size="md"] [data-mw-segment] {
  font-size: var(--type-lg);
  padding: var(--space-md) var(--space-lg);
}
/* TRACK register: the control wash as the track, no border, no segment rules; the segments
   in the body face at the size's type rung, secondary ink; the active one the primary
   surface lifted by the subtle shadow in the primary ink at medium weight. On dark the
   shadow token is a glow and the active ground sits one step lighter than the track, which
   is the lift. Whole-control disabled takes the read-only wash. */
[data-mw-segmented][data-variant="track"] {
  background: var(--background-control-wash);
}
[data-mw-segmented][data-variant="track"] [data-mw-segment] {
  border-radius: var(--component-radius);
}
[data-mw-segmented][data-variant="track"] [data-mw-segment] + [data-mw-segment] {
  border-inline-start: 0;
}
/* The track sits on the same rung as the bordered look and the Button beside it (v6.35.0). The
   track trades the 1px border for a --space-3xs inset, which is about 2px, so the whole control
   stood 2.4px taller than the search and the select on its row (measured 38.7 against 36.3 on the
   clients toolbar, 27 Sep 2026; a toolbar that stretches its row then stretched the search too).
   The segments give the difference back on the block axis, in the same tokens, so the sum holds
   at every dial: inset + segment = border + segment of the bordered look. */
[data-mw-segmented][data-variant="track"][data-size="xs"] [data-mw-segment] {
  padding-block: calc(var(--space-2xs) - var(--space-3xs) + 1px);
}
[data-mw-segmented][data-variant="track"][data-size="sm"] [data-mw-segment] {
  padding-block: calc(var(--space-xs) - var(--space-3xs) + 1px);
}
[data-mw-segmented][data-variant="track"][data-size="md"] [data-mw-segment] {
  padding-block: calc(var(--space-sm) - var(--space-3xs) + 1px);
}
[data-mw-segmented][data-variant="track"] [data-mw-segment]:has(input:checked) {
  background: var(--background-positive-primary);
  color: var(--text-positive-primary);
  font-weight: var(--weight-medium);
  box-shadow: var(--shadow-subtle);
}
[data-mw-segmented][data-variant="track"] [data-mw-segment]:has(input:hover:not(:checked):not(:disabled)) {
  background: transparent;
  color: var(--text-positive-primary);
}
[data-mw-segment]:has(input:hover:not(:checked):not(:disabled)) {
  background: var(--background-hover-wash);
  color: var(--text-positive-primary);
}
[data-mw-segment]:has(input:checked) {
  background: var(--accent-soft);
  color: var(--accent-emphasis);
}
/* Comfortable active: the raised-surface language (v4.8.0 surface hierarchy),
   not the flat accent wash — the chosen segment is the PRIMARY surface lifted
   by the subtle shadow, a raised object on the secondary track, with the
   accent-emphasis ink still carrying "current". On a secondary canvas the app
   shell flips the track to primary too; there the shadow and the accent ink
   carry the state, the same degradation cards accept on that ground. */
[data-mw-segmented][data-variant="comfortable"] [data-mw-segment]:has(input:checked) {
  background: var(--background-positive-primary);
  color: var(--accent-emphasis);
  box-shadow: var(--shadow-subtle);
}
[data-mw-segment]:has(input:focus-visible) {
  outline: var(--focus-outline);
  outline-offset: -2px;
}
[data-mw-segment]:has(input:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}
`;
