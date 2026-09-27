import { CSSProperties, ReactNode } from "react";
import { StarFilled } from "@carbon/icons-react";
import { srOnly } from "@/components/internal/styles";
import { FieldLabel, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";

/* ============================================================
   Rating — a discrete star rating input.

   A SERVER component: the stars are a native radio group (one radio per star),
   so a value is chosen and submitted with no JavaScript, arrow keys navigate for
   free, and the whole control works before hydration. The fill (up to the chosen
   star) and the hover preview (up to the pointed star) are pure CSS via :has(),
   the same modern selector SegmentedControl uses.

   Filled stars use the accent; the hover preview uses accent-emphasis; empty
   stars sit at the secondary border tone.
   ============================================================ */

export type RatingSize = "sm" | "md" | "lg";

export interface RatingProps {
  id?: string;
  /** Submitted form field name (the chosen star's value, 1..max). It is ALSO the native radio
   *  group, and a radio name is global to the DOCUMENT, so two Ratings on one page sharing a name
   *  merge into one group: choosing in the second clears the first. Give each its own name. */
  name: string;
  label?: ReactNode;
  /** Number of stars. */
  max?: number;
  /** Preselected rating (1..max). */
  defaultValue?: number;
  size?: RatingSize;
  disabled?: boolean;
  required?: boolean;
  /** What the label SHOWS. Defaults to deriving from `required`. */
  marking?: FieldMarkingKind;
  helper?: ReactNode;
  /** Error message. When set, the stars turn error-styled and this renders below. */
  error?: ReactNode;
}

const SIZE_PX: Record<RatingSize, number> = { sm: 18, md: 24, lg: 32 };

export function Rating({
  id,
  name,
  label,
  max = 5,
  defaultValue,
  size = "md",
  disabled = false,
  required = false,
  marking,
  helper,
  error,
}: RatingProps) {
  const labelId = id ? `${id}-label` : undefined;
  const helperId = id ? `${id}-helper` : undefined;
  const errorId = id ? `${id}-error` : undefined;
  const errorMessage = typeof error === "boolean" ? undefined : error;
  const hasError = error === true || Boolean(errorMessage);
  // A bare `true` styles the field invalid and carries no text, so the message
  // line is gated on a real message: the helper stays rendered and described,
  // and no empty alert is ever emitted. hasError keeps driving aria-invalid.
  const hasErrorMessage = Boolean(errorMessage);
  // Either / or, matching every sibling field: the error and the helper render as
  // one element or the other below, so the joined form pointed aria-describedby at
  // an id that was not in the document whenever both props were passed.
  const describedBy = hasErrorMessage ? errorId : helper ? helperId : undefined;
  // The visible label can only NAME the group when it is actually rendered with an
  // id to point at, which needs `id`. Without one, the label text becomes the name
  // directly: the old pair left the radiogroup with no accessible name at all when
  // a caller passed `label` and omitted `id`.
  const labelledBy = label && labelId ? labelId : undefined;
  // aria-label takes a plain string only: a non-string ReactNode label can name
  // the group solely through aria-labelledby (which needs `id`); otherwise the
  // generic fallback keeps the radiogroup named.
  const ariaLabel = labelledBy ? undefined : typeof label === "string" && label ? label : "Rating";

  return (
    <div data-mw-rating-root="" style={rootStyle}>
      <style href="magentaweb-rating" precedence="default">{ratingCss}</style>
      {label ? (
        <FieldLabel as="span" id={labelId} dataAttr="data-mw-rating-label" marking={resolveMarking(marking, required)}>{label}</FieldLabel>
      ) : null}

      <div
        role="radiogroup"
        aria-label={ariaLabel}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        data-mw-rating=""
        data-error={hasError ? "true" : "false"}
        data-disabled={disabled ? "true" : "false"}
        style={starsStyle}
      >
        {Array.from({ length: max }, (_, i) => {
          const v = i + 1;
          const sid = id ? `${id}-star-${v}` : undefined;
          return (
            <label key={v} htmlFor={sid} data-mw-rating-star="" style={starStyle}>
              <input
                type="radio"
                id={sid}
                name={name}
                value={v}
                defaultChecked={defaultValue === v}
                disabled={disabled}
                required={required && v === 1}
                aria-label={`${v} ${v === 1 ? "star" : "stars"}`}
                style={srOnly}
              />
              <StarFilled size={SIZE_PX[size]} aria-hidden="true" />
            </label>
          );
        })}
      </div>

      {/* Keyed so React inserts the alert instead of mutating the helper node into
          it: role="alert" added to an element already in the DOM is the unreliable
          case for live regions. */}
      {hasErrorMessage ? (
        <p key="error" id={errorId} role="alert" data-mw-rating-error="" style={errorStyle}>
          {errorMessage}
        </p>
      ) : helper ? (
        <p key="helper" id={helperId} data-mw-rating-helper="" style={helperStyle}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- inline styles ---------- */

const rootStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-2xs)", alignItems: "flex-start" };



const starsStyle: CSSProperties = { display: "inline-flex", gap: "var(--space-3xs)" };

// Colour is NOT set inline: it lives in the sheet so the :checked / :hover fill rules can win
// the cascade (inline colour would beat every selector — the Input F1 lesson).
const starStyle: CSSProperties = {
  display: "inline-flex",
  // WCAG 2.5.8: the LABEL is the hit target (the radio inside it is srOnly), so
  // the floor goes here and the painted glyph is untouched. Centring keeps the
  // glyph where it was; only the box around it grows.
  // Only size="sm" moved: its 18px star sat at 20.2px centres. md (24) and lg
  // (32) are already at or above the floor and min-width cannot shrink them, so
  // one rule covers all three sizes without touching the two that were fine.
  minWidth: "var(--target-min)",
  minHeight: "var(--target-min)",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "color var(--motion-transition)",
  borderRadius: "var(--component-radius)",
};

const helperStyle: CSSProperties = {
  margin: 0, marginTop: "var(--space-2xs)", fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)", color: "var(--text-positive-secondary)",
};
const errorStyle: CSSProperties = {
  margin: 0, marginTop: "var(--space-2xs)", fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)", color: "var(--status-danger-text)",
};

// Fill and hover preview are pure CSS. A star fills when it is the checked one or any star AFTER
// it is checked; hover resets the group and fills up to the pointed star (so hover overrides the
// current value). Order matters: the group-hover reset precedes the hover fill.
const ratingCss = `
/* color base plus the srOnly input's containing block (internal/styles.ts). */
[data-mw-rating-star] { color: var(--border-positive-secondary); position: relative; }
[data-mw-rating-star]:has(input:checked),
[data-mw-rating-star]:has(~ [data-mw-rating-star] input:checked) {
  color: var(--accent-ink);
}
[data-mw-rating]:hover [data-mw-rating-star] { color: var(--border-positive-secondary); }
[data-mw-rating-star]:hover,
[data-mw-rating-star]:has(~ [data-mw-rating-star]:hover) {
  color: var(--accent-emphasis);
}
[data-mw-rating-star]:has(input:focus-visible) { outline: var(--focus-outline); outline-offset: 2px; }
[data-mw-rating][data-error="true"] [data-mw-rating-star]:not(:has(input:checked)):not(:has(~ [data-mw-rating-star] input:checked)) {
  color: var(--status-danger-text);
}
[data-mw-rating][data-disabled="true"] { opacity: 0.5; pointer-events: none; }
`;
