"use client";

import { CSSProperties, FocusEvent, useCallback, useEffect, useRef } from "react";
import {
  CheckmarkFilled,
  Close,
  ErrorFilled,
  InformationFilled,
  WarningFilled,
} from "@carbon/icons-react";
import { tokenNumber } from "@/components/internal/styles";
import { AccentRuleStyle } from "@/components/AccentRule";

/* ============================================================
   Toast — the visual notification surface and its fixed viewport.
   State and the useToast() hook live in ToastProvider; this file is
   the presentation leaf so it imports nothing from the provider and
   the two never form a runtime cycle.

   Each toast is an ephemeral card: a tone icon, a title, an
   optional description, and a dismiss button. Tones set the icon,
   the 3px left accent, the icon colour, and which announcement
   channel the provider speaks through: info / success go to the
   resident polite status channel, warning / error to the resident
   alert channel (see ToastProvider). The card itself carries no live
   role: a region created in the same commit as its text has nothing
   to mutate, so it was spoken by some AT and not others (pass 3,
   4.1.3), and a card that also announced would double-expose the
   text once the channels existed.

   Timer (2.2.1): hover and keyboard focus are two separate pause
   sources, each tracked in a ref, and the clock re-arms only when
   BOTH have let go and the toast is not leaving. Until pass 3 a
   mouseleave re-armed it with focus still on the dismiss button, and
   a focusout re-armed it under a parked pointer.

   Enter slides in from the right and fades over --motion-reveal-duration.
   Exit (driven by the `leaving` flag the provider sets before removal)
   fades and slides right over --motion-duration. Both collapse to
   instant under the global prefers-reduced-motion override.

   Focus hand-back (v5.10.0, 2.4.3): the dismiss button removes its own
   toast, and the node lingers 900ms for the exit before it is really gone,
   so a keyboard user who dismissed a toast sat on a vanishing button and
   then fell to <body>. The viewport keeps a focus proxy (where focus came
   FROM when it entered the viewport) and hands focus back there the moment
   `leaving` flips, never to another toast: hijacking focus into a different
   notification is worse than the loss.
   ============================================================ */

export type ToastTone = "info" | "success" | "warning" | "error";

export interface ToastInput {
  tone?: ToastTone;
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastRecord extends ToastInput {
  id: string;
  tone: ToastTone;
  leaving?: boolean;
}

const DEFAULT_DURATION = 5000;

const TONE_ICON = {
  info: InformationFilled,
  success: CheckmarkFilled,
  warning: WarningFilled,
  error: ErrorFilled,
} as const;

// Per-tone accent: the 3px left border and the icon share one status hue.
const TONE_COLOR: Record<ToastTone, string> = {
  info: "var(--cyan-base)",
  success: "var(--green-base)",
  warning: "var(--yellow-base)",
  error: "var(--red-base)",
};

export interface ToastProps extends ToastRecord {
  onDismiss: (id: string) => void;
  /** Fired once, with the card node, the moment `leaving` flips on (dismiss
   *  time, before the exit animation). ToastViewport hands focus back here. */
  onLeave?: (card: HTMLDivElement) => void;
}

export function Toast({
  id,
  tone,
  title,
  description,
  duration = DEFAULT_DURATION,
  leaving,
  onDismiss,
  onLeave,
}: ToastProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(duration);
  const startRef = useRef(0);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    clearTimer();
    // A non-positive duration means "stay until dismissed".
    if (remainingRef.current <= 0 || duration <= 0) return;
    startRef.current = Date.now();
    timerRef.current = setTimeout(() => onDismiss(id), remainingRef.current);
  };

  // Mount: arm the auto-dismiss timer once. Unmount: clear it.
  useEffect(() => {
    remainingRef.current = duration;
    startTimer();
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop the clock the moment the provider marks this toast for removal, and
  // hand focus back NOW: this is dismiss time for every path (the button, the
  // timer, a programmatic dismiss), 900ms before the node leaves the DOM.
  useEffect(() => {
    if (!leaving) return;
    clearTimer();
    if (cardRef.current) onLeave?.(cardRef.current);
  }, [leaving, onLeave]);

  // Hover and keyboard focus are two separate pause sources. Each handler sets
  // its own flag, and the clock re-arms with the time that was left only when
  // BOTH have let go, so a toast never expires under the pointer or under
  // focus. (Pass 3: a single resume() re-armed on mouseleave with focus still
  // on the dismiss button, and on focusout under a parked pointer.)
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const pause = () => {
    if (!timerRef.current) return;
    clearTimer();
    remainingRef.current -= Date.now() - startRef.current;
  };
  const maybeResume = () => {
    if (leaving || hoveredRef.current || focusedRef.current || timerRef.current) return;
    startTimer();
  };
  const onMouseEnter = () => {
    hoveredRef.current = true;
    pause();
  };
  const onMouseLeave = () => {
    hoveredRef.current = false;
    maybeResume();
  };
  const onFocus = () => {
    focusedRef.current = true;
    pause();
  };
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    // onBlur is focusout: focus moving from the card to its own dismiss button
    // fires blur THEN focus, and a naive release here would re-arm the clock
    // for one tick before the refocus paused it again.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    focusedRef.current = false;
    maybeResume();
  };

  const IconEl = TONE_ICON[tone];

  return (
    <div
      ref={cardRef}
      data-mw-toast=""
      data-tone={tone}
      data-state={leaving ? "leaving" : "entering"}
      // v4.8.0: the strip rides the shared AccentRule inset bar (was a 3px
      // borderLeft — the width drift vs Card's 2px is killed with it). The bare
      // attr + custom var keeps Toast's own tone colours byte-identical; the
      // transparent 2px left border keeps content geometry stable.
      data-mw-accent-rule=""
      style={{ ...cardStyle, "--mw-accent-rule-color": TONE_COLOR[tone] } as CSSProperties}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <AccentRuleStyle />
      <span style={{ ...iconStyle, color: TONE_COLOR[tone] }}>
        <IconEl size={20} aria-hidden="true" />
      </span>
      <div style={contentStyle}>
        <div style={titleStyle}>{title}</div>
        {description ? <div style={descStyle}>{description}</div> : null}
      </div>
      <button
        type="button"
        data-mw-toast-dismiss=""
        aria-label="Dismiss notification"
        onClick={() => onDismiss(id)}
        style={dismissStyle}
      >
        <Close size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

/* ---------- ToastViewport ---------- */

export interface ToastViewportProps {
  toasts: ToastRecord[];
  onDismiss: (id: string) => void;
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  // The focus proxy: the element focus came FROM the last time it entered the
  // viewport from outside (a Tab from the page, or a click that focused a
  // dismiss). Toasts arrive and leave under the user, so the only honest place
  // to send focus back to is where they were before the viewport. React's
  // onFocus is focusin (it bubbles), so any control in any toast records it;
  // movement between toasts (relatedTarget inside) leaves it alone, and an
  // entry from nowhere (relatedTarget null) clears it, so a stale target never
  // pulls focus somewhere the user has not been since.
  const proxyRef = useRef<HTMLElement | null>(null);
  const onViewportFocus = (e: FocusEvent<HTMLDivElement>) => {
    const from = e.relatedTarget as HTMLElement | null;
    if (!e.currentTarget.contains(from)) proxyRef.current = from;
  };

  // Hand focus back at DISMISS time (Toast fires this when `leaving` flips),
  // and only when focus is inside the toast that is going. Never to another
  // toast: if the proxy has gone or is itself in the viewport, do nothing.
  const handBack = useCallback((card: HTMLDivElement) => {
    if (!card.contains(document.activeElement)) return;
    const target = proxyRef.current;
    if (!target || !target.isConnected || viewportRef.current?.contains(target)) return;
    target.focus({ preventScroll: true });
  }, []);

  return (
    <>
      <style href="magentaweb-toast" precedence="default">{toastCss}</style>
      <div
        ref={viewportRef}
        data-mw-toast-viewport=""
        style={viewportStyle}
        aria-live="off"
        onFocus={onViewportFocus}
      >
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onDismiss={onDismiss} onLeave={handBack} />
        ))}
      </div>
    </>
  );
}

/* ---------- inline styles ---------- */

// Fixed bottom-right: shorter reach on mobile than top-right, and clear of the
// top nav. --z-toast sits above --z-modal (the reserved V1.1 modal layer); see
// the z-index scale in tokens.css.
const viewportStyle: CSSProperties = {
  position: "fixed",
  bottom: 0,
  right: 0,
  zIndex: tokenNumber("var(--z-toast)"),
  padding: "var(--space-lg)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
  alignItems: "flex-end",
  pointerEvents: "none",
  maxWidth: "100vw",
};

const cardStyle: CSSProperties = {
  position: "relative",
  pointerEvents: "auto",
  width: "22rem",
  maxWidth: "calc(100vw - 2 * var(--space-lg))",
  display: "flex",
  gap: "var(--space-sm)",
  alignItems: "flex-start",
  padding: "var(--space-md)",
  // Clears the absolutely positioned dismiss control: its right inset, its own width, and one
  // micro rung of breath. Derived, not a number, so a control-size change cannot strand it
  // (v5.5.0; was "calc(var(--space-md) + 1.25rem)", pixel-identical at the normal dial).
  paddingRight: "calc(var(--space-xs) + var(--control-size-xs) + var(--space-2xs))",
  background: "var(--background-positive-primary)",
  border: "1px solid var(--border-positive-primary)",
  borderRadius: "var(--component-radius)",
  boxShadow: "var(--shadow-raised)",
  // The transition lives in the hoisted sheet: the inline transform-only value
  // beat the leaving rule's opacity+transform list, so the exit never faded
  // (audit F6).
};

const iconStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  flexShrink: 0,
  marginTop: "0.05rem",
};

const contentStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3xs)",
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  color: "var(--text-positive-primary)",
  lineHeight: "var(--leading-snug)",
};

const descStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  color: "var(--text-positive-secondary)",
  lineHeight: "var(--leading-snug)",
};

const dismissStyle: CSSProperties = {
  position: "absolute",
  top: "var(--space-xs)",
  right: "var(--space-xs)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "var(--control-size-xs)",
  height: "var(--control-size-xs)",
  padding: 0,
  background: "transparent",
  border: 0,
  borderRadius: "var(--component-radius)",
  color: "var(--text-positive-tertiary)",
  cursor: "pointer",
  transition: "background var(--motion-transition), color var(--motion-transition)",
};

const toastCss = `
@keyframes mw-toast-in {
  from {
    opacity: 0;
    transform: translateX(calc(100% + var(--space-lg)));
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
/* Base transition covers the stack-reflow slide AND lets the leaving state
   fade: it was inline (transform only) and beat the leaving rule (audit F6). */
[data-mw-toast] {
  transition:
    opacity var(--motion-duration) var(--motion-ease),
    transform var(--motion-transition);
}
[data-mw-toast][data-state="entering"] {
  animation: mw-toast-in var(--motion-reveal-duration) var(--motion-ease) both;
}
[data-mw-toast][data-state="leaving"] {
  opacity: 0;
  transform: translateX(calc(100% + var(--space-lg)));
  transition:
    opacity var(--motion-duration) var(--motion-ease),
    transform var(--motion-duration) var(--motion-ease);
}
[data-mw-toast-dismiss]:hover {
  background: var(--background-positive-secondary);
  color: var(--text-positive-primary);
}
[data-mw-toast-dismiss]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
`;
