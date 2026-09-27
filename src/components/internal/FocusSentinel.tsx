"use client";

import { CSSProperties, FocusEvent, RefObject } from "react";
import { DIALOG_FOCUSABLE_SELECTOR, getFocusables } from "@/components/useDialogOverlay";
import { srOnly } from "@/components/internal/styles";

/* ============================================================
   FocusSentinel: the containment half of the overlay focus trap (pass 4,
   27 Aug 2026). useDialogOverlay wraps Tab at the first and last focusable
   from a window keydown listener, which is enough while focus is in this
   document. It is not enough once focus is inside an <iframe>: the keydown
   fires in the frame's own document and never reaches the listener, so Tab
   past the embed's last control walked out of the panel (with the app root
   inert, onto the body or the browser chrome; in AppShell's drawer onto the
   backdrop button). Pass 3 made an iframe REACHABLE by adding it to the
   selector; this makes it CONTAINED.

   The shape is the Radix FocusGuards one: a focusable, visually hidden span
   as the trap root's first and last child. Sequential navigation leaving the
   frame lands on the next focusable in this document, which is the sentinel,
   and its focus handler needs no key event. tabindex 0, outline none,
   opacity 0, position fixed, pointer-events none, plus the sr-only box. NOT
   aria-hidden: a focusable element hidden from the accessibility tree is an
   axe violation. Tab never rests here in the ordinary case: the hook's own
   wrap fires first for an in-document Tab, and the hook routes Tab from the
   panel root to the first control, so the sentinel is never the browser's
   next stop from there.

   WHICH WAY THE SENTINEL SENDS FOCUS DEPENDS ON WHERE IT CAME FROM, and a
   sentinel that always wraps is wrong (skeptic, pass 4, 27 Aug 2026). Not
   every surface has inert chrome on both sides: AppShell's narrow drawer
   deliberately leaves the top bar live so the toggle can close it, and its
   backdrop button sits after the rail, so a Tab from the bar and a Shift+Tab
   from the backdrop are sanctioned entries INTO the trap. An unconditional
   wrap reversed both (the bar's Tab landed on the rail's LAST link and the
   backdrop's Shift+Tab on its FIRST). relatedTarget tells the two apart:
     - a real element OUTSIDE the trap root: ENTERING, so keep the natural
       order (start -> first, end -> last);
     - inside the trap root, or NULL: LEAVING, so wrap (start -> last,
       end -> first).
   Null is the <iframe> case and it is the one this component exists for:
   Chromium reports NO relatedTarget when focus crosses a frame boundary
   (measured 27 Aug 2026: the end sentinel's focus event reads "NULL" on the
   way out of a frame, while the same-document entries read the top bar's
   "HQ login" link and the "Close navigation" backdrop). So null must read as
   leaving, or the containment wrap never fires.

   getFocusables is the hook's own reader (it excludes sentinels), so the
   sentinel and the keydown wrap always agree on first and last. Render the
   pair only while the surface is a dialog: a sentinel inside a closed, inert
   overlay is inert with it, but AppShell's inline desktop rail is not inert,
   so the shell gates its pair on the narrow viewport.
   ============================================================ */

export interface FocusSentinelProps {
  /** Which boundary this is. Leaving the trap wraps ("start" sends focus to the last focusable,
   *  "end" to the first); entering it from outside keeps the natural order ("start" sends focus
   *  to the first, "end" to the last). See the direction note above. */
  edge: "start" | "end";
  /** The trap root, the same ref the surface hands useDialogOverlay. */
  trapRef: RefObject<HTMLElement | null>;
  /** Focusable selector; defaults to the hook's DIALOG_FOCUSABLE_SELECTOR. Pass the same override the hook gets. */
  selector?: string;
  /** Visibility predicate; defaults to the hook's (getClientRects). Pass the same override the hook gets. */
  isFocusable?: (el: HTMLElement) => boolean;
}

const sentinelStyle: CSSProperties = {
  ...srOnly,
  position: "fixed",
  opacity: 0,
  pointerEvents: "none",
  outline: "none",
};

export function FocusSentinel({ edge, trapRef, selector = DIALOG_FOCUSABLE_SELECTOR, isFocusable }: FocusSentinelProps) {
  const onFocus = (e: FocusEvent<HTMLSpanElement>) => {
    const root = trapRef.current;
    if (!root) return;
    const focusables = getFocusables(root, selector, isFocusable);
    // Entering the trap from live chrome outside it, or leaving it (a frame exit reads
    // relatedTarget null, so null belongs on the leaving side). See the direction note above.
    const from = e.relatedTarget as Node | null;
    const entering = from !== null && !root.contains(from);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const target = entering ? (edge === "start" ? first : last) : edge === "start" ? last : first;
    if (target) {
      target.focus();
      return;
    }
    // Nothing else to land on: keep focus in the trap on the root itself when it takes
    // focus (every dialog root here carries tabIndex -1), else let it go.
    if (root.hasAttribute("tabindex")) root.focus();
    else e.currentTarget.blur();
  };
  return <span data-mw-focus-sentinel={edge} tabIndex={0} style={sentinelStyle} onFocus={onFocus} />;
}
