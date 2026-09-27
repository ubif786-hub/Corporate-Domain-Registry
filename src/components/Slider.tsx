import { CSSProperties, InputHTMLAttributes, ReactNode } from "react";
import { FieldLabel, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";

/* ============================================================
   Slider — bounded numeric selection over a native range input.

   A SERVER component wrapping <input type="range">: no client JS, submits its
   value under `name` in a plain form. Named exports Slider (root: label + field
   + helper/error + optional min/max end captions) and SliderField (bare track).

   The native track and thumb are restyled through the vendor pseudo-elements in
   a hoisted sheet (::-webkit-slider-runnable-track / ::-moz-range-track and the
   two thumb pseudos), token-coloured. Dimensions use spacing tokens rather than
   new ones (the same pattern the studio heatmap uses for cell size), so
   tokens.css is untouched. The thumb is the accent; Firefox fills the elapsed
   track via ::-moz-range-progress. A live value bubble that follows the drag
   needs client JS and is deliberately not built here (a future client variant).
   ============================================================ */

type NativeRangeProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size" | "value" | "defaultValue" | "min" | "max" | "step"
>;

export interface SliderFieldProps extends NativeRangeProps {
  /** Optional here: a bare field wrapped in an external <label> needs none. */
  id?: string;
  error?: boolean;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
}

export interface SliderProps extends Omit<SliderFieldProps, "error"> {
  /** Required on the root: it wires the rendered label's htmlFor to the field. */
  id: string;
  label?: ReactNode;
  helper?: ReactNode;
  /** Error message. When set, the thumb turns error-styled and this renders below.
   *  A bare `true` styles the field invalid without a message. */
  error?: ReactNode;
  required?: boolean;
  /** What the label SHOWS. Defaults to deriving from `required`. */
  marking?: FieldMarkingKind;
  /** Show the min and max at the ends of the track. */
  showRange?: boolean;
  /* children removed (AUD-17, D44 carve-out, 2 Sep 2026): a copy-forward from Select
     that nothing renders — the value rode ...rest onto the native <input>, where React
     throws at runtime. Zero fleet consumers (grep for closing tags: 0 across 16 repos). */
}

export function Slider({
  id,
  label,
  helper,
  error,
  required = false,
  marking,
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  disabled = false,
  showRange = false,
  ...rest
}: SliderProps) {
  const errorMessage = typeof error === "boolean" ? undefined : error;
  const hasError = error === true || Boolean(errorMessage);
  // A bare `true` styles the field invalid and carries no text, so the message
  // line is gated on a real message: the helper stays rendered and described,
  // and no empty alert is ever emitted. hasError keeps driving aria-invalid.
  const hasErrorMessage = Boolean(errorMessage);
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const describedBy = hasErrorMessage ? errorId : helper ? helperId : undefined;

  return (
    <div data-mw-slider="" style={rootStyle}>
      {label ? (
        <FieldLabel htmlFor={id} dataAttr="data-mw-slider-label" marking={resolveMarking(marking, required)} style={labelBindStyle}>{label}</FieldLabel>
      ) : null}

      <SliderField
        id={id}
        error={hasError}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
        step={step}
        value={value}
        defaultValue={defaultValue}
        aria-describedby={describedBy}
        {...rest}
      />

      {showRange ? (
        <div style={rangeRowStyle} aria-hidden="true">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      ) : null}

      {/* Keyed so React inserts the alert instead of mutating the helper node into
          it: role="alert" added to an element already in the DOM is the unreliable
          case for live regions. */}
      {hasErrorMessage ? (
        <p key="error" id={errorId} role="alert" data-mw-slider-error="" style={errorStyle}>
          {errorMessage}
        </p>
      ) : helper ? (
        <p key="helper" id={helperId} data-mw-slider-helper="" style={helperStyle}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- SliderField ---------- */

export function SliderField({
  id,
  error = false,
  disabled = false,
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  ...rest
}: SliderFieldProps) {
  const controlled =
    value !== undefined ? { value } : defaultValue !== undefined ? { defaultValue } : {};
  return (
    <>
      <style href="magentaweb-slider" precedence="default">{sliderCss}</style>
      <input
        type="range"
        id={id}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-invalid={error || undefined}
        data-mw-slider-field=""
        data-error={error ? "true" : "false"}
        style={fieldStyle}
        {...controlled}
        {...rest}
      />
    </>
  );
}

/* ---------- inline styles ---------- */

const rootStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2xs)",
  alignSelf: "stretch", // v4.7.0 field-fill guard (see Input rootStyle)
};



const rangeRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  color: "var(--text-positive-tertiary)",
  letterSpacing: "var(--tracking-wide)",
};

// SECOND LAW (audit finding, 4 Sep 2026): see Input.tsx's identical note. The extra rung
// that used to double up here (root flex gap + this marginTop) moves to the label instead
// (labelBindStyle, below).
const helperStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  color: "var(--text-positive-secondary)",
};

const errorStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  color: "var(--status-danger-text)",
};

const labelBindStyle: CSSProperties = {
  marginBottom: "var(--space-2xs)",
};

// cursor lives in the SHEET (sliderCss, [data-mw-slider-field] base rule), NOT here: an
// unconditional inline cursor beats the :disabled rule's cursor: not-allowed on specificity
// alone, the same F7-class bug Input's numberButtonStyle and Switch's track already avoid.
const fieldStyle: CSSProperties = {
  width: "100%",
  background: "transparent",
};

// Track and thumb are the native vendor pseudo-elements, restyled here. Dimensions use
// spacing tokens (heatmap precedent) so tokens.css stays untouched. The thumb is centred
// on the track via a calc margin equal to half the track/thumb difference.
const sliderCss = `
[data-mw-slider-field] {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  /* The field has to be at least as tall as the thumb or the thumb clips. It was
     var(--space-md), which is also what sized the thumb, so the two moved
     together; now the thumb is a fixed floor and the field takes the larger of
     the two. */
  height: max(var(--space-md), var(--target-min));
  background: transparent;
  outline: none;
  cursor: pointer;
}
[data-mw-slider-field]::-webkit-slider-runnable-track {
  height: var(--space-3xs);
  background: var(--border-positive-secondary);
  border-radius: var(--control-pill-radius, var(--radius-full));
}
[data-mw-slider-field]::-moz-range-track {
  height: var(--space-3xs);
  background: var(--border-positive-secondary);
  border-radius: var(--control-pill-radius, var(--radius-full));
}
[data-mw-slider-field]::-moz-range-progress {
  height: var(--space-3xs);
  background: var(--accent-base);
  border-radius: var(--control-pill-radius, var(--radius-full));
}
/* WCAG 2.5.8. The thumb was var(--space-md): about 17px on the normal dial and
   13px on COMPACT, because --space-* rides --spacing-multiplier. A restyled
   range thumb no longer gets the user-agent-control exemption, and a target that
   shrinks as a client tunes their brand tighter is the root cause worth removing,
   not just the 17px. It is a real 24px handle now on a 2px track.
   (Honest note: at 17px with no other target within 24px this already passed the
   criterion on the spacing exception. It is fixed because 13px on compact is bad
   to grab, not because a probe called it a violation.) */
[data-mw-slider-field]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: var(--target-min);
  height: var(--target-min);
  margin-top: calc((var(--space-3xs) - var(--target-min)) / 2);
  background: var(--accent-base);
  /* The hit box is the floor; the PAINTED thumb stays exactly --space-md, its
     original size, by giving the difference away as a transparent border and
     clipping the fill to the content box. This is the one place that trick is
     legitimate: the box only overlaps the TRACK, which is not a target, so
     nothing is stolen from a neighbour. (The Carousel dots could not do this,
     because there the neighbours were other dots.) */
  border: calc((var(--target-min) - var(--space-md)) / 2) solid transparent;
  background-clip: content-box;
  border-radius: var(--control-pill-radius, var(--radius-full)); /* v4.8.0: thumb rides the radius dial */
  cursor: pointer;
  transition: box-shadow var(--motion-transition), background var(--motion-transition);
}
[data-mw-slider-field]::-moz-range-thumb {
  width: var(--target-min);
  height: var(--target-min);
  background: var(--accent-base);
  box-sizing: border-box;
  /* The hit box is the floor; the PAINTED thumb stays exactly --space-md, its
     original size, by giving the difference away as a transparent border and
     clipping the fill to the content box. This is the one place that trick is
     legitimate: the box only overlaps the TRACK, which is not a target, so
     nothing is stolen from a neighbour. (The Carousel dots could not do this,
     because there the neighbours were other dots.) */
  border: calc((var(--target-min) - var(--space-md)) / 2) solid transparent;
  background-clip: content-box;
  border-radius: var(--control-pill-radius, var(--radius-full)); /* v4.8.0: thumb rides the radius dial */
  cursor: pointer;
  transition: box-shadow var(--motion-transition), background var(--motion-transition);
}
[data-mw-slider-field]:hover::-webkit-slider-thumb { background: var(--accent-hover); }
[data-mw-slider-field]:hover::-moz-range-thumb { background: var(--accent-hover); }
[data-mw-slider-field]:focus-visible::-webkit-slider-thumb { box-shadow: var(--shadow-focus); }
[data-mw-slider-field]:focus-visible::-moz-range-thumb { box-shadow: var(--shadow-focus); }
[data-mw-slider-field][data-error="true"]::-webkit-slider-thumb { background: var(--border-error); }
[data-mw-slider-field][data-error="true"]::-moz-range-thumb { background: var(--border-error); }
[data-mw-slider-field]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
[data-mw-slider-field]:disabled::-webkit-slider-thumb { cursor: not-allowed; }
[data-mw-slider-field]:disabled::-moz-range-thumb { cursor: not-allowed; }
`;
