"use client";

import { RefObject, useEffect, useRef } from "react";

/* ============================================================
   useDialogOverlay — the shared overlay contract for dialog-like
   surfaces (NAV_PLAN.md, "the spine"). Extracted from the two hardened
   hand-rolled copies in Modal and the Nav overlay so they (and the
   Phase 3 drawer) run one implementation.

   The core (identical in both before extraction): capture the prev
   focus at open, lock body scroll with prevOverflow capture/restore,
   install an Escape + Tab handler on window, and on cleanup restore
   scroll, remove the listener, and restore focus to the trigger.

   The two consumers diverged in nine places; each is a parameter here
   so NEITHER is normalized to the other:
     - trapRef          query root for focusables (Modal: panel; Nav: <nav>)
     - focusableSelector selector string; defaults to DIALOG_FOCUSABLE_SELECTOR
                         since pass 4 (Nav overrides it for the skip-link exclusion)
     - isFocusable       visibility predicate (Modal: getClientRects;
                         Nav: an ancestor display:none walk)
     - initialFocusRef   focus-on-open target AND the empty-case focus
                         target AND the shift-Tab boundary container.
                         Modal passes its panel; Nav omits it (no focus-in,
                         empty-case is a no-op, shift boundary is first only).
                         One param drives D1/D5/D6 so they cannot drift.
     - closeOnEsc        Escape gate (Nav relies on the default true)
     - lockScroll        body-overflow lock toggle (Modal: isBodyPortal)
     - inertTarget       background-inert target getter, with a
                         was-already-inert guard so stacked overlays do not
                         trample each other (Modal: #mw-app-root; Nav: none)

   Lifecycle note (deliberate, the one non-literal change from Modal's
   prior code): the effect keys on [open, lockScroll, closeOnEsc] and reads
   the callback/ref params through refs, so a parent re-render that hands a
   fresh inline onClose does NOT tear down and re-setup the overlay. Modal's
   prior effect listed onClose in its deps, so such a re-render re-fired the
   whole effect, risking a focus re-capture and a scroll-lock flicker. The
   ref approach is the correction, not a neutral swap; verified by the
   re-render-while-open regression test.

   NOT owned here (stays in each consumer's JSX): the closed-state `inert`
   on the surface element, `data-lenis-prevent`, backdrop-click dismiss
   (the two consumers' click handlers differ), and the FocusSentinel pair
   at the trap root's edges (internal/FocusSentinel), which contains focus
   past an <iframe> where this window listener cannot see the key.
   ============================================================ */

/* ---- The overlay stack (A-117) ----

   One module-level LIFO for every dismissible surface in the system, so Escape
   belongs to the TOPMOST one and nothing else acts on it.

   The bug it fixes: this hook installed one bubble-phase keydown listener on
   `window` per open surface, and same-target listeners fire in ADD order. So the
   EARLIEST-opened surface reached the Escape branch first, called preventDefault,
   and the surface actually on top yielded on the defaultPrevented guard. Exactly
   one surface closed, and it was the wrong one.

   Listener target could not fix it. Two hand-rolled copies of this contract listen
   on `document` (AppShell's mobile drawer, MasterControls' panel), and a document
   listener fires before EVERY window listener in the bubble path, so those two
   always won regardless of what was on top. AppShell did not even call
   preventDefault, so Escape could close two surfaces at once. Both now register
   here, which is why these three functions are exported rather than kept private.

   Capture-phase-on-a-root was considered and rejected at the time: the drawer
   variant then ran with no trap root (it passed a ref that never attached), so a
   root-scoped listener would have killed its documented Escape dismissal. The
   drawer traps since 26 Aug 2026, but the window listener stays: the stack, not
   the listener target, decides who owns Escape.

   A token is a Symbol, so two surfaces can never collide, and unregister is a
   lastIndexOf splice rather than a pop, because a surface can close by other means
   (a click outside, a button) and leave the stack out of order. */
const overlayStack: symbol[] = [];

/** Claim a place in the overlay stack. Call on open, and pair with unregisterOverlay. */
export function registerOverlay(label = "overlay"): symbol {
  const token = Symbol(label);
  overlayStack.push(token);
  return token;
}

/** True only for the surface currently on top. Escape belongs to that one alone. */
export function isTopOverlay(token: symbol | null): boolean {
  return token !== null && overlayStack[overlayStack.length - 1] === token;
}

/** Leave the stack. Safe to call twice, and safe out of order. */
export function unregisterOverlay(token: symbol): void {
  const i = overlayStack.lastIndexOf(token);
  if (i !== -1) overlayStack.splice(i, 1);
}

const defaultIsFocusable = (el: HTMLElement) => el.getClientRects().length > 0;

/* The trap's focusable set: ONE default for every dialog-like surface (pass 4,
   27 Aug 2026). Before it Modal, Lightbox, CommandPalette and AppShell's drawer
   each carried this string verbatim and Nav a fifth, narrower variant, which it
   keeps for its skip-link exclusion. Extended in pass 3 with iframe, editable
   regions, media with controls and summary, so a dialog holding a Video embed
   or a <video controls> computes its "last" from the full set instead of
   wrapping over the player. */
export const DIALOG_FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]), iframe, [contenteditable]:not([contenteditable="false"]), audio[controls], video[controls], details > summary';

/* The focusables of a trap root, as the Tab handler below and the boundary
   sentinels (internal/FocusSentinel) both see them, so the two can never
   disagree on "first" and "last". Sentinels are EXCLUDED here for every
   caller, Nav included: they match `[tabindex]`, and a wrap that targeted one
   would hand focus to the sentinel's own handler, which bounces it to the far
   edge. */
export function getFocusables(
  root: ParentNode,
  selector: string = DIALOG_FOCUSABLE_SELECTOR,
  isFocusable: (el: HTMLElement) => boolean = defaultIsFocusable,
): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !el.hasAttribute("data-mw-focus-sentinel") && isFocusable(el),
  );
}

interface UseDialogOverlayOptions {
  /** Controlled open state; the lock/trap lifecycle keys off this. */
  open: boolean;
  /** Element to query focusables within (the focus-trap root). */
  trapRef: RefObject<HTMLElement | null>;
  /** Focusable selector for the trap. Defaults to DIALOG_FOCUSABLE_SELECTOR. */
  focusableSelector?: string;
  /** Called on Escape (when closeOnEsc) so the consumer can close. */
  onClose: () => void;
  /** Focus-on-open target; also the empty-case focus target and the
   *  shift-Tab boundary container. Omit for no focus-in (Nav). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Visibility predicate for the trap. Defaults to getClientRects().length > 0. */
  isFocusable?: (el: HTMLElement) => boolean;
  /** Whether Escape closes. Default true. */
  closeOnEsc?: boolean;
  /** Whether to lock body scroll. Default true. */
  lockScroll?: boolean;
  /** Getter for an element to mark `inert` while open (background inert). */
  inertTarget?: () => HTMLElement | null;
  /** Fallback focus target for close, used ONLY when the element that had focus
   *  at open is no longer in the document: the overlay's own action removed it
   *  (a deleted row's kebab button behind a confirm dialog). Point it at a
   *  stable neighbour, the table or the list the row lived in, so focus lands
   *  somewhere the user was working. With no fallback and a detached trigger
   *  the hook restores NOTHING and focus drops to body, which is what happened
   *  before the guard existed; that default is deliberate. A silent target like
   *  #mw-app-root would scroll the page to the top on focus, which is worse
   *  than the drop, so the consumer names the destination or there is none. */
  restoreFocusRef?: RefObject<HTMLElement | null>;
}

export function useDialogOverlay({
  open,
  trapRef,
  focusableSelector = DIALOG_FOCUSABLE_SELECTOR,
  onClose,
  initialFocusRef,
  isFocusable,
  closeOnEsc = true,
  lockScroll = true,
  inertTarget,
  restoreFocusRef,
}: UseDialogOverlayOptions) {
  // Latest-value refs so the lifecycle keys only off open (+ the primitive
  // toggles), never re-firing on a parent re-render that changes an inline
  // callback/getter identity. Assigned during render (idempotent, no side
  // effects), so the open-gated effect below reads the current values.
  const onCloseRef = useRef(onClose);
  const isFocusableRef = useRef(isFocusable);
  const inertTargetRef = useRef(inertTarget);
  const trapRefRef = useRef(trapRef);
  const initialFocusRefRef = useRef(initialFocusRef);
  const selectorRef = useRef(focusableSelector);
  const restoreFocusRefRef = useRef(restoreFocusRef);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // Keep the latest callback/ref params current without re-running the
  // open-gated effect. A leading no-deps effect runs after every commit (and,
  // being declared first, before the open-gated effect on the same commit), so
  // the open-gated setup reads current values while a mid-open parent re-render
  // that only changes an inline onClose/getter identity does NOT tear it down.
  useEffect(() => {
    onCloseRef.current = onClose;
    isFocusableRef.current = isFocusable;
    inertTargetRef.current = inertTarget;
    trapRefRef.current = trapRef;
    initialFocusRefRef.current = initialFocusRef;
    selectorRef.current = focusableSelector;
    restoreFocusRefRef.current = restoreFocusRef;
  });

  // Stack membership keys on `open` ALONE, deliberately not on the main effect's
  // deps. That effect also re-runs on lockScroll / closeOnEsc, and a mid-open flip
  // of either (reachable through the Modal playground's closeOnEsc control) would
  // otherwise pop and re-PUSH the token, promoting a surface that is visually
  // underneath to the top of the stack.
  const tokenRef = useRef<symbol | null>(null);
  useEffect(() => {
    if (!open) return;
    const token = registerOverlay();
    tokenRef.current = token;
    return () => {
      unregisterOverlay(token);
      tokenRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    prevFocusRef.current = (document.activeElement as HTMLElement) ?? null;

    const prevOverflow = document.body.style.overflow;
    const inertEl = inertTargetRef.current?.() ?? null;
    // Capture whether an outer caller already locked these, so nested overlays
    // (a Modal opened over the Nav overlay) do not trample each other.
    const inertWasSet = inertEl?.hasAttribute("inert") ?? false;
    if (lockScroll) {
      document.body.style.overflow = "hidden";
    }
    if (inertEl && !inertWasSet) inertEl.setAttribute("inert", "");

    // Focus into the dialog when an initial-focus target is given. rAF so the
    // closed-state inert is removed (an inert element silently rejects focus)
    // before we focus.
    const initialFocusEl = initialFocusRefRef.current?.current ?? null;
    let raf: number | null = null;
    if (initialFocusEl) {
      raf = window.requestAnimationFrame(() => {
        initialFocusEl.focus();
      });
    }

    const onKey = (e: globalThis.KeyboardEvent) => {
      // Yield to anything outside the stack that already handled the key.
      if (e.defaultPrevented) return;
      if (e.key === "Escape") {
        // Escape belongs to the TOPMOST surface, and to no other. Listener add
        // order used to decide this, which handed it to the earliest-opened
        // surface instead (A-117).
        if (!isTopOverlay(tokenRef.current)) return;
        // A top surface with closeOnEsc off SWALLOWS the key rather than letting
        // it fall through. Otherwise Escape would close the surface BEHIND this
        // one and strand it over a dismissed parent.
        e.preventDefault();
        if (closeOnEsc) onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const root = trapRefRef.current.current;
      if (!root) return;
      const focusables = getFocusables(root, selectorRef.current, isFocusableRef.current);
      const container = initialFocusRefRef.current?.current ?? null;
      if (focusables.length === 0) {
        // With an initial-focus container, keep focus on it; otherwise no-op.
        if (container) {
          e.preventDefault();
          container.focus();
        }
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement;
      // The trap root, and an initial-focus container that is not itself one of the
      // focusables (Modal's panel, the Lightbox scrim, the drawer rail), are boundaries
      // too. A forward Tab from a freshly focused panel used to ride the browser's own
      // order to the first control; with a sentinel as the panel's first child that
      // order reaches the sentinel, which would bounce focus to the LAST control, so
      // the hook routes it to the first itself (pass 4, 27 Aug 2026). A container that
      // IS a control in the set (CommandPalette's input) is not a boundary at all: Tab
      // from it must walk on to the next control, not pin to it (the probe's
      // fallback-button check caught the first draft doing exactly that), and Shift+Tab
      // from it must step BACK one control rather than jump to the last. The same
      // exclusion therefore guards both directions (skeptic, pass 4): today the one
      // container that is a control is also the set's `first`, so the backward branch
      // reaches `last` through the `active === first` arm either way and this is a no-op,
      // but a palette that ever grows a control ahead of its input would have inherited
      // a half-guard, which is the shape a fix hides behind.
      const atEdge =
        active === root || (container !== null && active === container && !focusables.includes(container));
      if (e.shiftKey) {
        if (active === first || atEdge) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || atEdge) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      if (raf !== null) window.cancelAnimationFrame(raf);
      if (lockScroll) {
        document.body.style.overflow = prevOverflow;
      }
      if (inertEl && !inertWasSet) inertEl.removeAttribute("inert");
      // Restore only to an element still in the document. focus() on a detached
      // node is a silent no-op, and the surface that held focus is about to go
      // inert, so without this guard focus dropped to body whenever the overlay's
      // own action removed its trigger (26 Aug 2026 audit). Detached: fall back
      // to the consumer's restoreFocusRef when given, else do nothing (see the
      // option doc for why nothing is the right default).
      const prev = prevFocusRef.current;
      if (prev?.isConnected) {
        prev.focus();
      } else {
        const fallback = restoreFocusRefRef.current?.current ?? null;
        if (fallback?.isConnected) fallback.focus();
      }
    };
  }, [open, lockScroll, closeOnEsc]);
}
