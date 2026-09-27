"use client";

import {
  Children,
  cloneElement,
  ComponentPropsWithoutRef,
  isValidElement,
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { InformationSquareFilled } from "@carbon/icons-react";
import { TopLayerPanel } from "@/components/nav/TopLayerPanel";

/* ============================================================
   Tooltip: the hover / focus text chip for info icons and truncated labels.
   Short clarifying text only, never essential content: the doctrine that cut
   the docs' own breadcrumbs applies here (chrome that carries no load is
   decoration, and content a user needs must not hide behind a hover). It
   supersedes the native title= attribute for new work, which cannot be
   styled, themed, or timed.

   Top layer: the chip rides the shared TopLayerPanel (the Popover API host
   the Nav dropdown and DropdownMenu already use), so it paints above any
   ancestor isolate / overflow / transform boundary with no z-index and no
   portal. Placement is always the below-center alignment added for it: the
   chip centres on the trigger's horizontal midpoint, clamped inside the
   viewport. An above / flip mode is future work, not built here.

   Trigger: an inline-flex wrapper span around `children`. The wrapper owns
   the reveal logic (pointerenter arms a `delay` ms intent timer, pointerleave
   cancels and closes, focus opens immediately, blur closes, Escape closes);
   the CONTENT supplies the focusable element (an icon button, a link), so
   the wrapper itself never enters the tab order.

   Accessibility: the panel is role="tooltip" and the FOCUSABLE TRIGGER
   carries a STATIC aria-describedby pointing at it (the APG tooltip
   pattern). ARIA descriptions do not cascade from a parent, so when
   `children` is a single element the id is cloned ONTO that element (the
   icon button, the link); a multi-node child falls back to the wrapper,
   which assistive tech will not read, and the docs say to prefer a single
   focusable child. Static beats while-open wiring: aria-describedby
   resolves hidden content, so the description is announced with the
   trigger without attribute churn.

   The whole top layer is non-interactive: the chip is pointer-events none
   AND the TopLayerPanel host is given pointerEvents "none" via its style
   prop, so the transparent host div under the trigger never steals clicks
   or hover from page content while the chip is open or fading out. Escape
   claims per the house overlay contract (preventDefault; stacked bubble
   listeners yield on defaultPrevented). Motion (the open / close
   fade-rise) lives in TopLayerPanel on the motion tokens, so the still
   dial and prefers-reduced-motion collapse it.
   ============================================================ */

const css = `
[data-mw-tooltip-trigger] {
  display: inline-flex;
}

[data-mw-tooltip] {
  display: block;
  width: max-content;
  /* S-11, sanctioned at D35 (27 Aug 2026). A reading MEASURE, not a spacing
     rung: 20rem at the body size is roughly 45 characters, which is the width a
     one or two line hint stays scannable at without becoming a paragraph. It is
     deliberately off the --space ladder and deliberately off the spacing dial,
     because the number of characters a reader takes in at a glance does not
     change when a client tunes its gaps. Nothing renders wrong today; measured
     against the sibling caps, it is the tightest of them on purpose. */
  max-width: 20rem;
  padding: var(--space-2xs) var(--space-xs);
  background: var(--background-negative-primary);
  color: var(--text-on-negative);
  font-family: var(--font-body);
  font-size: var(--type-xs);
  line-height: var(--leading-snug);
  border-radius: var(--component-radius);
  box-shadow: var(--shadow-raised);
  pointer-events: none;
}

/* The house info trigger (v4.8.0): a compact bare icon button carrying the
   standard Information--Square--Filled glyph. The one canonical tooltip
   trigger — set the icon here and every product tooltip that uses it follows.
   Ghost voice (tertiary ink, wash on hover), sized for an inline glyph beside
   body text. Focusable, so it takes the tooltip's aria-describedby. */
[data-mw-tooltip-info] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* WCAG 2.5.8. Measured at 20.3px on the normal dial and 19.3px on compact,
     because the only thing making the box bigger than its 16px glyph was
     --space-3xs padding, and that rides --spacing-multiplier. Where this trigger
     currently ships it passes on the spacing exception (nothing else is within
     24px of it), but it is a shared primitive: a table with one of these per row
     puts them well inside 24px of each other, and then it does not. The floor is
     not dial-scaled, so compact can no longer shrink it. */
  min-width: var(--target-min);
  min-height: var(--target-min);
  padding: var(--space-3xs);
  background: transparent;
  border: 0;
  line-height: 0;
  color: var(--text-positive-tertiary);
  cursor: pointer;
  border-radius: var(--component-radius);
  transition: color var(--motion-transition), background var(--motion-transition);
}
[data-mw-tooltip-info]:hover {
  color: var(--text-positive-secondary);
  background: var(--background-hover-wash);
}
[data-mw-tooltip-info]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
`;

/** The standard tooltip trigger: an info icon button carrying the house
 *  Information--Square--Filled glyph (v4.8.0). Use it as the Tooltip's single
 *  child so every product's info tooltip shares one icon and one voice:
 *  `<Tooltip content="…"><Tooltip.InfoTrigger label="Roof" /></Tooltip>`.
 *  Forwards the aria-describedby the Tooltip clones onto it, so the chip is
 *  announced with the button.
 *
 *  Exposed BOTH ways: the `Tooltip.InfoTrigger` static (ergonomic, for CLIENT
 *  consumers) and the `TooltipInfoTrigger` named export (works from server
 *  components too — a static attached to a "use client" component is stripped
 *  off the client-reference proxy when a server component imports it, so the
 *  named export is the boundary-safe form). */
export interface TooltipInfoTriggerProps
  extends Omit<ComponentPropsWithoutRef<"button">, "type"> {
  /** Accessible name for the info button. Default "More information". */
  label?: string;
  /** Icon pixel size. Default 16. */
  size?: number;
}

export function TooltipInfoTrigger({ label = "More information", size = 16, ...rest }: TooltipInfoTriggerProps) {
  return (
    <button type="button" data-mw-tooltip-info="" aria-label={label} {...rest}>
      <InformationSquareFilled size={size} />
    </button>
  );
}

Tooltip.InfoTrigger = TooltipInfoTrigger;

export interface TooltipProps {
  /** The chip text. A short clarifying phrase, never essential or interactive content. */
  content: ReactNode;
  /** The trigger. Must contain a focusable element (an icon button, a link) so keyboard users can summon the chip. */
  children: ReactNode;
  /** Hover intent delay in ms before the chip opens. Focus skips it and opens immediately. */
  delay?: number;
}

export function Tooltip({ content, children, delay = 300 }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseId = useId();
  const tipId = `${baseId}-tip`;

  const cancelPending = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Unmount: never leave a pending open timer armed.
  useEffect(() => cancelPending, [cancelPending]);

  // Escape closes. Claimed in the capture phase so the chip, the topmost
  // surface, dismisses first, and claimed WITH preventDefault per the house
  // overlay contract (useDialogOverlay and the kit's bubble-phase listeners
  // yield on defaultPrevented), so a parent overlay stays open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  const openAfterDelay = () => {
    cancelPending();
    timerRef.current = setTimeout(() => setOpen(true), delay);
  };

  const openNow = () => {
    cancelPending();
    setOpen(true);
  };

  const close = () => {
    cancelPending();
    setOpen(false);
  };

  // Descriptions do not cascade from a parent, so the aria-describedby must
  // sit on the focusable trigger itself. A single-element child gets the id
  // cloned on; anything else falls back to the wrapper (degraded for AT,
  // documented on the docs page).
  // v4.8.0 hydration fix: normalise through Children.toArray FIRST. Across the
  // RSC boundary a single child can arrive BARE on the server but ARRAY-WRAPPED
  // on the client; isValidElement(array) is false, so the two sides took
  // different branches and the wrapper's aria-describedby mismatched on
  // hydration (the /components warning). toArray canonicalises both sides to
  // the same shape, so server and client always agree on the single path.
  const childArray = Children.toArray(children);
  const single =
    childArray.length === 1 && isValidElement(childArray[0])
      ? (childArray[0] as ReactElement<{ "aria-describedby"?: string }>)
      : null;
  const trigger = single
    ? cloneElement(single, { "aria-describedby": tipId })
    : children;

  return (
    <>
      <style href="magentaweb-tooltip" precedence="default">
        {css}
      </style>
      <span
        ref={wrapperRef}
        data-mw-tooltip-trigger=""
        aria-describedby={single ? undefined : tipId}
        onPointerEnter={openAfterDelay}
        onPointerLeave={close}
        // React delegates onFocus / onBlur to focusin / focusout, so focus on
        // the focusable child inside the wrapper opens and closes the chip.
        onFocus={openNow}
        onBlur={close}
      >
        {trigger}
      </span>
      <TopLayerPanel
        open={open}
        anchor={wrapperRef}
        placement="below-center"
        // Tighter than TopLayerPanel's default 8px: the chip hugs its trigger
        // the way DropdownMenu's menu hugs its kebab.
        gap={4}
        mode="manual"
        // The host div must be as click-transparent as the chip, or the
        // invisible top layer steals hover and clicks in the chip's box
        // under the trigger while open or fading out.
        style={{ pointerEvents: "none" }}
      >
        <span id={tipId} role="tooltip" data-mw-tooltip="">
          {content}
        </span>
      </TopLayerPanel>
    </>
  );
}
