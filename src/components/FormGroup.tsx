import { CSSProperties, ReactNode, useId } from "react";
import { FieldMarking, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";
import { groupLegendStyle, srOnly } from "@/components/internal/styles";

/* ============================================================
   FormGroup — a semantic grouping wrapper for related fields. Unlike the other
   form components it holds no value of its own; it binds a set of controls under
   one legend, an optional description, a shared error, and a required marker.

   A SERVER component built on a native <fieldset> + <legend>, so it is the
   correct accessible grouping (a radio set, an address block, a preferences
   cluster) and its native `disabled` attribute disables every descendant control
   with no context or JavaScript. Two looks: `bare` (legend + a stack of fields)
   and `card` (the fields boxed in a bordered surface). Fields stack by default or
   run inline.

   Legend and description reuse the label/helper tokens; the card surface reuses
   the field border and radius.
   ============================================================ */

/** The "plain" alias of "bare" (A-049 intent rename) was REMOVED at v5.0.0. */
export type FormGroupVariant = "bare" | "card";
export type FormGroupOrientation = "stack" | "inline";
/** The group's validation state (v6.19.0). ONE enum, because error and success are mutually
 *  exclusive looks and the one-enum rule (D-S1) exists so a component never has to decide which
 *  of two booleans wins. */
export type FormGroupStatus = "error" | "success";

export interface FormGroupProps {
  legend: ReactNode;
  /** Optional id for the fieldset. The description and error are linked via
   *  aria-describedby either way (a generated id fills in when none is given). */
  id?: string;
  description?: ReactNode;
  /** Error message shared by the group. When set, the group turns error-styled
   *  and this renders below the fields with role="alert". A bare `true` styles
   *  the group invalid without a message: the description stays described and
   *  no empty alert is emitted. */
  /** DEPRECATED at v6.19.0, still honoured: `error={msg}` is `status="error"` with that
   *  message, and `error` wins over `status` so existing forks are byte-identical. It is kept
   *  rather than removed because it has fleet consumers, and removing a prop that has consumers
   *  is a MAJOR. New code passes `status` and `message`. */
  error?: ReactNode;
  /** The group's validation state. "error" turns the group error-styled; "success" turns it
   *  confirmed, which is the state every form hand-rolled before this existed (magenta-web's
   *  contact form is the second sighting, the studio's promotion bar). */
  status?: FormGroupStatus;
  /** The line under the fields for `status`. An error message is announced (role="alert"); a
   *  success message is announced politely (role="status"), because a confirmation that
   *  interrupts is worse than one that waits a beat. Omit for a styled state with no words. */
  message?: ReactNode;
  required?: boolean;
  /** What the label SHOWS. Defaults to deriving from `required`. */
  marking?: FieldMarkingKind;
  disabled?: boolean;
  variant?: FormGroupVariant;
  orientation?: FormGroupOrientation;
  children: ReactNode;
}

export function FormGroup({
  legend,
  id,
  description,
  error,
  status,
  message,
  required = false,
  marking,
  disabled = false,
  variant = "bare",
  orientation = "stack",
  children,
}: FormGroupProps) {
  const v = variant;
  // The deprecated prop resolves ONTO the enum, so there is one state in the component and the
  // old callers are unchanged: any `error` at all means status "error".
  const legacyErrorMessage = typeof error === "boolean" ? undefined : error;
  const hasLegacyError = error === true || Boolean(legacyErrorMessage);
  const state: FormGroupStatus | undefined = hasLegacyError ? "error" : status;
  const stateMessage = hasLegacyError ? legacyErrorMessage : message;
  const errorMessage = state === "error" ? stateMessage : undefined;
  const hasError = state === "error";
  const isSuccess = state === "success";
  const successMessage = isSuccess ? stateMessage : undefined;
  // A bare `true` styles the field invalid and carries no text, so the message
  // line is gated on a real message: the helper stays rendered and described,
  // and no empty alert is ever emitted. hasError keeps driving aria-invalid.
  const hasErrorMessage = Boolean(errorMessage);
  // useId works in this server component (React 19 ships it in the server build),
  // so the description and error are linked whether or not the caller passes an id.
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const descId = `${baseId}-desc`;
  const errorId = `${baseId}-error`;
  const statusId = `${baseId}-status`;
  const describedBy = [hasErrorMessage ? errorId : null, successMessage ? statusId : null, description ? descId : null].filter(Boolean).join(" ") || undefined;

  return (
    <fieldset
      id={id}
      disabled={disabled}
      aria-describedby={describedBy}
      data-mw-formgroup=""
      data-variant={v}
      data-error={hasError ? "true" : "false"}
      data-status={state ?? undefined}
      style={fieldsetStyle}
    >
      <style href="magentaweb-formgroup" precedence="default">{formGroupCss}</style>
      <legend data-mw-formgroup-legend="" style={legendStyle}>
        {legend}
        <FieldMarking marking={resolveMarking(marking, required)} />
        {/* aria-required is unsupported on role="group", so the legend (the group's
            accessible name) says it: "Contact preferences required, group". The
            asterisk stays aria-hidden so the fact is announced once. */}
        {required ? <span style={srOnly}> required</span> : null}
      </legend>

      {description ? (
        <p id={descId} data-mw-formgroup-desc="" style={descStyle}>
          {description}
        </p>
      ) : null}

      <div data-mw-formgroup-fields="" data-orientation={orientation} style={fieldsStyle}>
        {children}
      </div>

      {hasErrorMessage ? (
        <p id={errorId} role="alert" data-mw-formgroup-error="" style={errorStyle}>
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        // role="status" (polite), not "alert": a confirmation that interrupts what a screen
        // reader is saying is worse than one that waits for the pause.
        <p id={statusId} role="status" data-mw-formgroup-status="" style={successStyle}>
          {successMessage}
        </p>
      ) : null}
    </fieldset>
  );
}

/* ---------- inline styles ---------- */

// Reset the native fieldset chrome; the variants add back what they need via the sheet.
const fieldsetStyle: CSSProperties = {
  margin: 0,
  padding: 0,
  border: 0,
  minInlineSize: 0,
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xs)",
};

// The group legend voice lives in internal/styles.ts (groupLegendStyle) so RadioGroup can render
// the same dress on legendVariant="group". The legend's reset (display block, float none) and its
// sole spacer (a rendered legend sits outside the fieldset's flex box, S-1) travel with it.
const legendStyle: CSSProperties = groupLegendStyle;


const descStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  color: "var(--text-positive-secondary)",
  maxWidth: "var(--measure-form)",
  lineHeight: "var(--leading-normal)",
};

const fieldsStyle: CSSProperties = {
  display: "flex",
  gap: "var(--space-md)",
  marginTop: "var(--space-2xs)",
  // The fields cap at the form measure (v6.19.0). --raw-measure-form was minted FOR this
  // ("FormGroup, control wrappers") and only the description was reading it, so in a wide host a
  // stacked group stretched its inputs to the host's full width: nobody ships a 900px text
  // input, and the playground made that plain. A cap, not a width, so a narrow column is
  // unchanged; the inline orientation wraps within the same cap.
  maxWidth: "var(--measure-form)",
};

// The success line, the error line's mirror: same rung, same face, the confirmed ink.
const successStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  color: "var(--status-success-text)",
};

const errorStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  color: "var(--status-danger-text)",
};

const formGroupCss = `
[data-mw-formgroup][data-variant="card"] [data-mw-formgroup-fields] {
  border: 1px solid var(--border-positive-secondary);
  border-radius: var(--component-radius);
  background: var(--background-positive-secondary);
  padding: var(--space-lg);
}
[data-mw-formgroup][data-variant="card"][data-status="success"] [data-mw-formgroup-fields] {
  border-color: var(--status-success-text);
}
[data-mw-formgroup][data-variant="card"][data-error="true"] [data-mw-formgroup-fields] {
  border-color: var(--border-error);
}
/* The bare variant has no surface to redden, so its error state draws a rule
   down the fields' leading edge; without it a bare group error had no signal
   beyond the message, and none at all from a bare true.

   THE RULE PAINTS IN THE GUTTER (owner decision D32). The rule and its gap are
   pulled out of the fields box by a negative inline margin of exactly their own
   size, so turning the error on adds no layout: measured in flow, the first
   field slid 11.66 / 14.87 / 22.61px sideways at the compact / normal / dramatic
   dials and lost the same off its width, which is a form moving its controls
   under the pointer at the moment it validates. It is the RESTING layout that
   wins. Logical properties throughout, so an RTL fork mirrors as a unit.
   Sized from the two values it cancels, never a literal: a hardcoded offset
   would go wrong on every spacing dial.

   THE OUTDENT IS ONE RUNG, --space-sm, AND THAT IS THE WHOLE POINT. The gutter
   is the HOST's inline padding, which FormGroup does not own, and a host with
   overflow other than visible clips at its PADDING box, so a rule that lands on
   the far side of that edge is not tight, it is gone. Card is that host: every
   non-accent Card sets overflow hidden and Card.Body pads by --card-padding,
   which is --space-sm at padding="compact". A first draft spent the rule AND a
   full --space-sm of gap, so the outdent came to one rung plus 2px and the rule
   measured 2.00px OUTSIDE that clipping edge at all three dials and both
   viewports, with elementFromPoint returning null on its own centre: an error
   state with no visible rule, which is the pre-v5.10 behaviour restored in one
   container and nowhere else. So the gap absorbs the rule rather than sitting
   beside it: outdent = rule + (--space-sm - rule) = --space-sm exactly, and the
   cancellation stays exact by construction whatever the two tokens hold. The
   painted gap between rule and fields is 2px tighter than the rung and that is
   the trade. max() floors it so a fork that ever sets a rule heavier than the
   gap gets a zero gap rather than an invalid declaration and a shift.
   Guarded by scripts/probe-formgroup-shift.mjs (the fields) and
   scripts/probe-formgroup-gutter.mjs (the rule, in real hosts). */
[data-mw-formgroup][data-variant="bare"][data-error="true"] [data-mw-formgroup-fields] {
  --formgroup-error-gap: max(0px, calc(var(--space-sm) - var(--rule-weight-strong)));
  border-inline-start: var(--rule-weight-strong) solid var(--border-error);
  padding-inline-start: var(--formgroup-error-gap);
  margin-inline-start: calc(-1 * (var(--rule-weight-strong) + var(--formgroup-error-gap)));
}
[data-mw-formgroup-fields][data-orientation="stack"] { flex-direction: column; }
[data-mw-formgroup-fields][data-orientation="inline"] { flex-direction: row; flex-wrap: wrap; align-items: flex-end; }
[data-mw-formgroup]:disabled > [data-mw-formgroup-legend],
[data-mw-formgroup]:disabled > [data-mw-formgroup-desc] { opacity: 0.5; }
`;
