"use client";

import { ChangeEvent, CSSProperties, useEffect, useState } from "react";
import { ArrowUpRight } from "@carbon/icons-react";
import { TextareaField, TextareaSize } from "@/components/Textarea";
import { FieldLabel, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";

/* ============================================================
   PromptedTextarea — the word-count textarea with a semantic state line
   (v3.10.0, from the ArtistHQ handoff: HonestLineField generalized. Session
   log, quick log, rework notes, course notes).

   COMPOSES Textarea: the field is the existing TextareaField (same surface,
   border, focus, and size rules; nothing forked), wrapped in a client shell
   that counts words live and reads the count against `wordCountBands`. Each
   band is { min, label, tone }: the active band is the one with the highest
   `min` at or below the count, and its tone speaks through the status tokens
   (muted = tertiary ink, success / warning = --status-*-text). The four
   canonical states (empty / typing / in range / over range) are just band
   data, so the consumer owns the thresholds and the vocabulary.

   `italic` renders the ENTRY text in the display face italic (the handoff's
   diary voice) via a descendant rule over the composed field, so the field's
   own state styling stays untouched. `link` is the cross-reference slot
   ("Yesterday's line") on the right end of the status row.

   A CLIENT component (the live count). Works uncontrolled (defaultValue) or
   controlled (value + onChange), so a zero-wiring drop-in still counts.
   ============================================================ */

export type WordCountTone = "muted" | "success" | "warning";

export interface WordCountBand {
  /** The band activates at this count (the highest min at or below the count wins). */
  min: number;
  /** The state line's wording for this band, e.g. "honest enough". */
  label: string;
  /** muted = tertiary ink; success / warning = the status text tokens. */
  tone: WordCountTone;
}

export interface PromptedTextareaProps {
  /** Required: wires the label and the status line to the field. */
  id: string;
  label?: string;
  /** Names the field WITHOUT a visible label, for an entry whose prompt is the page heading (a
   *  quick-log screen whose h1 asks the question). Applied to the textarea only when `label` is
   *  absent, the Radio idiom; ignored otherwise. A placeholder is not a name: without either the
   *  field has none, and dev builds warn. */
  ariaLabel?: string;
  placeholder?: string;
  /** Controlled value; pair with onChange. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Submitted form field name. */
  name?: string;
  rows?: number;
  size?: TextareaSize;
  required?: boolean;
  /** What the label SHOWS. Defaults to deriving from `required`. */
  marking?: FieldMarkingKind;
  disabled?: boolean;
  /** Render the entry text in the display face italic (the diary voice). */
  italic?: boolean;
  /** The semantic count bands; the status line reads "{n} words · {label}". */
  wordCountBands?: WordCountBand[];
  /** Cross-reference slot on the status row, e.g. yesterday's entry. */
  link?: { label: string; href: string };
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

const TONE_COLOR: Record<WordCountTone, string> = {
  muted: "var(--text-positive-tertiary)",
  success: "var(--status-success-text)",
  warning: "var(--status-warning-text)",
};

function activeBand(bands: WordCountBand[] | undefined, count: number): WordCountBand | null {
  if (!bands || bands.length === 0) return null;
  let best: WordCountBand | null = null;
  for (const band of bands) {
    if (band.min <= count && (best === null || band.min > best.min)) best = band;
  }
  return best;
}

export function PromptedTextarea({
  id,
  label,
  ariaLabel,
  placeholder,
  value,
  defaultValue,
  onChange,
  name,
  rows = 3,
  size = "md",
  required = false,
  marking,
  disabled = false,
  italic = false,
  wordCountBands,
  link,
}: PromptedTextareaProps) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const text = value !== undefined ? value : inner;
  const count = countWords(text);
  const band = activeBand(wordCountBands, count);
  const statusId = `${id}-status`;

  // Dev-only: a field with neither a label nor ariaLabel has no accessible name; the placeholder
  // does not count (the Modal slot-versus-prop warning is the precedent).
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && !label && !ariaLabel) {
      console.warn(
        `PromptedTextarea "${id}": no accessible name. Pass \`label\`, or \`ariaLabel\` when the prompt is visible elsewhere.`,
      );
    }
  }, [id, label, ariaLabel]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (value === undefined) setInner(e.target.value);
    onChange?.(e.target.value);
  };

  return (
    <div data-mw-prompted-textarea="" data-italic={italic ? "true" : "false"} style={rootStyle}>
      <style href="magentaweb-prompted-textarea" precedence="default">{promptedCss}</style>
      {label ? (
        <FieldLabel htmlFor={id} marking={resolveMarking(marking, required)}>{label}</FieldLabel>
      ) : null}

      <TextareaField
        id={id}
        name={name}
        size={size}
        rows={rows}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        value={value !== undefined ? value : undefined}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={handleChange}
        aria-label={label ? undefined : ariaLabel}
        aria-describedby={statusId}
      />

      <div style={statusRowStyle}>
        <span id={statusId} style={{ ...countStyle, color: band ? TONE_COLOR[band.tone] : "var(--text-positive-tertiary)" }}>
          {count} {count === 1 ? "word" : "words"}
          {/* Only the band label is live: it changes on band crossings, not every keystroke. */}
          <span aria-live="polite">{band ? ` · ${band.label}` : ""}</span>
        </span>
        {link ? (
          <a href={link.href} data-mw-prompted-textarea-link="" style={linkStyle}>
            {link.label}
            {/* The outward affordance is the component's, not the copy's: a real
                icon (Card's link-affordance precedent), never a text glyph. */}
            <ArrowUpRight size={12} aria-hidden="true" style={{ verticalAlign: "-1px", marginLeft: "var(--space-3xs)" }} />
          </a>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- inline styles ---------- */

const rootStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2xs)",
  alignSelf: "stretch", // v4.7.0 field-fill guard (see Input rootStyle)
};



const statusRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "var(--space-sm)",
};

// The state line speaks in the DataLabel metadata voice; the color is the band's tone.
const countStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  lineHeight: "var(--leading-snug)",
  transition: "color var(--motion-transition)",
};

const linkStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--accent-ink)",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

// The italic mode restyles the COMPOSED field's text through a descendant rule, so
// TextareaField keeps sole ownership of its surface/state rules (nothing forked).
const promptedCss = `
[data-mw-prompted-textarea][data-italic="true"] [data-mw-textarea-field] {
  font-family: var(--font-quote);
  font-style: italic;
  line-height: var(--leading-normal);
}
[data-mw-prompted-textarea][data-italic="true"] [data-mw-textarea-field]::placeholder {
  font-style: italic;
}
[data-mw-prompted-textarea-link]:hover {
  color: var(--accent-emphasis);
  text-decoration: underline;
}
[data-mw-prompted-textarea-link]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
`;
