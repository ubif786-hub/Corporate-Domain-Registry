"use client";

import {
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { OverflowMenuVertical } from "@carbon/icons-react";
import { TopLayerPanel } from "@/components/nav/TopLayerPanel";

/* ============================================================
   DropdownMenu — the row / list-item action menu (the invoice edit / delete /
   view pattern). A ghost icon trigger opens a floating menu of actions.

   Top layer: the menu rides the shared TopLayerPanel (the Popover API top-layer
   host the Nav dropdown / mega already use), so it paints above any ancestor
   isolate / overflow / transform boundary with no z-index and no portal. This
   is the single top-layer mechanism; DropdownMenu adds the menu a11y semantics
   on top, it does not invent a second stack. TopLayerPanel runs in `manual`
   mode here: DropdownMenu owns dismissal (Escape, outside click, Tab, select)
   so it can place focus deterministically, the way Nav owns its own close.

   Trigger: a tertiary / ghost icon button (OverflowMenuVertical by default).
   Ghost at rest, a subtle square fill (--background-positive-secondary, shaped
   by --component-radius) on hover and while open. The system Button has no
   icon-only tertiary mode (it requires a label and renders the label-slide
   stack), so the trigger is built here; it stays a private sub-part rather than
   a second registered component (see REFACTOR_QUEUE: promote IconButton).

   Keyboard (WAI-ARIA menu button): ArrowDown / ArrowUp on the trigger open the
   menu onto the first / last item; Enter / Space also open onto the first. A
   pointer click opens onto the menu CONTAINER, so nothing reads as pre-selected
   (the item fill is :focus-visible, so a mouse-opened menu shows no highlight).
   Inside: ArrowDown / ArrowUp move (wrapping), Home / End jump, Enter / Space
   activate (native on the button item; the link item clicks itself on Space),
   Escape closes and returns focus to the trigger,
   Tab closes and returns focus to the trigger, outside click closes. Disabled
   items are skipped by arrow nav. Motion (the open / close fade) lives in
   TopLayerPanel and collapses under prefers-reduced-motion via the token reset.

   Two item kinds (26 Aug 2026). An ACTION item is a <button role="menuitem">.
   A LINK item (`href`) is a Next <Link role="menuitem">: a real <a href> in the
   DOM, so the native link affordances survive that a button routing through
   router.push threw away: ctrl / cmd-click and middle-click open a new tab,
   the status bar previews the URL, "copy link address" works, a crawler sees
   the destination. Plain activation closes the menu and navigates; a modified
   click passes through to the browser untouched and leaves the menu open, the
   Nav overlay's onOverlayNavClick precedent. Space clicks the link so the
   "Enter / Space activate" contract holds for both kinds. Link items are never
   prefetched: account menus are where sign-out endpoints live.

   Compound parts are NAMED EXPORTS (DropdownMenu, DropdownMenuItem), not static
   properties: a "use client" function's static props do not cross the App
   Router server / client boundary.
   ============================================================ */

type MenuAlign = "start" | "end";

interface MenuContextValue {
  close: (opts?: { restoreFocus?: boolean }) => void;
}

const MenuContext = createContext<MenuContextValue | null>(null);

const css = `
[data-mw-menu-trigger] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xs);
  background: transparent;
  border: 0;
  line-height: 0;
  color: var(--text-positive-secondary);
  cursor: pointer;
  border-radius: var(--component-radius);
  transition:
    background var(--motion-transition),
    color var(--motion-transition);
}
[data-mw-menu-trigger]:hover,
[data-mw-menu-trigger][aria-expanded="true"] {
  background: var(--background-positive-secondary);
  color: var(--text-positive-primary);
}
[data-mw-menu-trigger]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
/* The secondary trigger (v4.8.0): the outlined register matching Button's
   secondary variant (panel-surface fill + outline + primary ink), for a trigger
   sitting in a ROW of secondary Buttons — the app top bar's account control. It
   rides the app shell's canvas-flip (AppShell.tsx) like the sibling Buttons.
   It carries the sm Button's EXACT padding, and its content mirrors an
   icon+label sm Button (a leading glyph + the name + a chevron), so it matches
   that height and reads as one of the bar's controls. The name runs the same
   hover label-slide the Button does (the label-motion block below). */
[data-mw-menu-trigger][data-variant="secondary"] {
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--border-positive-secondary);
  background: var(--background-positive-secondary);
  color: var(--text-positive-primary);
}
[data-mw-menu-trigger][data-variant="secondary"]:hover,
[data-mw-menu-trigger][data-variant="secondary"][aria-expanded="true"] {
  background: var(--background-hover-wash);
  color: var(--text-positive-primary);
}
/* Trigger label motion: the account trigger's NAME runs the Button's hover
   label-slide (the primary text rises + fades while a clone rises from below to
   replace it), keyed off the trigger hover, so the control animates like its
   sibling Buttons. The trigger owns the dual-label markup (data-mw-menu-label,
   built in TopBarAccount). Font matches the sm Button label. */
[data-mw-menu-trigger] [data-mw-menu-label] {
  position: relative;
  display: inline-flex;
  overflow: hidden;
  max-width: 10rem;
  font-family: var(--font-body);
  font-size: var(--type-sm);
  font-weight: var(--weight-medium); /* the sm Button label weight; was inherited regular (typography audit, 23 Aug 2026) */
  line-height: var(--leading-tight);
  color: var(--text-positive-primary);
  vertical-align: bottom;
}
[data-mw-menu-trigger] [data-mw-menu-label-primary],
[data-mw-menu-trigger] [data-mw-menu-label-clone] {
  display: inline-block;
  max-width: 10rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition:
    transform var(--motion-transition),
    opacity var(--motion-transition);
}
[data-mw-menu-trigger] [data-mw-menu-label-clone] {
  position: absolute;
  left: 0;
  top: 0;
  transform: translateY(100%);
  opacity: 0;
}
[data-mw-menu-trigger]:hover [data-mw-menu-label-primary] {
  transform: translateY(-100%);
  opacity: 0;
}
[data-mw-menu-trigger]:hover [data-mw-menu-label-clone] {
  transform: translateY(0);
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  [data-mw-menu-trigger]:hover [data-mw-menu-label-primary],
  [data-mw-menu-trigger]:hover [data-mw-menu-label-clone] {
    transform: none;
  }
  [data-mw-menu-trigger]:hover [data-mw-menu-label-primary] { opacity: 1; }
  [data-mw-menu-trigger]:hover [data-mw-menu-label-clone] { opacity: 0; }
}

[data-mw-menu] {
  min-width: 11rem; /* menu surface floor: short menus keep a readable body rather than hugging one word */
  display: flex;
  flex-direction: column;
  outline: none; /* the container is focusable (tabIndex -1) for pointer-open; the ring lives on items */
  background: var(--background-positive-primary);
  border: 1px solid var(--border-positive-primary);
  border-radius: var(--component-radius);
  box-shadow: var(--shadow-raised);
  padding: var(--space-xs);
}

[data-mw-menu-item] {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  text-align: left;
  font-family: var(--font-body);
  font-size: var(--type-sm);
  /* The link item is an <a>: no underline (the Nav link precedent). Its weight
     and the rest of its type inherit exactly as the button item's do
     (tokens.css resets button to font: inherit), so nothing is pinned here and
     both kinds keep following the surface they sit on. */
  text-decoration: none;
  line-height: var(--leading-tight);
  color: var(--text-positive-secondary);
  background: transparent;
  border: 0;
  cursor: pointer;
  /* Shared menu-option rhythm (see Combobox): match the value-picker menus'
     density instead of the looser sm/md the action menu used to carry. */
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--component-radius);
  transition:
    background var(--motion-transition),
    color var(--motion-transition);
}
[data-mw-menu-item]:hover:not([aria-disabled="true"]) {
  background: var(--background-positive-secondary);
  color: var(--text-positive-primary);
}
/* Split from :hover (pass 3, 27 Aug 2026): keyboard focus adds the house ring,
   inset inside the item radius; the destructive rule below sets only its own
   inks and inherits this ring. A combined selector would paint the ring on
   mouse hover. */
[data-mw-menu-item]:focus-visible:not([aria-disabled="true"]) {
  background: var(--background-positive-secondary);
  color: var(--text-positive-primary);
  outline: var(--focus-outline);
  outline-offset: -2px;
}
[data-mw-menu-item][data-destructive="true"] {
  color: var(--menu-item-destructive-fg);
}
[data-mw-menu-item][data-destructive="true"]:hover:not([aria-disabled="true"]),
[data-mw-menu-item][data-destructive="true"]:focus-visible:not([aria-disabled="true"]) {
  background: var(--menu-item-destructive-hover-bg);
  color: var(--menu-item-destructive-fg);
}
[data-mw-menu-item][aria-disabled="true"] {
  opacity: 0.5;
  cursor: not-allowed;
}
[data-mw-menu-item-icon] {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}
`;

export interface DropdownMenuProps {
  /** Accessible name for the icon-only trigger and the menu (e.g. "Row actions"). */
  label: string;
  /** DropdownMenuItem children. */
  children: ReactNode;
  /** Edge the menu aligns to under the trigger. "end" (default) suits row actions at the right edge. */
  align?: MenuAlign;
  /** Glyph inside the trigger button. Defaults to the three-dot overflow icon. */
  triggerIcon?: ReactNode;
  /** Trigger register: "ghost" (default, the quiet icon trigger) or "secondary"
   *  (v4.8.0) — the outlined Button-secondary look for triggers sitting in a
   *  row of secondary controls (the app top bar's account control). */
  triggerVariant?: "ghost" | "secondary";
}

export function DropdownMenu({
  label,
  children,
  align = "end",
  triggerIcon,
  triggerVariant = "ghost",
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Which end to land focus on when the menu opens (ArrowUp on the trigger lands last).
  const pendingFocus = useRef<"first" | "last">("first");
  // How the menu was opened. A keyboard open — an ARROW key on the trigger, or
  // Enter/Space (which arrive as a detail-0 click) — lands focus on the first/last
  // item, and :focus-visible then shows the fill. A pointer click lands focus on the
  // menu CONTAINER, so no item reads as pre-selected; with the :focus-visible fill,
  // a mouse-opened menu shows no highlight at all.
  const openedVia = useRef<"arrow" | "other">("other");
  const baseId = useId();
  const menuId = `${baseId}-menu`;

  const getItems = useCallback((): HTMLElement[] => {
    const root = menuRef.current;
    if (!root) return [];
    return Array.from(
      root.querySelectorAll<HTMLElement>('[data-mw-menu-item]:not([aria-disabled="true"])'),
    );
  }, []);

  const close = useCallback((opts?: { restoreFocus?: boolean }) => {
    setOpen(false);
    if (opts?.restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  // On open, move focus into the menu. Keyboard-opened (an arrow key, or Enter/Space
  // via a detail-0 click): land on the first item (or last for ArrowUp) — the
  // WAI-ARIA menu-button behaviour. A pointer click: land on the menu CONTAINER so
  // no item reads as pre-selected.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      if (openedVia.current === "arrow") {
        const items = getItems();
        const target = pendingFocus.current === "last" ? items[items.length - 1] : items[0];
        (target ?? menuRef.current)?.focus();
      } else {
        menuRef.current?.focus();
      }
      pendingFocus.current = "first";
      openedVia.current = "other";
    });
    return () => cancelAnimationFrame(id);
  }, [open, getItems]);

  // Outside click closes (focus follows the click, so no restore). Capture phase so
  // it runs before the target's own handlers; the listener attaches after open, so
  // it never catches the click that opened the menu.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      openedVia.current = "arrow";
      pendingFocus.current = "first";
      setOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      openedVia.current = "arrow";
      pendingFocus.current = "last";
      setOpen(true);
    }
  };

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close({ restoreFocus: true });
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      close({ restoreFocus: true });
      return;
    }
    const items = getItems();
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLElement);
    let next: number;
    if (e.key === "ArrowDown") next = idx < 0 ? 0 : (idx + 1) % items.length;
    else if (e.key === "ArrowUp") next = idx < 0 ? items.length - 1 : (idx - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    items[next]?.focus();
  };

  const ctx: MenuContextValue = { close };

  return (
    <>
      <style href="magentaweb-dropdown-menu" precedence="default">
        {css}
      </style>
      <button
        ref={triggerRef}
        type="button"
        data-mw-menu-trigger=""
        data-variant={triggerVariant === "secondary" ? "secondary" : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={label}
        onClick={(e) => {
          // Keyboard-activated clicks (Enter/Space on the button) report detail 0 —
          // treat them as a keyboard open onto the first item, like ArrowDown (WAI-ARIA).
          // A real pointer click (detail > 0) opens onto the container so nothing looks
          // pre-selected.
          openedVia.current = e.detail === 0 ? "arrow" : "other";
          setOpen((o) => !o);
        }}
        onKeyDown={onTriggerKeyDown}
      >
        {triggerIcon ?? <OverflowMenuVertical size={20} aria-hidden="true" />}
      </button>
      <TopLayerPanel
        open={open}
        anchor={triggerRef}
        placement={align === "end" ? "below-end" : "below-start"}
        // Tighter than TopLayerPanel's default 8px: a row-actions menu hugs its
        // kebab, unlike the nav panels that clear a padded bar (audit F22).
        gap={4}
        mode="manual"
      >
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          data-mw-menu=""
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
        >
          <MenuContext.Provider value={ctx}>{children}</MenuContext.Provider>
        </div>
      </TopLayerPanel>
    </>
  );
}

export interface DropdownMenuItemProps {
  /** The item label. */
  children: ReactNode;
  /** Optional leading icon (a ReactNode, e.g. a Carbon icon). Omitted when not given. */
  icon?: ReactNode;
  /** Destination: the item renders as a real link (Next <Link role="menuitem">),
   *  so it keeps the native link affordances (new tab on a modified click, URL
   *  preview, copy link address). Internal paths route client-side; absolute
   *  URLs do a full navigation. Never prefetched, so a sign-out endpoint is safe
   *  here. With `disabled` the item renders as the inert button instead. */
  href?: string;
  /** Fired on activation (click, Enter, or Space). The menu then closes. On a
   *  link item a modified click (new tab) passes through to the browser and does
   *  not fire it. */
  onClick?: () => void;
  /** Danger styling for destructive actions (delete). */
  destructive?: boolean;
  /** Non-interactive and skipped by arrow navigation. */
  disabled?: boolean;
}

export function DropdownMenuItem({
  children,
  icon,
  href,
  onClick,
  destructive = false,
  disabled = false,
}: DropdownMenuItemProps) {
  const ctx = useContext(MenuContext);

  const body = (
    <>
      {icon ? (
        <span data-mw-menu-item-icon="" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </>
  );

  // The link item. A disabled item never becomes a link: an anchor cannot be
  // disabled, and a dimmed <a href> could still be middle-clicked open.
  if (href && !disabled) {
    const onLinkClick = (e: MouseEvent<HTMLAnchorElement>) => {
      // Modified or non-primary clicks (new tab, new window) pass through to the
      // browser untouched and leave the menu open (Nav's onOverlayNavClick
      // precedent). Next's Link runs the same check before it intercepts, so the
      // SPA push only ever runs for a plain left click, after this handler.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      onClick?.();
      ctx?.close({ restoreFocus: true });
    };
    const onLinkKeyDown = (e: KeyboardEvent<HTMLAnchorElement>) => {
      // Enter activates a link natively; Space does not. The menu contract is
      // "Enter / Space activate", so Space clicks the link (and never scrolls).
      if (e.key === " ") {
        e.preventDefault();
        e.currentTarget.click();
      }
    };
    return (
      <Link
        href={href}
        role="menuitem"
        data-mw-menu-item=""
        data-destructive={destructive ? "true" : "false"}
        tabIndex={-1}
        // Never prefetched. The panel sits in the DOM while closed and these are
        // account-level destinations, which is where sign-out endpoints live
        // (tears-of-elune points an item at /api/auth/logout). A viewport or
        // hover prefetch of that href would sign the person out on menu open.
        prefetch={false}
        onClick={onLinkClick}
        onKeyDown={onLinkKeyDown}
      >
        {body}
      </Link>
    );
  }

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    ctx?.close({ restoreFocus: true });
  };

  return (
    <button
      type="button"
      role="menuitem"
      data-mw-menu-item=""
      data-destructive={destructive ? "true" : "false"}
      aria-disabled={disabled ? "true" : undefined}
      tabIndex={-1}
      onClick={handleClick}
    >
      {body}
    </button>
  );
}
