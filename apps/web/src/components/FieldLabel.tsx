import { CSSProperties, ReactNode } from "react";

/* ============================================================
   FieldLabel — the ONE field-label primitive: the house label voice (mono,
   uppercase, tracked, secondary ink) plus the required / optional marking.

   Before this existed, fifteen components each carried a private `labelStyle`
   const and seventeen carried a private `requiredMarkStyle`. They were all
   functionally identical — the same five declarations and the same two — so the
   duplication bought nothing and guaranteed drift: four of the fifteen had
   already accumulated differently-worded comments about the same A-041 contrast
   ruling, and FileUpload never got a field label at all, which is why its
   "Photos" read as body text next to a mono uppercase "ROOM NAME".

   THREE ELEMENT SHAPES, because form labelling genuinely needs all three:
   - "label" (default) for a control with an id: the htmlFor association. It
     takes an `id` too, for the one control that carries a SECOND wrapping
     <label> (Input's file drop zone): every associated label joins a control's
     name, so that input names itself by aria-labelledby pointing at this one.
   - "span" for a composite widget named by aria-labelledby, where a <label>
     would have nothing valid to point at (Listbox, Otp, Rating, DateRangePicker).
   - "legend" for a fieldset grouping several controls (FormGroup, RadioGroup).

   MARKING IS PRESENTATION, `required` IS SEMANTICS. The two were one prop, so a
   form could not keep native validation while suppressing the asterisk. They are
   separate now: a component keeps `required` (native + aria-required) and passes
   `marking` for what the label SHOWS. `marking` defaults to deriving from
   `required`, so every existing call site renders exactly as it did.

   WHEN TO MARK. The DEFAULT, and what a product gets by writing nothing, is
   that `required` alone decides: a required field carries the asterisk, an
   optional one carries nothing, and the marking always agrees with the
   constraint. That is the honest baseline and it needs no `marking` prop
   anywhere. ReadilyHome runs exactly this.

   `marking` exists for the OTHER approach, mark by EXCEPTION, where a form
   marks only its minority:
   - Mostly optional, one or two required: leave the default.
   - Mostly required, one or two optional: mark those "(optional)" and pass
     marking="none" on the required majority.
   Its argument is that if every field carries an asterisk the asterisk has
   stopped saying anything. Its cost is that the mark and the constraint can
   then disagree, so a reader can no longer trust one to tell them the other.

   Pick ONE per product and hold it. Never mark both ways in a single form. The
   component cannot see its siblings, so this is the form author's call.

   Server components: presentational, no hooks.
   ============================================================ */

/** What the label SHOWS. Independent of the control's `required` semantics. */
export type FieldMarkingKind = "required" | "optional" | "none";

/** Resolve the default: marking follows `required` unless stated otherwise.
 *  Every migrated component calls this, so the back-compatible behaviour is
 *  defined in exactly one place. */
export function resolveMarking(
  marking: FieldMarkingKind | undefined,
  required: boolean | undefined,
): FieldMarkingKind {
  return marking ?? (required ? "required" : "none");
}

export interface FieldMarkingProps {
  marking: FieldMarkingKind;
}

/** The marker alone, for controls that label themselves INLINE and so want the
 *  marking without the stacked label typography: Checkbox, Radio, FormGroup. */
export function FieldMarking({ marking }: FieldMarkingProps) {
  if (marking === "required") {
    // aria-hidden: aria-required already carries this to assistive tech, so the
    // glyph would be a second announcement of the same fact.
    return (
      <span aria-hidden="true" style={requiredMarkStyle}>
        {" *"}
      </span>
    );
  }
  if (marking === "optional") {
    // NOT aria-hidden. Nothing else conveys "optional", and inside a <label> it
    // joins the accessible name, which is exactly right: "Room name (optional)".
    return <span style={optionalMarkStyle}> (optional)</span>;
  }
  return null;
}

export interface FieldLabelProps {
  /** The element to render. Default "label". */
  as?: "label" | "span" | "legend";
  /** Required when as="label": the id of the control being named. */
  htmlFor?: string;
  /** The element's own id. Required when as="span": what the widget's aria-labelledby
   *  points at. Optional when as="label", for a control that is ALSO wrapped by a second
   *  <label> (Input's file drop zone) and so must name itself by aria-labelledby pointing
   *  back at this label alone, or the wrapper's content joins its name. */
  id?: string;
  /** What the label shows. Prefer passing the component's resolved marking. */
  marking?: FieldMarkingKind;
  /** The label text. */
  children: ReactNode;
  /** Per-component style additions (a flex row for a trailing tooltip, say).
   *  Merged AFTER the house voice, so a caller can override deliberately. */
  style?: CSSProperties;
  /** The component's own data attribute, e.g. data-mw-input-label. Preserved
   *  through the migration: nothing in the system styles these today, but they
   *  are documented hooks and dropping them would be an unrelated change. */
  dataAttr?: string;
}

export function FieldLabel({
  as = "label",
  htmlFor,
  id,
  marking = "none",
  children,
  style,
  dataAttr,
}: FieldLabelProps) {
  const merged: CSSProperties = { ...labelStyle, ...style };
  const data = dataAttr ? { [dataAttr]: "" } : {};
  const inner = (
    <>
      {children}
      <FieldMarking marking={marking} />
    </>
  );

  if (as === "legend") {
    // FORM-LEGEND-1 (v6.7.0): a rendered <legend> is NOT a flex item of its <fieldset>, so a gap
    // on the fieldset never reaches it, and the UA gives it 2px of inline padding that indents
    // the question from its own list. Every in-house consumer patched both at the callsite and
    // three hand-rolled fieldsets across two forks got it wrong the same way (one measured 0.00px
    // legend-to-first-control against 8.69px between the controls: the second law inverted). So
    // the primitive carries the reset and the bind: --space-sm, the rung the zafiro fix settled
    // on (13.03px against 8.69px item gaps). A caller's `style` still merges on top, so Radio's
    // own legend gap keeps winning where it is set.
    const legendMerged: CSSProperties = { ...labelStyle, padding: 0, marginBottom: "var(--space-sm)", ...style };
    return (
      <legend style={legendMerged} {...data}>
        {inner}
      </legend>
    );
  }
  if (as === "span") {
    return (
      <span id={id} style={merged} {...data}>
        {inner}
      </span>
    );
  }
  return (
    <label id={id} htmlFor={htmlFor} style={merged} {...data}>
      {inner}
    </label>
  );
}

/* ---------- the house label voice (token-pure) ---------- */

// Verbatim the block that was duplicated across fifteen components.
// A-041: secondary (~11:1), not tertiary (~2.5:1) — a field label is
// information-bearing and must meet WCAG 1.4.3 AA (4.5:1).
const labelStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-xs)",
  color: "var(--text-positive-secondary)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
};

// Verbatim the block that was duplicated across seventeen components.
const requiredMarkStyle: CSSProperties = {
  color: "var(--status-danger-text)",
  marginLeft: "0.1em",
};

// The optional marker recedes instead of alerting: it inherits the label's
// typography (so it reads as part of the same run, not a stray annotation) and
// drops to the tertiary ink. The required mark's danger colour would be wrong
// here — "optional" is not a warning.
const optionalMarkStyle: CSSProperties = {
  color: "var(--text-positive-tertiary)",
  marginLeft: "0.25em",
};
