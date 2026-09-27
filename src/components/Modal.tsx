"use client";

import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  MouseEvent,
  ReactNode,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Close } from "@carbon/icons-react";
import { useDialogOverlay } from "@/components/useDialogOverlay";
import { FocusSentinel } from "@/components/internal/FocusSentinel";

/* ============================================================
   Modal — body-portaled dialog. V1 core (commit 1).

   Portal: renders into document.body by default so it escapes ancestor
   stacking contexts and overflow/transform clipping (the opposite of the
   Nav overlay's deliberate inline choice; a general-purpose modal can be
   mounted anywhere, including inside a transformed card or an isolate
   frame). An optional `container` portals into a given element instead and
   switches the scrim from position:fixed to position:absolute, so the
   showroom can scope a preview to its frame box without a full-page
   takeover. `container` is a real API feature, not just a demo hook.

   SSR/hydration: createPortal targets are client-only, so the component
   renders null until a mounted flag flips in an effect. Nothing date- or
   now-derived renders in the shell, so there is no hydration text surface.

   AT isolation (two directions):
   - inert-when-closed on the modal subtree itself (untabbable + removed
     from the a11y tree while it sits invisible at body), like Nav.
   - background-inert-when-open: the body-portaled modal sets `inert` on
     #mw-app-root (the layout's app-root wrapper) while open, so the whole
     page behind it leaves the tab order and the a11y tree. aria-modal alone
     is honored inconsistently across screen readers; this is the robust
     isolation. Skipped in container mode (a scoped preview, not a takeover).
     Both variants run it, the drawer since 26 Aug 2026; the drawer's one
     deviation is scroll, see the variant prop doc.

   Reused from the Nav overlay (as pattern): two-layer scroll lock with
   prevOverflow capture/restore (Nav left this contract explicitly for a
   future Modal), data-lenis-prevent on the surface, Tab focus trap with
   first/last wrap, focus restore to the trigger, Escape + backdrop dismiss,
   fully tokenized motion with the global prefers-reduced-motion contract.
   Net-new here: portal-to-body, focus-on-open into the dialog, controlled
   open/onClose API, aria-labelledby/describedby wiring, md/lg sizes.

   Compound slots (commit 2): ModalHeader / ModalBody / ModalFooter are
   NAMED EXPORTS, not static properties on Modal — a "use client" function's
   static properties do not survive the App Router server/client module
   boundary (a server component would read Modal.Header as undefined). They
   share a ModalContext. Any slot child flips the panel into composition
   mode: children render verbatim and the title/description/footer
   convenience props are ignored (a dev-only warning fires if both are set).
   ModalHeader carries title/description and registers their ids through
   context so aria-labelledby/aria-describedby wire on the slot path too;
   the prop path renders through the same three slots, so there is one
   structural source of truth. Commit 3 adds the exhaustive CDP verify.
   ============================================================ */

// The trap's focusable set is the hook's DIALOG_FOCUSABLE_SELECTOR (hoisted in pass 4,
// 27 Aug 2026, from four verbatim copies: here, Lightbox, CommandPalette and AppShell's
// drawer; Nav keeps its own narrower variant for the skip-link exclusion). Pass 3 had
// extended it with iframe, editable regions, media with controls and summary, which made
// an embed REACHABLE; containment past it is the FocusSentinel pair at the panel's edges
// in the JSX below, since a keydown inside a frame never reaches the hook's listener.

type ModalSize = "md" | "lg";
type ModalVariant = "modal" | "drawer";

export interface ModalProps {
  /** Controlled open state. The parent owns opening; the modal only requests close. */
  open: boolean;
  /** Called by every dismiss path (Escape, overlay click, close button). */
  onClose: () => void;
  /** "drawer": the 480px right-anchored slide-in (v3.9.0, the ArtistHQ
   *  companion-panel pattern). Same anatomy (header / divider / body /
   *  divider / actions), same dismissal (Escape, scrim click, close button),
   *  and since 26 Aug 2026 the same isolation: focus trap, background inert,
   *  aria-modal. Its ONE deviation is scroll: no body lock, so the reader can
   *  still move the page behind the lighter --scrim-drawer veil (inert takes
   *  the page out of the tab order and the accessibility tree without
   *  stopping scroll). The panel keeps the house --shadow-raised; the frosted
   *  scrim blur does the separating, as it does for the modal. Until the
   *  26 Aug audit the drawer was "deliberately non-modal" (no trap, no inert)
   *  while its scrim still blocked every pointer: Tab reached controls behind
   *  a 32px blur that a click could not, and Enter on one navigated away with
   *  the drawer open. The veil is honest now. `size` applies to the centered
   *  modal only; the drawer's width is --drawer-width. Default "modal". */
  variant?: ModalVariant;
  size?: ModalSize;
  /** Convenience header title. Drives aria-labelledby automatically. */
  title?: string;
  /** Convenience header description. Drives aria-describedby automatically. */
  description?: string;
  /** Action row, typically buttons, pinned at the bottom of the dialog. */
  footer?: ReactNode;
  children?: ReactNode;
  closeOnEsc?: boolean;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  /** Portal target. Defaults to document.body. Pass an element to scope the
   *  dialog to it (position:absolute instead of fixed); used by the showroom. */
  container?: HTMLElement | null;
  /** Where focus goes on close when the element that opened the dialog has
   *  left the document, because the dialog's own action removed it (confirm
   *  deleting a row from that row's menu). Point it at a stable neighbour,
   *  the table or the list the row lived in. Without it a detached trigger
   *  restores nothing and focus drops to the body. */
  restoreFocusRef?: RefObject<HTMLElement | null>;
  /** Accessible name when no `title` is set. */
  "aria-label"?: string;
}

interface ModalContextValue {
  titleId: string;
  descId: string;
  /** The id actually wired to aria-labelledby on the panel, or undefined when the
   *  dialog has no title element (a fully custom slot header, an aria-label-only
   *  dialog). ModalBody reuses it so the dialog and its body can never disagree
   *  about what names them; resolved once in Modal, not recomputed per slot. */
  labelledBy: string | undefined;
  onClose: () => void;
  showCloseButton: boolean;
  /** ModalHeader reports whether it renders a title, so the dialog can wire
   *  aria-labelledby on the slot path (and clear it if the title goes away). */
  registerLabel: (present: boolean) => void;
  registerDesc: (present: boolean) => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

function useModalContext(component: string): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error(`${component} must be used inside <Modal>.`);
  }
  return ctx;
}

const modalCss = `
[data-mw-modal-scrim] {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: var(--modal-scrim);
  backdrop-filter: blur(var(--overlay-blur));
  -webkit-backdrop-filter: blur(var(--overlay-blur));
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--motion-duration) var(--motion-ease);
}
[data-mw-modal-scrim][data-portal="container"] {
  position: absolute;
}
[data-mw-modal-scrim][data-open="true"] {
  opacity: 1;
  pointer-events: auto;
}

[data-mw-modal-panel] {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(var(--modal-width-md), 100%);
  max-height: 100%;
  /* clip, not hidden: an overflow:hidden box is still a scroll container the
     browser will scroll programmatically — focusing an element that sits in the
     panel's overflow (an sr-only input whose containing block escaped to the
     panel, see srOnly's contract in internal/styles.ts) scrolled the PANEL
     itself: content shifted up out of the clip and a void opened under the
     footer (readilyhome add-item dialog, 8 Aug 2026). A clip box cannot scroll
     at all, by anyone, ever; the body remains the dialog's one scroll region.
     The hidden line is the fallback: a browser without clip support drops the
     unknown value and would otherwise compute to visible. */
  overflow: hidden;
  overflow: clip;
  background: var(--background-positive-primary);
  color: var(--text-positive-primary);
  border: 1px solid var(--border-positive-primary);
  border-radius: var(--component-radius);
  box-shadow: var(--shadow-raised);
  transform: translateY(8px) scale(0.98);
  transition: transform var(--motion-duration) var(--motion-ease);
  outline: none;
}
[data-mw-modal-panel][data-size="lg"] {
  width: min(var(--modal-width-lg), 100%);
}
[data-mw-modal-scrim][data-open="true"] [data-mw-modal-panel] {
  transform: translateY(0) scale(1);
}

/* variant="drawer": the right-anchored slide-in. The scrim stays the click-to-
   dismiss surface but drops to the lighter --scrim-drawer veil (the page stays
   alive behind it); the panel becomes a full-height 480px sheet that slides in
   from the right on the same motion tokens the modal's rise uses (the motion
   dial and the global reduced-motion cap make it PRM-safe: still and PRM both
   collapse the slide to an instant appear). Radius is structurally 0: the
   sheet is flush to the viewport edge, so a dial radius would only round its
   two exposed corners into the page. The side shadow reads the drawer's
   leftward throw; the hairline keeps the edge honest where the shadow fades. */
[data-mw-modal-scrim][data-variant="drawer"] {
  justify-content: flex-end;
  align-items: stretch;
  padding: 0;
  background: var(--scrim-drawer);
}
[data-mw-modal-scrim][data-variant="drawer"] [data-mw-modal-panel] {
  width: min(var(--drawer-width), 100%);
  height: 100%;
  max-height: none;
  border: none;
  border-left: 1px solid var(--border-positive-primary);
  border-radius: 0;
  box-shadow: var(--shadow-raised);
  transform: translateX(100%) scale(1);
}
[data-mw-modal-scrim][data-variant="drawer"][data-open="true"] [data-mw-modal-panel] {
  transform: translateX(0) scale(1);
}

[data-mw-modal-header] {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--modal-padding);
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--border-positive-secondary);
}
[data-mw-modal-heading-group] {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
  /* Fill the header row (the close button is flex 0 0 auto beside it) so
     full-width header children (a search input, a toolbar) get the row's
     width. Without this the group shrink-wraps to its widest text line.
     Visual no-op for text-only headers: blocks size to their content. */
  flex: 1 1 auto;
}
[data-mw-modal-title] {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--type-xl);
  font-weight: var(--weight-regular);
  line-height: var(--leading-snug);
  letter-spacing: var(--tracking-snug);
  color: var(--text-positive-primary);
  overflow-wrap: anywhere;
}
[data-mw-modal-description] {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--type-sm);
  line-height: var(--leading-normal);
  color: var(--text-positive-secondary);
}
[data-mw-modal-close] {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-xs);
  border: none;
  background: transparent;
  color: var(--text-positive-secondary);
  border-radius: var(--component-radius);
  cursor: pointer;
  transition:
    color var(--motion-duration) var(--motion-ease),
    background var(--motion-duration) var(--motion-ease);
}
[data-mw-modal-close]:hover {
  color: var(--text-positive-primary);
  background: var(--background-positive-secondary);
}
[data-mw-modal-close]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}

/* Region anatomy: header / divider / body / divider / actions. The dividers
   live on the header (border-bottom) and footer (border-top), so they render
   only when the region exists. With real rules the old padding-compression
   hack (body padding-top sm after a header) retires: the body runs symmetric
   md above and below its content, and the header/footer keep their inner
   edges at md. */
[data-mw-modal-body] {
  flex: 1 1 auto;
  /* min-height:0 is what MAKES overflow-y:auto work here, and without it the
     scroll never engages. A flex item's automatic minimum size is its CONTENT
     size, so a body taller than the panel refuses to shrink: it sits at full
     content height, the panel clamps itself to max-height:100% and clips the
     overflow it cannot contain, and the footer, being the next item in the
     column, is pushed outside the clip entirely. The reported symptom is exactly
     that shape, a dialog that "gets very tall and cuts off at the bottom" with
     its buttons gone, and it lands on any form longer than the viewport.

     Reported from readilyhome on 3 Aug 2026 (the add-item dialog: a reviewer
     clicked the switch at the foot of the form, the browser scrolled the newly
     focused control into view, and the clipping became visible). The trigger was
     incidental; the defect is structural and predates it. */
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-md) var(--modal-padding);
  font-family: var(--font-body);
  font-size: var(--type-md);
  line-height: var(--leading-normal);
  color: var(--text-positive-primary);
}
/* The house ring for the stop the browser gives a scrollable body with nothing focusable
   inside it (see the ModalBody note). Same rule Table carries for its scroller, one keyboard
   vocabulary (A-053), and it replaces the UA default of auto 1px. The offset is INSET here,
   where Table's is outward: the body spans the panel edge to edge and the panel is
   overflow:clip, so an outward ring would be cut off on both sides. */
[data-mw-modal-body]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: -2px;
}

[data-mw-modal-footer] {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-sm);
  padding: var(--modal-padding);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border-positive-secondary);
}
`;

// Slot detection helper (v4.8.0): Children.toArray does not enter Fragments, so a
// conditional {cond && (<>slots</>)} hid the slots from detection. Flatten them
// (recursively — nested fragments too) before the type check.
function flattenFragments(nodes: ReactNode): ReturnType<typeof Children.toArray> {
  return Children.toArray(nodes).flatMap((child) =>
    isValidElement(child) && child.type === Fragment
      ? flattenFragments((child.props as { children?: ReactNode }).children)
      : [child],
  );
}

export function Modal({
  open,
  onClose,
  variant = "modal",
  size = "md",
  title,
  description,
  footer,
  children,
  closeOnEsc = true,
  closeOnOverlayClick = true,
  showCloseButton = true,
  container,
  restoreFocusRef,
  "aria-label": ariaLabel,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [labelRegistered, setLabelRegistered] = useState(false);
  const [descRegistered, setDescRegistered] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const pointerDownOnScrimRef = useRef(false);
  const titleId = useId();
  const descId = useId();

  const registerLabel = useCallback((present: boolean) => {
    setLabelRegistered(present);
  }, []);
  const registerDesc = useCallback((present: boolean) => {
    setDescRegistered(present);
  }, []);

  // Composition mode: any ModalHeader/ModalBody/ModalFooter child takes over
  // the panel and the title/description/footer convenience props are ignored.
  // We only need the boolean here; the slots own their own rendering.
  // v4.8.0: detection FLATTENS Fragments — a caller conditionally rendering the
  // slots inside {cond && (<>…</>)} previously went undetected (Children.toArray
  // does not enter Fragments) and got DOUBLE chrome: the prop-mode shell wrapped
  // the slot children. Rendering is untouched; only this boolean recurses.
  const hasSlots = flattenFragments(children).some(
    (child) =>
      isValidElement(child) &&
      (child.type === ModalHeader ||
        child.type === ModalBody ||
        child.type === ModalFooter),
  );

  // Client-only portal target (see header note on the SSR guard).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate client-only gate: createPortal targets are client-only, so render null until this flips post-hydration (see header SSR note).
    setMounted(true);
  }, []);

  // Dev-only: surface the one footgun of the exclusive-mode switch — a
  // convenience prop set while slot children are present is silently dropped.
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" &&
      hasSlots &&
      (title || description || footer)
    ) {
      console.warn(
        "Modal: `title`, `description`, and `footer` are ignored when ModalHeader / ModalBody / ModalFooter children are present. Move them into the slots or drop the props.",
      );
    }
  }, [hasSlots, title, description, footer]);

  // Body portal is the default; a provided container is the scoped (showroom)
  // case where we skip the page-level scroll lock and background-inert.
  const isBodyPortal = container == null;

  const isDrawer = variant === "drawer";

  // Scroll lock + background inert + focus-in + Tab/Escape, via the shared
  // overlay contract. Modal focuses the panel on open (initialFocusRef ==
  // trapRef == the panel) and background-inerts #mw-app-root; container mode
  // (isBodyPortal false) skips the page-level lock and inert, since a scoped
  // preview is not a takeover. Default isFocusable (getClientRects().length > 0)
  // is Modal's prior visibility check, so it is not passed.
  //
  // The DRAWER runs the whole contract bar one knob: lockScroll stays off so
  // the page behind the veil keeps scrolling (the variant's documented
  // deviation). Trap and background inert are ON for it since 26 Aug 2026;
  // the variant prop doc records the keyboard/pointer split that a trapless
  // drawer behind a pointer-blocking scrim produced.
  useDialogOverlay({
    open,
    trapRef: panelRef,
    initialFocusRef: panelRef,
    onClose,
    closeOnEsc,
    lockScroll: isBodyPortal && !isDrawer,
    inertTarget: () => (isBodyPortal ? document.getElementById("mw-app-root") : null),
    restoreFocusRef,
  });

  if (!mounted) return null;

  const portalTarget = container ?? document.body;

  // A `click` fires on the common ancestor of its mousedown and mouseup
  // targets, so a press that starts in the panel and releases on the scrim
  // (a text selection dragged out, a slipped click) would target the scrim
  // and dismiss. Require the press to have STARTED on the scrim too.
  const onScrimMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    pointerDownOnScrimRef.current = e.target === e.currentTarget;
  };

  const onScrimClick = (e: MouseEvent<HTMLDivElement>) => {
    if (
      closeOnOverlayClick &&
      e.target === e.currentTarget &&
      pointerDownOnScrimRef.current
    ) {
      onClose();
    }
    pointerDownOnScrimRef.current = false;
  };

  // aria-labelledby/describedby resolve from whichever path actually renders
  // an element carrying titleId/descId. In prop mode that is the convenience
  // prop (synchronous, since Modal renders the header itself); in slot mode it
  // is a ModalHeader registering through context (one frame later). The
  // `!hasSlots` guard drops the ignored convenience prop in composition mode,
  // so a `title` prop sitting next to slot children never dangles the idref.
  const labelledBy =
    labelRegistered || (!hasSlots && Boolean(title)) ? titleId : undefined;
  const describedBy =
    descRegistered || (!hasSlots && Boolean(description)) ? descId : undefined;

  const ctx: ModalContextValue = {
    titleId,
    descId,
    labelledBy,
    onClose,
    showCloseButton,
    registerLabel,
    registerDesc,
  };

  const panelContent = hasSlots ? (
    children
  ) : (
    <>
      {(title || description || showCloseButton) && (
        <ModalHeader title={title} description={description} />
      )}
      <ModalBody>{children}</ModalBody>
      {footer && <ModalFooter>{footer}</ModalFooter>}
    </>
  );

  const scrim = (
    <ModalContext.Provider value={ctx}>
      <div
        data-mw-modal-scrim=""
        data-variant={variant}
        data-open={open ? "true" : "false"}
        data-portal={isBodyPortal ? "body" : "container"}
        // Drawer: the smooth-scroll guard moves from the scrim to the panel
        // (below), so a wheel over the veil still scrolls the page behind it
        // while the panel's own body keeps native scrolling.
        data-lenis-prevent={isDrawer ? undefined : ""}
        inert={!open}
        onMouseDown={onScrimMouseDown}
        onClick={onScrimClick}
      >
        <div
          ref={panelRef}
          data-mw-modal-panel=""
          data-size={size}
          data-lenis-prevent={isDrawer ? "" : undefined}
          role="dialog"
          // Both variants trap and inert (the drawer since 26 Aug 2026), so
          // both claim aria-modal: a scrollable page behind is not non-modal.
          aria-modal="true"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          aria-label={!labelledBy ? ariaLabel : undefined}
          tabIndex={-1}
        >
          <FocusSentinel edge="start" trapRef={panelRef} />
          {panelContent}
          <FocusSentinel edge="end" trapRef={panelRef} />
        </div>
      </div>
    </ModalContext.Provider>
  );

  return (
    <>
      <style href="magentaweb-modal" precedence="default">
        {modalCss}
      </style>
      {createPortal(scrim, portalTarget)}
    </>
  );
}

/* ---------- ModalHeader ---------- */

export interface ModalHeaderProps {
  /** Heading text. Renders an h2 with the dialog's title id and drives
   *  aria-labelledby on the slot path. */
  title?: string;
  /** Supporting text under the title. Drives aria-describedby. */
  description?: string;
  /** Override the dialog-level close button for this header. */
  showCloseButton?: boolean;
  /** Extra header content rendered under the title/description (a badge,
   *  a status pill). The title still names the dialog. */
  children?: ReactNode;
}

export function ModalHeader({
  title,
  description,
  showCloseButton,
  children,
}: ModalHeaderProps) {
  const {
    titleId,
    descId,
    onClose,
    showCloseButton: ctxShowClose,
    registerLabel,
    registerDesc,
  } = useModalContext("ModalHeader");
  const hasTitle = Boolean(title);
  const hasDescription = Boolean(description);
  const showClose = showCloseButton ?? ctxShowClose;

  // Register/unregister the accessible name and description so the dialog
  // wires aria-labelledby/aria-describedby on the slot path. registerLabel/
  // registerDesc are stable (useCallback), so this runs only on change.
  useEffect(() => {
    registerLabel(hasTitle);
    return () => registerLabel(false);
  }, [registerLabel, hasTitle]);
  useEffect(() => {
    registerDesc(hasDescription);
    return () => registerDesc(false);
  }, [registerDesc, hasDescription]);

  return (
    <div data-mw-modal-header="">
      <div data-mw-modal-heading-group="">
        {title && (
          <h2 id={titleId} data-mw-modal-title="">
            {title}
          </h2>
        )}
        {description && (
          <p id={descId} data-mw-modal-description="">
            {description}
          </p>
        )}
        {children}
      </div>
      {showClose && (
        <button
          type="button"
          data-mw-modal-close=""
          aria-label="Close"
          onClick={onClose}
        >
          <Close size={20} />
        </button>
      )}
    </div>
  );
}

/* ---------- ModalBody ---------- */

export interface ModalBodyProps {
  children?: ReactNode;
}

/* The body is the dialog's one scroll region, and in Chromium 130+ a scroll container with no
   focusable children inside it is a tab stop of its own (so a keyboard user can scroll it).
   That stop is right, and it is the reason this is a naming fix and not a tabIndex one:

   - It only exists when the body ACTUALLY overflows. On a tall viewport the same dialog's body
     does not scroll and takes no stop; the census's walk (panel, close, body, Cancel, Confirm)
     is the short-viewport case, measured here at 1200x380.
   - Where the body HAS focusable children, which is most form dialogs, the browser gives it no
     stop, because the children are the way in. An unconditional tabIndex={0}, the shape Table
     carries for a table of text, would add a Tab press to every one of those, so it is
     deliberately not copied.

   What was wrong is what the stop announced: role generic with no name, falling back to reading
   the body's own contents aloud when it took focus. role="group" plus the dialog's own
   aria-labelledby names it after the dialog, which is what a reader landing there needs.

   Nothing about the KEYBOARD changes: same stops, same order, same count, measured on both
   viewports and on a form dialog. The accessibility tree does change, and on every body rather
   than only the scrolling ones: what was an ignored generic is now an exposed group carrying the
   dialog's name (measured on /components/form-modal: dialog "Edit specs" with a group "Edit
   specs" inside it). That is the point of the fix where the body takes the stop, and elsewhere it
   costs one named boundary a browse-mode reader crosses. Naming the body something of its own
   would remove the duplication and lose the thing a reader landing on the stop actually needs,
   which is which dialog they are in. */
export function ModalBody({ children }: ModalBodyProps) {
  const { labelledBy } = useModalContext("ModalBody");
  return (
    <div
      data-mw-modal-body=""
      role="group"
      aria-labelledby={labelledBy}
      // No title element to point at (a custom slot header, or an aria-label-only dialog):
      // name the region for what it is rather than leaving it to the contents fallback.
      aria-label={labelledBy ? undefined : "Dialog content"}
    >
      {children}
    </div>
  );
}

/* ---------- ModalFooter ---------- */

export interface ModalFooterProps {
  children?: ReactNode;
}

export function ModalFooter({ children }: ModalFooterProps) {
  useModalContext("ModalFooter");
  return <div data-mw-modal-footer="">{children}</div>;
}
