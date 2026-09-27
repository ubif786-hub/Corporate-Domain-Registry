"use client";

import { CSSProperties, KeyboardEvent, ChangeEvent, useRef, useState } from "react";
import { Send } from "@carbon/icons-react";
import { Button } from "@/components/Button";
import { TextareaField, TextareaSize } from "@/components/Textarea";

/* ============================================================
   ChatComposer — the input for every conversational AI surface
   (v4.3.0, from the ArtistHQ handoff: the companion drawer, an
   inline critique thread, a course tutor).

   COMPOSES TextareaField + Button (same field surface and focus
   rules as every form textarea; the send is a real system Button,
   nothing forked). The composer adds the chat conventions: Enter
   sends, Shift+Enter breaks a line (IME composition guarded), send
   disables while the value is empty, and an uncontrolled composer
   clears itself after a send (a chat input's expected reset; a
   controlled consumer owns its own value and clears it in onSend).
   The field is always value-driven at the DOM level (text is either
   the consumer's value or the inner store), which is what makes the
   uncontrolled reset reach the textarea rather than only the state.

   Two quiet states under the field: helperText is the standing mono
   hint ("Enter to send · Shift+Enter for a new line"); rateLimited
   REPLACES it with the rate-limit line as a role="alert" (the one
   assertive moment the a11y spec sanctions) and disables send while
   it stands. The two lines carry distinct keys so React mounts a
   fresh alert node instead of mutating the helper into one (a live
   region that arrives on an existing node is the documented-
   unreliable case); an empty rateLimitedText keeps the helper, so an
   empty alert is never emitted and aria-describedby always points at
   real text.

   disabled covers the in-flight send: the consumer flips it while
   awaiting the reply. It reaches the field as readOnly + aria-disabled
   rather than the native attribute, because a natively disabled
   element cannot hold focus and every round trip dropped the user to
   <body>; the send Button keeps the native attribute. After a send the
   composer returns focus to the field (the natural landing, and the
   send button self-disables once the value clears, which would
   otherwise strand focus on body).

   PRESENTATIONAL ONLY: no API call lives here. onSend hands the
   trimmed value to the consumer; what happens next is the product's
   business.

   A CLIENT component (the live value + key handling). aria-label is
   required at the type level: a composer has no visible label, and
   a placeholder is not a name.
   ============================================================ */

export interface ChatComposerProps {
  /** Required: identifies the field and ties the helper line to it. */
  id: string;
  /** Required: the field's accessible name (there is no visible label). */
  "aria-label": string;
  /** Controlled value; pair with onChange. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Receives the trimmed value on Enter or the send button. */
  onSend?: (value: string) => void;
  placeholder?: string;
  /** Submitted form field name. Note: an in-flight (disabled) field is
   *  readOnly, not natively disabled, so its value still submits with a
   *  native form where the native attribute would have suppressed it. */
  name?: string;
  rows?: number;
  size?: TextareaSize;
  /** The consumer's in-flight or unavailable state: the field goes readOnly +
   *  aria-disabled (still focusable, so focus survives the round trip) and
   *  send disables natively. */
  disabled?: boolean;
  /** The rate-limit stand-down: send disables and the alert line replaces the helper. */
  rateLimited?: boolean;
  /** The standing mono hint under the field. */
  helperText?: string;
  /** The rate-limit line. Default "Rate limit reached. Try again in a minute."
   *  An empty string keeps the helper in place (send still stands down). */
  rateLimitedText?: string;
  /** The send button's label. Default "Send". */
  sendLabel?: string;
}

export function ChatComposer({
  id,
  "aria-label": ariaLabel,
  value,
  defaultValue,
  onChange,
  onSend,
  placeholder,
  name,
  rows = 2,
  size = "md",
  disabled = false,
  rateLimited = false,
  helperText,
  rateLimitedText = "Rate limit reached. Try again in a minute.",
  sendLabel = "Send",
}: ChatComposerProps) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const text = value !== undefined ? value : inner;
  const canSend = text.trim() !== "" && !disabled && !rateLimited;
  const statusId = `${id}-status`;
  const fieldRef = useRef<HTMLTextAreaElement | null>(null);
  // The alert branch needs a real message; a bare stand-down keeps the helper.
  const showRateLimit = rateLimited && rateLimitedText !== "";

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (value === undefined) setInner(e.target.value);
    onChange?.(e.target.value);
  };

  const send = () => {
    if (!canSend) return;
    onSend?.(text.trim());
    // The chat reset: an uncontrolled composer clears itself after a send;
    // a controlled one leaves the value to its owner.
    if (value === undefined) setInner("");
    // Focus returns to the field before the commit that disables the send
    // button (canSend goes false once the value clears), so a send from the
    // button never strands focus on <body>. From the keyboard it is a no-op.
    fieldRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={rootStyle}>
      <div style={fieldRowStyle}>
        <div style={fieldGrowStyle}>
          <TextareaField
            ref={fieldRef}
            id={id}
            name={name}
            size={size}
            rows={rows}
            placeholder={placeholder}
            readOnly={disabled || undefined}
            aria-disabled={disabled || undefined}
            aria-label={ariaLabel}
            aria-describedby={statusId}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Send size={16} />}
          iconPosition="right"
          disabled={!canSend}
          onClick={send}
        >
          {sendLabel}
        </Button>
      </div>
      {showRateLimit ? (
        <p key="error" id={statusId} role="alert" style={rateLimitStyle}>
          {rateLimitedText}
        </p>
      ) : helperText ? (
        <p key="helper" id={statusId} style={helperStyle}>
          {helperText}
        </p>
      ) : (
        // The describedby target stays present so the wiring never dangles.
        <span key="empty" id={statusId} style={emptyStatusStyle} />
      )}
    </div>
  );
}

/* ---------- inline styles ---------- */

const rootStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2xs)",
  width: "100%",
};

// The send anchors to the field's foot, not its center: a growing textarea
// keeps the button at the send position a chat hand expects.
const fieldRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: "var(--space-sm)",
};

const fieldGrowStyle: CSSProperties = {
  flex: "1 1 auto",
  minWidth: 0,
};

const helperStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  lineHeight: "var(--leading-snug)",
  color: "var(--text-positive-tertiary)",
};

const rateLimitStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  lineHeight: "var(--leading-snug)",
  color: "var(--status-warning-text)",
};

const emptyStatusStyle: CSSProperties = {
  display: "none",
};
