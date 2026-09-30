"use client";

import { CSSProperties, FocusEvent, ReactElement, useEffect, useRef } from "react";
import { Close } from "@carbon/icons-react";
import { Button, type ButtonProps } from "@/components/Button";
import { srOnly, tokenNumber } from "@/components/internal/styles";

/* ============================================================
   BulkActionBar — the contextual action bar that surfaces the moment rows are
   selected in a Table / Listbox / gallery: a live "N selected" count, the
   operations you can run on that selection, and a clear/dismiss control. It is
   the neutral, low-drama counterpart to a Toast — it stays put while a
   selection stands and vanishes the instant nothing is selected.

   It composes the mother Button, so every action inherits the house variants,
   sizes, icon slot, and hover motion; a destructive action is tinted with the
   shared --menu-item-destructive-fg ink (the same red the DropdownMenu uses for
   its destructive items) rather than inventing a new variant.

   Positioning is by a full-width, click-through wrapper that centres the bar:
   `position="bottom"` (default) sticks it to the bottom of its own scroll
   container; `position="viewport"` pins it to the bottom of the viewport for a
   page-level selection. Client component: it owns the Escape-to-clear key
   handler. The bar itself is a labelled toolbar. The count is announced
   through a screen-reader-only role="status" region that is mounted from the
   first render, as a SIBLING of the positioning wrapper, and reads "N selected"
   or nothing: a live region speaks on mutation, so the region must exist
   before the first count arrives (pass 3, 4.1.3; until then it was born inside
   the bar together with "1 selected", and the one announcement that matters
   most, a bar of destructive actions just appeared, was the one with nothing
   to mutate). The VISIBLE bar, wrapper included, still renders nothing at
   count 0: the wrapper carries padding and sticky or fixed positioning, and a
   wrapper that survived at zero would reserve a strip on every table in the
   fleet. The resident span is position:absolute and costs no layout.

   Focus hand-back (v5.10.0, 2.4.3): the bar removes ITSELF when the count hits
   zero, and three of its own controls get it there (the clear X, an action that
   clears, Escape). A control that unmounts with focus on it drops focus to
   <body>, and the keyboard user's next Tab restarts at the top of the page. So
   the bar remembers where focus came from and gives it back on the way out,
   self-contained, with no prop for the consumer to forget. See the two refs.
   ============================================================ */

export interface BulkAction {
  /** The button label. */
  label: string;
  /** Optional leading icon (a Carbon glyph), matching Button's icon slot. */
  icon?: ReactElement;
  /** Invoked when the action button is pressed. */
  onClick: () => void;
  /** Which mother Button variant to render. Default "secondary". */
  variant?: ButtonProps["variant"];
  /** Tint the action in the destructive ink (e.g. a bulk delete). */
  destructive?: boolean;
}

export interface BulkActionBarProps {
  /** How many rows are selected. The visible bar renders only while this is > 0;
   *  the screen-reader status region is always mounted. */
  count: number;
  /** The operations offered for the current selection, left to right. */
  actions: BulkAction[];
  /** Clear the selection (also fired on Escape while the bar is shown). */
  onClear: () => void;
  /** "bottom" sticks to the scroll container; "viewport" pins to the window. */
  position?: "bottom" | "viewport";
}

// Focus the first candidate still in the document, and only when focus has
// actually fallen to <body>. An element the user is on (the checkbox they just
// unticked to empty the selection) is never overridden. preventScroll: the row
// is already in view, and a hand-back must not yank the list.
function handBackFocus(candidates: (HTMLElement | null)[]) {
  const active = document.activeElement;
  if (active && active !== document.body) return;
  const target = candidates.find((el) => el !== null && el.isConnected);
  target?.focus({ preventScroll: true });
}

export function BulkActionBar({ count, actions, onClear, position = "bottom" }: BulkActionBarProps) {
  // Where focus goes when the bar vanishes from under it. Two captures:
  // `proxyRef` is whatever focus came FROM the last time it entered the bar
  // from outside (the row the user tabbed out of; the Toast viewport idiom),
  // and `openerRef` is whatever was active when the count went 0 -> N (the row
  // they selected first; the useDialogOverlay idiom). The proxy wins when both
  // exist because it is the user's most recent position; the opener covers a
  // pointer entry, where focusin carries no relatedTarget.
  const proxyRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const shownRef = useRef(false);

  // Escape clears the selection while the bar is present. Registered only when
  // something is selected so it never swallows Escape from unrelated UI, and it
  // yields to a claimed Escape (defaultPrevented): an open picker or overlay
  // that consumed the key to close itself must not also clear the selection.
  useEffect(() => {
    if (count === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      onClear();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [count, onClear]);

  // The hand-back lives on the count -> 0 transition, not in the clear
  // button's onClick, so every road to zero is covered: the X, an action that
  // clears, Escape, and the consumer emptying its own selection. This runs
  // after the commit that unmounted the visible bar below, so if focus was
  // inside it, it has already fallen to <body> by now, which is exactly the test.
  useEffect(() => {
    const shown = count > 0;
    if (shown && !shownRef.current) {
      const el = document.activeElement as HTMLElement | null;
      openerRef.current = el && el !== document.body ? el : null;
    }
    if (!shown && shownRef.current) {
      handBackFocus([proxyRef.current, openerRef.current]);
      proxyRef.current = null;
      openerRef.current = null;
    }
    shownRef.current = shown;
  }, [count]);

  // A consumer that mounts the bar conditionally (count > 0 && <BulkActionBar/>)
  // never reaches the transition above, so the unmount path hands back too.
  useEffect(
    () => () => {
      if (shownRef.current) handBackFocus([proxyRef.current, openerRef.current]);
    },
    [],
  );

  // React's onFocus is focusin (it bubbles), so any control in the bar taking
  // focus from OUTSIDE records where it came from. Movement between the bar's
  // own buttons leaves the proxy alone.
  const onBarFocus = (e: FocusEvent<HTMLDivElement>) => {
    const from = e.relatedTarget as HTMLElement | null;
    if (from && !e.currentTarget.contains(from)) proxyRef.current = from;
  };

  const wrapperStyle = position === "viewport" ? viewportWrapperStyle : stickyWrapperStyle;

  return (
    <>
      {/* The announcement region: resident from the first render, beside the
          wrapper rather than inside it, empty at zero. See the header note. */}
      <span role="status" aria-live="polite" aria-atomic="true" data-mw-bulk-action-status="" style={srOnly}>
        {count > 0 ? `${count} selected` : ""}
      </span>
      {count > 0 ? (
        <div data-mw-bulk-action-wrapper="" style={wrapperStyle}>
          <div
            data-mw-bulk-action-bar=""
            role="toolbar"
            aria-orientation="horizontal"
            aria-label="Bulk actions for the current selection"
            style={barStyle}
            onFocus={onBarFocus}
          >
            {/* Plain text: the resident region above is what speaks the count. */}
            <span data-mw-bulk-action-count="" style={countStyle}>
              {count} selected
            </span>

            <span aria-hidden="true" style={dividerStyle} />

            <span style={actionsStyle}>
              {actions.map((action) => (
                <Button
                  key={action.label}
                  variant={action.variant ?? "secondary"}
                  size="sm"
                  icon={action.icon}
                  onClick={action.onClick}
                  style={action.destructive ? destructiveStyle : undefined}
                >
                  {action.label}
                </Button>
              ))}
            </span>

            <span aria-hidden="true" style={dividerStyle} />

            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon={<Close size={18} />}
              onClick={onClear}
              aria-label="Clear selection"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ---------- inline styles (token-pure) ---------- */

// The wrapper is a full-width, click-through strip that centres the bar so the
// sticky/fixed positioning applies to the strip, not the pill. pointerEvents
// none lets clicks fall through the empty gutters; the bar re-enables them.
const wrapperBaseStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  pointerEvents: "none",
  padding: "var(--space-lg)",
};

// "bottom": sticks to the bottom of the nearest scroll container as content
// scrolls beneath it. Sits on the raised layer, above ordinary page content.
const stickyWrapperStyle: CSSProperties = {
  ...wrapperBaseStyle,
  position: "sticky",
  bottom: 0,
  zIndex: tokenNumber("var(--z-raised)"),
};

// "viewport": pinned to the bottom of the window for a page-level selection,
// on the sticky-chrome layer so it clears ordinary content.
const viewportWrapperStyle: CSSProperties = {
  ...wrapperBaseStyle,
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: tokenNumber("var(--z-sticky)"),
};

// The pill itself: a raised neutral surface. pointerEvents auto restores
// interactivity that the wrapper switched off.
const barStyle: CSSProperties = {
  pointerEvents: "auto",
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  padding: "var(--space-2xs) var(--space-sm)",
  background: "var(--background-positive-primary)",
  border: "1px solid var(--border-positive-primary)",
  borderRadius: "var(--radius-full)",
  boxShadow: "var(--shadow-raised)",
  maxWidth: "100%",
};

const countStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  color: "var(--text-positive-primary)",
  whiteSpace: "nowrap",
  paddingLeft: "var(--space-2xs)",
};

// A quiet hairline separating the count, the actions, and the clear control —
// the faint secondary border token, sized to cap height like BrandLockup's.
// Checked at AUD-6 (4 Sep 2026): no token in tokens.css holds 1.25rem (20px)
// — it sits between --control-mark (1.125rem) and --control-size-xs
// (1.5rem) — so there is nothing to swap this literal for without adding a
// raw token, which is out of this file's scope. Left as-is, matching the
// identical literal BrandLockup's own cap-height divider already carries.
const dividerStyle: CSSProperties = {
  flex: "0 0 auto",
  width: "var(--rule-weight)", // the house hairline (BrandLockup / Toast idiom)
  height: "1.25rem",
  background: "var(--border-positive-secondary)",
};

const actionsStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-2xs)",
  flexWrap: "wrap",
};

// Destructive actions borrow the shared destructive ink so a bulk delete reads
// as dangerous without a bespoke Button variant. Overrides the variant colour
// because Button spreads `style` after its variant map.
const destructiveStyle: CSSProperties = {
  color: "var(--menu-item-destructive-fg)",
};
