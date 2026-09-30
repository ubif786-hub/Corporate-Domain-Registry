"use client";

import {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  RefObject,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "@carbon/icons-react";
import { Button } from "@/components/Button";
import { Container } from "@/components/Container";
import { OverlayMotion } from "@/components/motion/OverlayMotion";
import { TopLayerPanel } from "@/components/nav/TopLayerPanel";
import { useDialogOverlay } from "@/components/useDialogOverlay";
import { logoHomeLinkStyle, logoPlaceholderStyle, srOnly, tokenNumber } from "@/components/internal/styles";

/* ============================================================
   Nav — production primary navigation. Sticky top bar with logo,
   centered link row (desktop), optional CTA, and a hamburger that
   reveals a full-screen overlay below --mw-bp-desktop (1024px).
   Three link types: link, dropdown (single-column menu), mega
   (multi-column panel).

   Threshold rationale: collapsing below 1024 rather than 768 keeps
   the bar from running out of room when 4+ links + dropdowns + CTA
   compete for inline space at tablet widths; the previous floor on
   the centered <ul> at 768-1023 was the horizontal-scroll source the
   rebuild eliminates. Above 1024 the desktop row is shown; below it
   the link row is display:none and the hamburger appears.

   Closed-state untabbability: the overlay is `inert` when closed.
   inert removes every descendant from sequential focus AND from the
   accessibility tree, so Tab cannot land inside an invisible overlay
   and screen readers skip it. role=dialog + aria-modal=true stay so
   it announces correctly when opened. No aria-hidden (inert subsumes
   it and avoids the aria-hidden + focusable descendants violation).

   Dismissal from inside the dialog (ARIA APG dialog pattern, 4.1.2):
   aria-modal confines a screen reader's virtual cursor to the dialog
   subtree, and the bar toggle is a SIBLING of the dialog, so from inside
   it is not perceivable and iOS has no Escape key. The dialog therefore
   carries its own dismiss as its FIRST child: the srOnly recipe until
   keyboard focus below the desktop breakpoint (the bottom toggle stays
   the visible close, so no mobile layout changed), and on the desktop
   menu bar the centered X is the one close, so the hidden dismiss steps
   aside there. The toggle keeps its bar grid track and stagger index.

   Breakpoint crossing: the links bar hides both the overlay and the
   toggle at desktop, so an overlay left open across a crossing (an iPad
   rotating with the menu up) would keep the body lock and the focus trap
   with nothing on screen to explain them. Nav subscribes to the desktop
   query and closes the overlay on the crossing, during render.

   Scroll lock: two layers. data-lenis-prevent="" on the overlay tells
   Lenis (the project's smooth-scroll primitive) to skip wheel events
   inside the overlay so it scrolls natively, while overflow:hidden on
   document.body prevents the page underneath from scrolling at all.
   prevOverflow is captured-then-restored on cleanup so an outer caller
   that locked the body for its own reasons (a future Modal) is not
   trampled when this overlay closes. Cleanup runs on close AND on
   unmount-while-open, so the lock is always released.

   Motion is fully tokenized:
     - bar mount stagger reveal     -> --motion-reveal-duration + --motion-stagger
     - dropdown / mega open         -> --motion-transition (= --motion-duration + --motion-ease)
     - dropdown / mega item stagger -> --motion-reveal-duration + --motion-stagger
     - underline + chevron + hover  -> --motion-transition
     - overlay backdrop fade        -> --motion-duration + --motion-ease
     - overlay frame draw           -> --motion-duration + --frame-weight
     - overlay item stagger         -> --motion-reveal-duration + --motion-stagger
     - accordion 0fr -> 1fr trick   -> --motion-duration + --motion-ease
     - hamburger 3-bar -> X morph   -> --motion-duration + --motion-ease
   The motion dial flips the underlying tokens together so feel is one
   personality choice; data-motion="still" zeroes durations so every
   transition above resolves to 0ms. prefers-reduced-motion is handled
   globally in tokens.css (token reset + universal !important rule).
   ============================================================ */

type NavLinkLink = { type: "link"; label: string; href: string };
type NavLinkDropdown = {
  type: "dropdown";
  label: string;
  items: { label: string; href: string }[];
};
type NavLinkMega = {
  type: "mega";
  label: string;
  categories: {
    heading: string;
    items: { label: string; href: string }[];
  }[];
};
export type NavLink = NavLinkLink | NavLinkDropdown | NavLinkMega;

type NavCtaVariant = "primary" | "secondary";

export interface NavProps {
  cta?: { label: string; href: string; variant?: NavCtaVariant };
  links: NavLink[];
  logo?: ReactNode;
  /** The narrow-width logo, shown BELOW --mw-bp-tablet in place of `logo`. Pass the SYMBOL.
   *
   *  A horizontal lockup is the wrong asset for a phone bar: it shares that row with a CTA and
   *  the menu toggle, and the wider the client's artwork the less room the other two get. The
   *  studio's own 8.6:1 lockup measured 47% of a 390px viewport on 17 Sep 2026. A symbol is
   *  square-ish whatever the brand, so it always fits, and a visitor on a phone learns the name
   *  from the page rather than from the bar (owner's call, same day).
   *
   *  Optional and BACKWARD COMPATIBLE: unset, the narrow bar keeps rendering `logo`, bounded by
   *  the same box. Both nodes render and CSS picks one, rather than a JS breakpoint, so there is
   *  no hydration mismatch and no layout shift on first paint. */
  logoCompact?: ReactNode;
  /** Where the logo links. Every logo is a home link by convention; default "/". */
  logoHref?: string;
  /** Accessible name for the logo home link, appended visually-hidden INSIDE it.
   *  Default "Home". It is a prop and not a hardcoded string because the value is
   *  user-facing text, and a site in Spanish should not announce an English word. */
  homeLabel?: string;

  /** Mobile overlay personality. "quiet" (default): backdrop fade + staggered
   *  items with the orchestrated reverse-then-navigate close. "contained": the
   *  expressive variant for artsy brands; a --frame-weight border draws corner
   *  to corner on all four sides between the backdrop and the items, and the
   *  close retracts it in reverse. The "plain"/"framed" aliases (A-049 intent
   *  rename) were REMOVED at v5.0.0. */
  overlay?: "quiet" | "contained";
  /** Bar anatomy. "links" (default): the desktop bar carries the link row
   *  (+ optional CTA); the overlay is mobile-only. "menu": the desktop bar is
   *  logo + CTA + a menu button, and the SAME fullscreen overlay serves every
   *  width, with links centered and a centered close control that arrives
   *  last (the roseyseas pattern). Mobile behaves identically in both. */
  bar?: "links" | "menu";
  /** Square brand mark in the fullscreen overlay, a home link like the logo
   *  (it links to logoHref). One layout rule at every width: it sits below
   *  the link list, centered in the leftover room with equal space above and
   *  below, so the menu reads as three beats: links, emblem, close (the
   *  bottom toggle on mobile, the centered close control on the desktop menu
   *  bar). Placeholder square when unset. */
  emblem?: ReactNode;
  /** Heading level of the mega-menu category headings (the desktop hover panel and the mobile
   *  overlay's expanded groups). Default 3, unchanged; pass 2 on a page whose outline wants the
   *  navigation groups at section level. (v5.6.0; was a fixed h3.) */
  megaHeadingLevel?: 2 | 3;
}

const CLOSE_DELAY_MS = 100;

/* Focus-trap config for the mobile overlay, passed to useDialogOverlay.
   The selector excludes the skip-to-main link: escape-hatch chrome that per
   WAI dialog guidance should not be cycle-reachable while the dialog is open.
   It is Nav's OWN variant (no form fields: the overlay carries none), extended
   in pass 3 (27 Aug 2026) with the kinds Modal's selector gained in the same
   pass: iframe, editable regions, media with controls, and summary, so the
   trap computes its "last" from the full set instead of wrapping over an
   embed. That fixed REACHABILITY, not containment: a keydown inside an iframe
   never reaches this window listener, so focus walks out of the trap from
   there. Pass 4 (27 Aug 2026) landed both of that note's queued items, and
   NEITHER changes this string. The shared default is now
   DIALOG_FOCUSABLE_SELECTOR in useDialogOverlay, which Modal, Lightbox,
   CommandPalette and AppShell's drawer take; Nav still overrides it here for
   the skip-link exclusion. Containment is the internal/FocusSentinel pair at
   a trap root's edges, and Nav gets NO pair: its overlay renders typed link
   data and a {label, href} CTA, so no sanctioned shape puts an embed in it
   (logo and emblem are ReactNode, but they render inside home links). Should
   one ever arrive, add the pair here too; the hook's getFocusables already
   filters [data-mw-focus-sentinel] for THIS selector as well, since
   [tabindex]:not([tabindex="-1"]) below would otherwise match a sentinel.
   navOverlayIsRendered walks the ancestor chain for display:none because the
   desktop link row is display:none below 1024, and getComputedStyle /
   getClientRects on a descendant of a display:none ancestor can still report
   it as rendered, so the ancestor walk is what robust focus-trap libraries do. */
const NAV_OVERLAY_FOCUSABLE_SELECTOR =
  'a[href]:not([data-mw-nav-skip]), button:not([disabled]), [tabindex]:not([tabindex="-1"]), iframe, [contenteditable]:not([contenteditable="false"]), audio[controls], video[controls], details > summary';

const navOverlayIsRendered = (el: HTMLElement) => {
  let cur: HTMLElement | null = el;
  while (cur) {
    if (window.getComputedStyle(cur).display === "none") return false;
    cur = cur.parentElement;
  }
  return true;
};

/* The desktop breakpoint as a live subscription (the AppShell pattern), read
   at render time through useSyncExternalStore so the crossing guard in Nav can
   adjust state during render instead of in an effect. 1023.98 mirrors the
   sheet's max-width rule so the boundary sits exactly at --mw-bp-desktop. The
   server snapshot is desktop (false); a narrow client re-renders to true right
   after hydration, which the guard treats as a non-event. */
const NARROW_QUERY = "(max-width: 1023.98px)"; /* --mw-bp-desktop */
const subscribeNarrow = (onChange: () => void) => {
  const m = window.matchMedia(NARROW_QUERY);
  m.addEventListener("change", onChange);
  return () => m.removeEventListener("change", onChange);
};
const getNarrow = () => window.matchMedia(NARROW_QUERY).matches;
const getNarrowServer = () => false;

/* The srOnly recipe as sheet text for the in-dialog dismiss. It has to live
   in the sheet, not inline: an inline srOnly beats every stylesheet rule, so
   the :focus-visible state that reveals the control could never win without
   !important. Serialized from the shared helper so the recipe has one source. */
const srOnlyCss = Object.entries(srOnly)
  .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}: ${v};`)
  .join(" ");

/* Stable per-route identity for View Transitions (Phase 5). The desktop trigger
   and its mobile-overlay twin share one name; safe because the hard @media switch
   at --mw-bp-desktop (1024) renders only one of the pair at a time, so the name is
   never duplicated within a single transition snapshot. */
const routeTransitionName = (label: string) =>
  `mw-nav-route-${label.toLowerCase().replace(/\s+/g, "-")}`;

interface NavPanelLinkProps {
  link: NavLinkDropdown | NavLinkMega;
  staggerIndex: number;
  isOpen: boolean;
  barInnerRef: RefObject<HTMLDivElement | null>;
  onOpen: () => void;
  onScheduleClose: () => void;
  onCancelClose: () => void;
  /** Immediate close (Escape from inside the panel); no hover-intent delay. */
  onCloseNow: () => void;
  onToggle: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  megaHeadingLevel: 2 | 3;
}

/* One dropdown/mega menu item. Owns its trigger ref (the dropdown's anchor); the
   mega anchors to the shared bar-inner ref instead, so it bounds and right-aligns
   to the bar (placement below-end, matchAnchorWidth caps it to the bar width). Both
   panels render via TopLayerPanel (top layer), driven by the parent's openIndex; the
   hover-intent timer, the hover bridge, and the item stagger carry over from the
   inline version, now keyed off :popover-open instead of a [data-open] attribute. */
function NavPanelLink({
  link,
  staggerIndex,
  isOpen,
  barInnerRef,
  onOpen,
  onScheduleClose,
  onCancelClose,
  onCloseNow,
  onToggle,
  onKeyDown,
  megaHeadingLevel,
}: NavPanelLinkProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const isMega = link.type === "mega";
  const MegaHeading = `h${megaHeadingLevel}` as const;

  return (
    /* Keyboard parity with the hover-intent model (audit): Escape closes an
       open panel from anywhere inside it and returns focus to the trigger;
       focus leaving the whole item schedules the same close mouseleave does. */
    <li
      onMouseEnter={onOpen}
      onMouseLeave={onScheduleClose}
      onKeyDown={(e) => {
        if (e.key === "Escape" && isOpen) {
          e.stopPropagation();
          onCloseNow();
          triggerRef.current?.focus();
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          onScheduleClose();
        }
      }}
    >
      {/* aria-expanded alone: the panel is a disclosure of links (a plain list, no
          role="menu", no arrow keys), so no aria-haspopup, which maps to "menu" and
          would promise that pattern (pass 3, 27 Aug 2026). */}
      <button
        ref={triggerRef}
        type="button"
        data-mw-nav-link-trigger=""
        data-mw-nav-staggered=""
        data-open={isOpen ? "true" : "false"}
        aria-expanded={isOpen}
        style={{ "--stagger-index": staggerIndex }}
        onClick={onToggle}
        onKeyDown={onKeyDown}
        onFocus={onOpen}
      >
        <span>{link.label}</span>
        <ChevronDown size={14} aria-hidden="true" data-mw-nav-chevron="" />
      </button>

      {/* Phase-5 curtain ordering: every nav floating surface now lives in the top
          layer, so a future page-transition curtain (itself top layer) has one
          relationship to negotiate (paint order by show time), not a scatter of
          z-index:200 inline panels. The mobile overlay stays inline-fixed by design
          (it closes on navigation, so it is never co-present with a curtain). */}
      <TopLayerPanel
        open={isOpen}
        anchor={isMega ? barInnerRef : triggerRef}
        placement={isMega ? "below-end" : "below-start"}
        matchAnchorWidth={isMega}
        mode="manual"
        style={isMega ? megaPanelStyle : undefined}
      >
        {link.type === "dropdown" ? (
          <div data-mw-nav-dropdown="" onMouseEnter={onCancelClose}>
            <ul style={dropdownListStyle} role="list">
              {link.items.map((item, j) => (
                <li
                  key={`${item.href}-${j}`}
                  data-mw-nav-dropdown-item=""
                  style={{ "--item-index": j }}
                >
                  <Link href={item.href}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div data-mw-nav-mega="" onMouseEnter={onCancelClose}>
            <div style={megaGridStyle}>
              {link.categories.map((cat, ci) => (
                <div
                  key={`${cat.heading}-${ci}`}
                  data-mw-nav-mega-col=""
                  style={{ "--col-index": ci }}
                >
                  <MegaHeading style={megaHeadingStyle}>{cat.heading}</MegaHeading>
                  <ul style={megaListStyle} role="list">
                    {cat.items.map((item, j) => (
                      <li
                        key={`${item.href}-${j}`}
                        data-mw-nav-mega-item=""
                        style={{ "--item-index": j }}
                      >
                        <Link href={item.href}>{item.label}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </TopLayerPanel>
    </li>
  );
}

export function Nav({ cta, links, logo, logoCompact, logoHref = "/", homeLabel = "Home", overlay = "quiet", bar = "links", emblem, megaHeadingLevel = 3 }: NavProps) {
  // The "plain"/"framed" aliases (A-049) were removed at v5.0.0, so the prop is
  // already canonical; the local name is kept so downstream reads unchanged.
  const overlayKind: "quiet" | "contained" = overlay;
  const [mounted, setMounted] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Drives the toggle's out-in cycle: "idle" until the first open, so the
  // close-side animation never plays on page load.
  const [everOpened, setEverOpened] = useState(false);
  if (mobileOpen && !everOpened) setEverOpened(true);
  const [mobileExpanded, setMobileExpanded] = useState<number | null>(null);
  /* Document ids from useId, so several Navs on one page (the docs page mounts
     the hero demo, a live variant and the playground) never share an id and
     every aria-controls resolves to its own overlay and accordion group. */
  const baseId = useId();
  const dialogId = `${baseId}-dialog`;
  const isNarrow = useSyncExternalStore(subscribeNarrow, getNarrow, getNarrowServer);
  const closeTimerRef = useRef<number | null>(null);
  const navTimerRef = useRef<number | null>(null);
  const router = useRouter();
  const navRef = useRef<HTMLElement | null>(null);
  // Anchor for the mega's JS positioner: the bar's inner row, so the mega bounds
  // and right-aligns to the bar width rather than the viewport.
  const barInnerRef = useRef<HTMLDivElement | null>(null);
  // Active-route marking, mirroring DocsBar/DocsDrawer (A-040).
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  // Release the route-fade AFTER the new page has painted at opacity 0, so
  // removing the attribute plays the fade-in; also released on unmount so a
  // torn-down Nav never strands a dimmed page.
  useEffect(() => {
    document.documentElement.removeAttribute("data-mw-nav-routing");
    return () => document.documentElement.removeAttribute("data-mw-nav-routing");
  }, [pathname]);

  // A-038: clear a pending hover-close and a pending orchestrated navigation on
  // unmount. Without this, a timer firing just after teardown would setOpenIndex
  // or router.push from an unmounted Nav.
  // The refs are stable, so the empty dep array needs no other entries.
  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
      if (navTimerRef.current !== null) {
        window.clearTimeout(navTimerRef.current);
      }
    };
  }, []);

  /* Mobile overlay scroll lock + Escape close + Tab focus trap, via the shared
     overlay contract. The trap root is the whole <nav> so the toggle/close X
     stays cycle-reachable; Nav does NOT focus into the dialog on open (no
     initialFocusRef), so focus stays on the toggle. The hook re-queries the
     focusable set per Tab, so the accordion sub-links are picked up as they
     expand. No background inert and the body lock is unconditional (defaults). */
  useDialogOverlay({
    open: mobileOpen,
    trapRef: navRef,
    focusableSelector: NAV_OVERLAY_FOCUSABLE_SELECTOR,
    isFocusable: navOverlayIsRendered,
    onClose: () => setMobileOpen(false),
  });

  const cancelClose = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(
      () => setOpenIndex(null),
      CLOSE_DELAY_MS,
    );
  };
  const openPanel = (i: number) => {
    cancelClose();
    setOpenIndex(i);
  };

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpenIndex(openIndex === i ? null : i);
    } else if (e.key === "Escape") {
      setOpenIndex(null);
    }
  };

  /* Backdrop dismiss: fires when the click lands on the overlay itself or on
     the stretched inner column (the inner now fills the room so the emblem's
     auto margins can center it, so empty space above and below the emblem
     belongs to the inner, not the dialog). Lets the user tap empty space to
     close; clicks on real content never match either element. */
  const onOverlayBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target === e.currentTarget || target.hasAttribute("data-mw-nav-dialog-inner")) {
      setMobileOpen(false);
    }
  };

  /* Reads a ms-valued motion token off :root ("416ms" -> 416, "0.4s" -> 400).
     The overlay's reverse choreography runs in CSS transition-delays; this
     mirrors its total so the route push fires as the backdrop lands. */
  const tokenMs = (name: string) => {
    const v = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    const n = parseFloat(v);
    if (Number.isNaN(n)) return 0;
    return v.endsWith("ms") ? n : n * 1000;
  };

  /* Items (links + CTA + emblem) in the overlay, for the reverse stagger and
     the close total. The emblem always renders (placeholder when unset), so
     it always counts. Mirrored to CSS as --overlay-count on the dialog. */
  const overlayCount = links.length + (cta ? 1 : 0) + 1;
  /* The emblem arrives last of the content items (after links and CTA), one
     beat before the menu-bar close control at index overlayCount; on close it
     leaves first, the last-in-first-out rule the item delays already run. */
  const emblemStagger = links.length + (cta ? 1 : 0);

  /* Overlay navigation is ORCHESTRATED: a route-changing click starts the
     reverse choreography (items stagger out, the frame retracts, the backdrop
     fades) and the route push fires as it completes, so the menu exits over the
     old page and the new one arrives under a finished close. Clicks that cannot
     change pathname (hash jump, same-route) just close: there is nothing to
     mask. Modified clicks (new tab, middle click) pass through untouched. The
     delay formula mirrors the CSS exactly: items exit spread + backdrop delay
     (1.5x duration) + backdrop fade (1x duration). Still motion = 0ms = instant. */
  const onOverlayNavClick = (
    e: MouseEvent<HTMLElement>,
    href: string,
  ) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const targetPath = href.split(/[?#]/)[0];
    if (targetPath === "" || targetPath === pathname) {
      setMobileOpen(false);
      return;
    }
    e.preventDefault();
    if (navTimerRef.current !== null) return; // already closing toward a route
    setMobileOpen(false);
    // Route orchestration through the frosted overlay: the OLD page fades out
    // beneath the glass while the menu closes, and the attribute's removal
    // (on pathname commit, below) fades the NEW page in. html-level so the
    // sheet can reach the route content outside the nav subtree.
    document.documentElement.setAttribute("data-mw-nav-routing", "");
    // Mirrors the CSS close totals: the toggle's lead beat (glyph morph +
    // button fade, one duration), then items exit spread + backdrop delay +
    // backdrop fade. The contained variant waits one extra frame-retract beat.
    const total =
      tokenMs("--motion-duration") +
      ((overlayCount - 1) * tokenMs("--motion-stagger")) / 2 +
      tokenMs("--motion-duration") * (overlayKind === "contained" ? 2.5 : 1.5);
    navTimerRef.current = window.setTimeout(() => {
      navTimerRef.current = null;
      router.push(href);
    }, total);
  };

  /* Close on route commit, during render (the sanctioned adjust-state-on-prop-change
     pattern; an effect would set state post-paint and trip react-hooks/set-state-in-effect).
     pathname only changes once the new page has rendered beneath the overlay, so the
     overlay's fade-out reveals the new page, never the old one. */
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
    setMobileExpanded(null);
    setOpenIndex(null);
  }

  /* Close on a crossing INTO desktop, the same render-time pattern. Links bar
     only: its overlay and toggle are both display:none at desktop, so an
     overlay left open there strands the body lock and the focus trap with no
     visible cause. The menu bar serves the overlay at every width, so it stays
     open across the crossing. */
  const [lastNarrow, setLastNarrow] = useState(isNarrow);
  if (isNarrow !== lastNarrow) {
    setLastNarrow(isNarrow);
    if (!isNarrow && bar === "links") setMobileOpen(false);
  }

  /* Stagger sequence: logo (0), each link (1..N), CTA (N+1, only when present),
     hamburger last. No index is reserved for an absent CTA, so the hamburger's
     delay always follows the last rendered item. */
  let stagger = 0;
  const logoStagger = stagger++;
  const linkStaggerStart = stagger;
  stagger += links.length;
  const ctaStagger = cta ? stagger++ : 0;
  const hamburgerStagger = stagger++;

  return (
    <nav
      ref={navRef}
      data-mw-nav=""
      data-mounted={mounted ? "true" : "false"}
      data-mobile-open={mobileOpen ? "true" : "false"}
      data-menu-state={mobileOpen ? "open" : everOpened ? "closing" : "idle"}
      data-overlay={overlayKind}
      data-bar={bar}
      aria-label="Primary"
      style={{ ...navStyle, "--overlay-count": overlayCount }}
    >
      <style href="magentaweb-nav" precedence="default">{navCss}</style>
      {/* The overlay open/close choreography (surface fade, item stagger, LIFO
          close) rides the shared OverlayMotion preset; Nav feeds it knobs. */}
      <OverlayMotion />

      <a href="#main" data-mw-nav-skip="">
        Skip to main content
      </a>

      <Container size="lg">
        <div
          data-mw-nav-inner=""
          data-has-cta={cta ? "true" : "false"}
          ref={barInnerRef}
          style={innerStyle}
        >
          <div
            data-mw-nav-staggered=""
            data-mw-nav-logo-slot=""
            style={{ ...logoSlotStyle, "--stagger-index": logoStagger }}
          >
            {/* The home label is a visually-hidden CHILD, not an aria-label.
                aria-label REPLACES the accessible name, so when the logo slot holds a
                visible wordmark the name became "Home" and the visible text was not in
                it: WCAG 2.5.3 Label in Name (Level A), which is what voice control
                uses to match "click ZAFIRO". As a child it is APPENDED, so the name
                contains the wordmark and is still non-empty for an icon-only logo. */}
            <Link href={logoHref} data-mw-nav-logo-link="" style={logoHomeLinkStyle}>
              {/* Both marks render and CSS shows one. A JS breakpoint would mismatch on
                  hydration and swap the logo in front of the visitor on first paint.
                  data-mw-nav-logo-full carries the wide lockup; -compact the symbol. When no
                  compact node is given the full one keeps the narrow bar, which is what every
                  fork did before this prop existed. */}
              <span data-mw-nav-logo-full={logoCompact ? "swap" : "only"}>
                {logo ?? <div style={logoPlaceholderStyle} />}
              </span>
              {logoCompact ? <span data-mw-nav-logo-compact="">{logoCompact}</span> : null}
              <span style={srOnly}>{homeLabel}</span>
            </Link>
          </div>

          <ul style={linksStyle} data-mw-nav-desktop="" role="list">
            {links.map((link, i) => {
              const idx = linkStaggerStart + i;

              if (link.type === "link") {
                return (
                  <li
                    key={`${link.label}-${i}`}
                    data-mw-nav-staggered=""
                    style={{ "--stagger-index": idx }}
                  >
                    <Link
                      href={link.href}
                      data-mw-nav-link-trigger=""
                      aria-current={isActive(link.href) ? "page" : undefined}
                      style={{ viewTransitionName: routeTransitionName(link.label) }}
                    >
                      <span>{link.label}</span>
                    </Link>
                  </li>
                );
              }

              // Dropdown + mega render their panels in the top layer via
              // NavPanelLink, so an ancestor stacking context (the /components
              // showroom isolate frame) can no longer trap them: the bleed-through
              // is structurally gone, no z-index tuning needed.
              return (
                <NavPanelLink
                  key={`${link.label}-${i}`}
                  link={link}
                  staggerIndex={idx}
                  isOpen={openIndex === i}
                  barInnerRef={barInnerRef}
                  onOpen={() => openPanel(i)}
                  onScheduleClose={scheduleClose}
                  onCancelClose={cancelClose}
                  onCloseNow={() => setOpenIndex(null)}
                  onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                  onKeyDown={(e) => onTriggerKeyDown(e, i)}
                  megaHeadingLevel={megaHeadingLevel}
                />
              );
            })}
          </ul>

          {/* Rendered only when a CTA exists. An always-rendered empty slot kept
              its grid track alive, and the track's gaps read as a phantom space
              after the last link on no-CTA bars; the template drops the track
              too, via data-has-cta above. */}
          {cta ? (
            <div
              data-mw-nav-staggered=""
              data-mw-nav-cta-slot=""
              style={{ ...ctaSlotStyle, "--stagger-index": ctaStagger }}
            >
              <Button variant={cta.variant ?? "primary"} size="md" href={cta.href}>
                {cta.label}
              </Button>
            </div>
          ) : null}

          <button
            type="button"
            data-mw-nav-toggle=""
            data-mw-nav-staggered=""
            data-open={mobileOpen ? "true" : "false"}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls={dialogId}
            style={{ "--stagger-index": hamburgerStagger }}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span data-mw-nav-toggle-bar="" data-pos="top" aria-hidden="true" />
            <span data-mw-nav-toggle-bar="" data-pos="middle" aria-hidden="true" />
            <span data-mw-nav-toggle-bar="" data-pos="bottom" aria-hidden="true" />
          </button>
        </div>
      </Container>

      {/* Full-screen overlay, inline (not portaled). z-stack: overlay =
          --z-overlay, close toggle = --z-overlay-control (one rung up so the X
          stays tappable while the overlay occludes the rest of the bar). inert
          when closed = subtree removed from tab
          order + accessibility tree while opacity/transform still animate;
          role=dialog + aria-modal=true announce the dialog to AT when open.
          Backdrop dismiss fires on clicks landing on the overlay element
          itself (not on its children). */}
      <div
        id={dialogId}
        data-mw-nav-dialog=""
        data-mw-overlay="fade"
        data-open={mobileOpen ? "true" : "false"}
        data-lenis-prevent=""
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        inert={!mobileOpen}
        data-overlay={overlayKind}
        data-bar={bar}
        style={{ "--overlay-count": overlayCount }}
        onClick={onOverlayBackdropClick}
      >
        {/* The in-dialog dismiss, FIRST in the dialog's order so a VoiceOver
            swipe meets it before the links. Not an overlay item (no stagger):
            it is the srOnly recipe until keyboard focus, then a touch-size X
            at the top corner of the room (rules on [data-mw-nav-dialog-dismiss]).
            The desktop menu bar hides it, where the centered X below is the
            one close. Cross-reference: the header note on dismissal. */}
        <button
          type="button"
          data-mw-nav-dialog-dismiss=""
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
        >
          <span data-mw-nav-close-glyph="" aria-hidden="true" />
        </button>
        {/* The drawn frame (contained variant only): four bars of --frame-weight,
            all animating at once away from the top-left corner, so the border
            pours around the room. Fixed-positioned so they pin to the viewport
            while the list scrolls. */}
        {overlayKind === "contained" ? (
          <>
            <span data-mw-nav-frame="" data-side="top" aria-hidden="true" />
            <span data-mw-nav-frame="" data-side="right" aria-hidden="true" />
            <span data-mw-nav-frame="" data-side="bottom" aria-hidden="true" />
            <span data-mw-nav-frame="" data-side="left" aria-hidden="true" />
          </>
        ) : null}
        <div data-mw-nav-dialog-inner="">
          <Container size="lg">
            <ul style={overlayListStyle} role="list">
              {links.map((link, i) => {
                if (link.type === "link") {
                  return (
                    <li
                      key={`o-${i}`}
                      data-mw-nav-dialog-item="" data-mw-overlay-item=""
                      style={{ "--mw-overlay-index": i }}
                    >
                      <Link
                        href={link.href}
                        data-mw-nav-dialog-link=""
                        style={{ viewTransitionName: routeTransitionName(link.label) }}
                        onClick={(e) => onOverlayNavClick(e, link.href)}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                }
                const expanded = mobileExpanded === i;
                const subItems =
                  link.type === "dropdown"
                    ? link.items
                    : link.categories.flatMap((c) => c.items);
                return (
                  <li
                    key={`o-${i}`}
                    data-mw-nav-dialog-item="" data-mw-overlay-item=""
                    style={{ "--mw-overlay-index": i }}
                  >
                    <button
                      type="button"
                      data-mw-nav-dialog-link=""
                      data-mw-nav-dialog-toggle=""
                      aria-expanded={expanded}
                      aria-controls={`${baseId}-sub-${i}`}
                      onClick={() =>
                        setMobileExpanded(expanded ? null : i)
                      }
                    >
                      <span>{link.label}</span>
                      <ChevronDown
                        size={16}
                        aria-hidden="true"
                        data-mw-nav-chevron=""
                        data-open={expanded ? "true" : "false"}
                      />
                    </button>
                    <div
                      id={`${baseId}-sub-${i}`}
                      data-mw-nav-dialog-sub=""
                      data-open={expanded ? "true" : "false"}
                      inert={!expanded}
                    >
                      <ul data-mw-nav-dialog-sub-inner="" role="list">
                        {subItems.map((item, j) => (
                          <li key={`o-${i}-${j}`}>
                            <Link
                              href={item.href}
                              data-mw-nav-dialog-sub-link=""
                              onClick={(e) => onOverlayNavClick(e, item.href)}
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ul>
            {cta ? (
              <div
                data-mw-nav-dialog-item="" data-mw-overlay-item=""
                style={{ ...overlayCtaStyle, "--mw-overlay-index": links.length }}
              >
                <Button
                  variant={cta.variant ?? "primary"}
                  size="lg"
                  href={cta.href}
                  onClick={(e) => onOverlayNavClick(e, cta.href)}
                >
                  {cta.label}
                </Button>
              </div>
            ) : null}
          </Container>
          {/* The emblem: the square brand mark as a home link, the middle beat
              of the room. It sits outside the Container (a centered square
              needs no gutters) so the inner's flex column can center it in the
              leftover space between the link block above and the close
              affordance below, equal room each side via auto block margins. */}
          <div
            data-mw-nav-dialog-item="" data-mw-overlay-item=""
            data-mw-nav-dialog-emblem-wrap=""
            style={{ "--mw-overlay-index": emblemStagger }}
          >
            <Link
              href={logoHref}
              data-mw-nav-dialog-emblem=""
              onClick={(e) => onOverlayNavClick(e, logoHref)}
            >
              {emblem ?? <span style={emblemPlaceholderStyle} aria-hidden="true" />}
              <span style={srOnly}>{homeLabel}</span>
            </Link>
          </div>
          {/* The menu-bar variant's centered close control. It is an overlay
              item with the LAST stagger index, so it arrives after every
              link and the emblem, and its plus glyph rotates into an X only
              after it has appeared (the appear-then-animate beat). On close it
              leads: the glyph rotates back at delay zero while everything else
              waits out the toggle lead. Desktop-only by CSS: below the desktop
              breakpoint the fixed bottom toggle is the visible close control,
              and the hidden dismiss at the top of the dialog carries the AT
              dismissal. */}
          {bar === "menu" ? (
            <div
              data-mw-nav-dialog-item="" data-mw-overlay-item=""
              data-mw-nav-dialog-close-wrap=""
              style={{ "--mw-overlay-index": overlayCount }}
            >
              <button
                type="button"
                data-mw-nav-dialog-close=""
                aria-label="Close navigation menu"
                onClick={() => setMobileOpen(false)}
              >
                <span data-mw-nav-close-glyph="" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

const navCss = `
[data-mw-nav-logo-link]:focus-visible { outline: var(--focus-outline); outline-offset: 2px; }

/* THE LOGO BOUNDING BOX. The slot bounds the consumer's artwork on BOTH axes, because a height
   alone decides nothing: the width that height produces is the artwork's aspect ratio, which is
   whatever the client's designer drew. Two forks on the identical height token measured 130px and
   299px wide on 17 Sep 2026, 9.1% and 20.8% of a 1440 viewport, and only the wide one read wrong.

   It is set HERE and not inline for the reason the linksStyle comment gives three times over: an
   inline value beats the @media rules below, and the narrow bar has to change.

   The cap lands on the LINK rather than on the artwork, deliberately. A fork's generated suite
   sets its own inline max-width, and inline wins that property outright; but its width is a
   percentage, which resolves against this box. So bounding the parent works WITHOUT the mother
   having to fight, or even know about, what a fork inlines. */
[data-mw-nav-logo-link] {
  max-width: var(--brand-lockup-width);
}
/* The wrappers carry a DEFINITE max-width, never a percentage. A percentage here resolves
   against a shrink-to-fit inline-flex parent, which is circular: the first cut of this rule
   squeezed a 2.46:1 symbol to 31px on a phone where it should have drawn 79px, and it did it
   quietly, because a squeezed SVG letterboxes instead of distorting. Definite lengths only. */
[data-mw-nav-logo-full],
[data-mw-nav-logo-compact] {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: var(--brand-lockup-width);
}
/* max-height, never height: it clamps the used value whatever the consumer inlined, where a
   plain height would simply lose to it. The drawing scales inside on its own preserveAspectRatio,
   so a clamped lockup shrinks rather than distorting. No max-width on the artwork: a fork's
   generated suite inlines its own, inline beats the sheet on that property, and the wrappers
   above already bound the box. */
[data-mw-nav-logo-full] > * {
  max-height: var(--brand-lockup-height);
}
[data-mw-nav-logo-compact] > * {
  max-height: var(--brand-symbol-size);
}
/* The compact mark is the phone's, hidden until the narrow bar asks for it. */
[data-mw-nav-logo-compact] {
  display: none;
}
/* THE PHONE SWAP. Below --mw-bp-tablet the bar carries the logo, a CTA and the menu toggle in
   one row, and a wide lockup starves the other two: the studio's own took 47% of a 390 viewport.
   A symbol is square-ish whatever the brand, so it fits every time, and the visitor reads the
   name off the page instead of the bar (owner, 17 Sep 2026).

   "only" means the fork passed no compact mark, so its lockup stays and is merely bounded. Every
   fork that has not adopted the prop therefore behaves exactly as it did before. */
@media (max-width: 767.98px) { /* --mw-bp-tablet */
  [data-mw-nav-logo-full="swap"] {
    display: none;
  }
  [data-mw-nav-logo-compact] {
    display: inline-flex;
  }
}

/* Route orchestration through the frosted menu: while data-mw-nav-routing is
   on <html> (set at orchestrated-close start, removed once the new pathname
   commits), the page content behind the glass fades out; the removal fades
   the new page in. Opacity only, so layout and sticky chrome are untouched;
   still / reduced motion collapse the durations to an instant swap. */
main {
  transition: opacity var(--motion-duration) var(--motion-ease);
}
html[data-mw-nav-routing] main {
  opacity: 0;
}
[data-mw-nav-skip] {
  position: absolute;
  left: var(--space-md);
  top: var(--space-md);
  transform: translateY(-200%);
  background: var(--background-positive-primary);
  color: var(--text-positive-primary);
  font-family: var(--font-body);
  font-size: var(--type-sm);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--component-radius);
  border: 1px solid var(--border-positive-primary);
  text-decoration: none;
  transition: transform var(--motion-transition);
  z-index: var(--z-overlay);
}
[data-mw-nav-skip]:focus-visible {
  transform: translateY(0);
  outline: var(--focus-outline);
  outline-offset: 2px;
}

/* Bar mount stagger reveal. Page-load curtain rides --motion-reveal-duration
   (the gentle / sharp / still values live in tokens.css and have been retuned
   three times, so read them there, not here) so it reads as a deliberate
   entrance rather than a snap. --motion-stagger sets the per-item gap. */
[data-mw-nav-staggered] {
  opacity: 0;
  transform: translateY(-8px);
}
[data-mw-nav][data-mounted="true"] [data-mw-nav-staggered] {
  animation: mw-nav-reveal var(--motion-reveal-duration) var(--motion-ease) forwards;
  animation-delay: calc(var(--stagger-index, 0) * var(--motion-stagger));
}
@keyframes mw-nav-reveal {
  to { opacity: 1; transform: translateY(0); }
}

[data-mw-nav-link-trigger] {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  font-family: var(--font-body);
  font-size: var(--type-sm);
  color: var(--text-positive-secondary);
  text-decoration: none;
  background: none;
  border: 0;
  padding: var(--space-xs) 0;
  /* DECLARED, NOT INHERITED (CG-3, 2 Sep 2026). The last two members of the leading class,
     held back from the v6.5.3 sweep because these sit in a HORIZONTAL bar beside a CTA
     Button, the one place a link's leading can move chrome geometry rather than just text
     rhythm, and nobody had measured the bar. Measured now, on a fork rather than the docs
     shell: the bar does NOT follow its links. Its height is identical pinned or not at all
     three dials (69.48 / 84.70 / 121.20), because it is set by its own padding. */
  line-height: var(--leading-tight);
  cursor: pointer;
  transition: color var(--motion-transition);
}
[data-mw-nav-link-trigger] > span {
  position: relative;
}
[data-mw-nav-link-trigger] > span::after {
  content: "";
  position: absolute;
  left: 50%;
  right: 50%;
  /* v5.5.0: was -4px; the same offset at the normal dial, and it now rides the spacing
     dial like the Footer twin.
     CG-3, 2 Sep 2026: THIS RULE NOW DOES WHAT THAT SENTENCE ALWAYS CLAIMED. The offset is
     measured from the inner span, and that span is a line box, so until the leading above
     was pinned the perceived gap was this token PLUS half the leading, and BOTH scaled
     with the dial. It compounded: 6.52 / 8.42 / 12.26px below the text across compact /
     normal / dramatic, close to doubling where the token alone intends 0.75 to 1.6. With
     the leading pinned the gap follows this token and nothing else, which moved the rule
     1.63 / 2.44 / 3.67px closer to the text on every fork. That shift is the deliberate,
     owner-approved consequence of the fix and is NOT a regression: if it looks wrong,
     change THIS value, not the leading. */
  bottom: calc(-1 * var(--space-2xs));
  height: 1px;
  background: var(--nav-link-hover);
  transition:
    left var(--motion-transition),
    right var(--motion-transition);
}
/* Hover / open ink rides its own semantic token (--nav-link-hover, defaults
   to the primary text ink) so a brand overlay can retune it to the accent
   without touching this file. */
[data-mw-nav-link-trigger]:hover,
[data-mw-nav-link-trigger][data-open="true"] {
  color: var(--nav-link-hover);
}
[data-mw-nav-link-trigger]:hover > span::after,
[data-mw-nav-link-trigger]:focus-visible > span::after,
[data-mw-nav-link-trigger][data-open="true"] > span::after {
  left: 0;
  right: 0;
}
[data-mw-nav-link-trigger]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
  border-radius: var(--component-radius);
}
[data-mw-nav-chevron] {
  transition: transform var(--motion-transition);
}
[data-mw-nav-link-trigger][data-open="true"] [data-mw-nav-chevron] {
  transform: rotate(180deg);
}

/* Dropdown surface. It rides inside the TopLayerPanel popover (top layer), so it
   no longer positions itself or carries a z-index; TopLayerPanel anchors it under
   the trigger (below-start) and owns the open/close fade via :popover-open.
   position: relative is kept only so the hover bridge ::before anchors to it. */
[data-mw-nav-dropdown] {
  position: relative;
  min-width: 12rem;
  background: var(--background-positive-primary);
  /* Panel frost. The floating panels (dropdown, mega) run a deliberately lighter
     blur than the 2rem --overlay-blur scrim tier, so the page stays legible
     through them. 12px is the panel-frost tier, not a drifted literal. */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-positive-primary);
  border-radius: var(--component-radius);
  box-shadow: var(--shadow-raised);
  padding: var(--space-xs);
}
/* Hover bridge across the trigger->panel gap. The panel now opens one
   TopLayerPanel gap (8px) below the trigger, so the bridge spans that gap
   (--space-sm clears 8px across the whole spacing dial) and keeps the trigger and
   panel one contiguous hover region. A closed popover is display:none, so the
   bridge exists only while the menu is open and leaves no stray strip. */
[data-mw-nav-dropdown]::before {
  content: "";
  position: absolute;
  top: calc(-1 * var(--space-sm));
  left: 0;
  right: 0;
  height: var(--space-sm);
}
[data-mw-nav-dropdown-item] {
  opacity: 0;
  transform: translateY(-4px);
}
[data-mw-toplayer-panel]:popover-open [data-mw-nav-dropdown-item] {
  animation: mw-nav-dropdown-item var(--motion-reveal-duration) var(--motion-ease) forwards;
  animation-delay: calc(var(--item-index, 0) * var(--motion-stagger));
}
@keyframes mw-nav-dropdown-item {
  to { opacity: 1; transform: translateY(0); }
}
[data-mw-nav-dropdown] a {
  display: block;
  font-family: var(--font-body);
  font-size: var(--type-sm);
  color: var(--text-positive-secondary);
  text-decoration: none;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--component-radius);
  transition:
    background var(--motion-transition),
    color var(--motion-transition);
}
[data-mw-nav-dropdown] a:hover {
  background: var(--background-positive-secondary);
  color: var(--text-positive-primary);
}
/* Split from :hover on purpose (pass 3, 27 Aug 2026): the wash alone is about
   1.05:1 against the panel, so keyboard focus carries the house ring too, inset
   so it sits inside the item radius. A combined selector would paint the ring
   on mouse hover. */
[data-mw-nav-dropdown] a:focus-visible {
  background: var(--background-positive-secondary);
  color: var(--text-positive-primary);
  outline: var(--focus-outline);
  outline-offset: -2px;
}

/* Mega panel surface. It fills the TopLayerPanel popover, which is sized to
   min(44rem, bar width): the popover carries width:min(44rem,100%) (megaPanelStyle)
   and matchAnchorWidth caps its max-width to the bar (anchor = [data-mw-nav-inner]),
   so the mega never renders wider than the bar and right-aligns under it (placement
   below-end). width and max-width are different properties, so they compose to
   min(44rem, bar width) without either clobbering the other, and the 44rem stays in
   rem (root-font faithful). Auto-fit columns collapse 4 to 1 as it narrows.
   position: relative is kept only so the hover bridge ::before anchors to it. */
[data-mw-nav-mega] {
  position: relative;
  width: 100%;
  background: var(--background-positive-primary);
  /* Panel-frost tier, see the note on [data-mw-nav-dropdown] above. */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-positive-primary);
  border-radius: var(--component-radius);
  box-shadow: var(--shadow-raised);
  padding: var(--space-lg);
}
/* Hover bridge for the bar-aligned mega. The panel opens one TopLayerPanel gap
   (8px) below the whole bar, so the bridge spans that gap plus the bar's bottom
   padding (--space-md) to reach the trigger row; --space-sm over the gap leaves a
   small overshoot across the spacing dial. A closed popover is display:none, so the
   bridge is live only while the menu is open. */
[data-mw-nav-mega]::before {
  content: "";
  position: absolute;
  top: calc(-1 * (var(--space-md) + var(--space-sm)));
  left: 0;
  right: 0;
  height: calc(var(--space-md) + var(--space-sm));
}
[data-mw-nav-mega-col] {
  opacity: 0;
}
[data-mw-toplayer-panel]:popover-open [data-mw-nav-mega-col] {
  animation: mw-nav-mega-col var(--motion-reveal-duration) var(--motion-ease) forwards;
  animation-delay: calc(var(--col-index, 0) * var(--motion-stagger));
}
@keyframes mw-nav-mega-col {
  to { opacity: 1; }
}
[data-mw-nav-mega-item] {
  opacity: 0;
  transform: translateY(-4px);
}
[data-mw-toplayer-panel]:popover-open [data-mw-nav-mega-item] {
  animation: mw-nav-dropdown-item var(--motion-reveal-duration) var(--motion-ease) forwards;
  animation-delay: calc(
    var(--col-index, 0) * var(--motion-stagger)
    + var(--item-index, 0) * calc(var(--motion-stagger) / 2)
  );
}
[data-mw-nav-mega] a {
  display: block;
  font-family: var(--font-body);
  /* DECLARED, NOT INHERITED (CG-3): the bar link's twin. These carry no underline of their
     own, so pinning them has no second-order effect at all; they move together with the
     trigger because the two vocabularies must not disagree about their own leading. */
  line-height: var(--leading-tight);
  font-size: var(--type-sm);
  color: var(--text-positive-secondary);
  text-decoration: none;
  padding: var(--space-2xs) 0;
  transition: color var(--motion-transition);
}
[data-mw-nav-mega] a:hover {
  color: var(--text-positive-primary);
}
[data-mw-nav-mega] a:focus-visible {
  color: var(--text-positive-primary);
  outline: var(--focus-outline);
  outline-offset: 2px;
  border-radius: var(--component-radius);
}

/* Hamburger: 2.75rem (44px) square AAA touch target. Three absolutely
   positioned <span> bars centered on the button's midpoint via top/left
   50% + negative margins for pixel-exact centering. transform-origin
   stays 50% 50% on every bar so the rotation pivots in place, no shift.
   Bars use currentColor so the X stays themed correctly. */
[data-mw-nav-toggle] {
  display: none;
  position: relative;
  /* Rides one rung above the open overlay so the close X stays tappable while
     the overlay occludes the rest of the bar. Toggle and overlay share <nav>'s
     stacking context, so this lift is direct and comparable. */
  z-index: var(--z-overlay-control);
  width: var(--control-size-touch);
  height: var(--control-size-touch);
  align-items: center;
  justify-content: center;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  border-radius: var(--component-radius);
  color: var(--text-positive-primary);
  transition: background var(--motion-transition);
}
[data-mw-nav-toggle]:hover {
  background: var(--background-positive-secondary);
}
[data-mw-nav-toggle]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
[data-mw-nav-toggle-bar] {
  /* inset:0 + margin:auto centers the fixed-size bar exactly, replacing the
     old 50%-offset + compensating negative margins (audit: the manual-position
     -then-revert-margin shape), and leaves transform free for the X morph. */
  position: absolute;
  inset: 0;
  margin: auto;
  width: 1.125rem;
  height: 2px;
  background: currentColor;
  transform-origin: 50% 50%;
  transition:
    transform var(--motion-duration) var(--motion-ease),
    opacity var(--motion-duration) var(--motion-ease);
}
[data-mw-nav-toggle][data-open="false"] [data-mw-nav-toggle-bar][data-pos="top"]    { transform: translateY(-6px); }
[data-mw-nav-toggle][data-open="false"] [data-mw-nav-toggle-bar][data-pos="middle"] { transform: translateY(0); opacity: 1; }
[data-mw-nav-toggle][data-open="false"] [data-mw-nav-toggle-bar][data-pos="bottom"] { transform: translateY(6px); }
[data-mw-nav-toggle][data-open="true"]  [data-mw-nav-toggle-bar][data-pos="top"]    { transform: translateY(0) rotate(45deg); }
[data-mw-nav-toggle][data-open="true"]  [data-mw-nav-toggle-bar][data-pos="middle"] { transform: translateY(0); opacity: 0; }
[data-mw-nav-toggle][data-open="true"]  [data-mw-nav-toggle-bar][data-pos="bottom"] { transform: translateY(0) rotate(-45deg); }

/* Full-screen overlay. inert (set in JSX) handles tabbability + a11y tree
   when closed; this CSS runs the whole choreography on transition-delays.
   PLAIN (default): backdrop fades in -> items stagger in; close reverses
          (items out last-in-first-out, backdrop last) and the route push
          waits for it.
   CONTAINED (opt-in, data-overlay="contained"): one extra beat each way; the
          --frame-weight border draws corner to corner between the backdrop
          and the items, and retracts between the items and the backdrop.
   Entry delays live in the [data-open="true"] rules and exit delays in the
   base rules, so both directions are explicitly ordered and any interrupt
   converges (the enter-only-delay rule the reveal primitives follow, applied
   per direction). The orchestrated route push in Nav.tsx mirrors the close
   totals: (count - 1) * stagger / 2 + duration * (contained ? 2.5 : 1.5). */
[data-mw-nav-dialog] {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  /* The frosted room: the page shows through the scrim, blurred (the modal
     vocabulary; mirrors light/dark). */
  background: var(--modal-scrim);
  -webkit-backdrop-filter: blur(var(--overlay-blur));
  backdrop-filter: blur(var(--overlay-blur));
  /* Clears the bar exactly: toggle touch target + the bar's block padding,
     so it scales with the spacing dial instead of a frozen rem guess. The svh
     cap is the fit rule (owner, 4 Jul): the resting menu must FIT the SMALL
     viewport (address bar visible) with no scrolling; tokens are the ceiling
     and the viewport-height term only compresses when the room is short. */
  padding-top: min(calc(var(--control-size-touch) + 2 * var(--space-md)), 10svh);
  padding-bottom: var(--space-2xl);
  /* Scroll stays ONLY as the accessibility fallback (200% text zoom,
     landscape phones); the fit rule keeps it dormant on real portrait
     viewports. contain stops any fallback scroll from chaining out. */
  overflow-y: auto;
  overscroll-behavior: contain;
  /* Sits on the documented overlay rung so this role=dialog/aria-modal surface
     fully occludes the bar chrome. Only the close X is lifted back above it
     (--z-overlay-control); see [data-mw-nav-toggle]. */
  z-index: var(--z-overlay);
  /* The open/close choreography rides the shared OverlayMotion preset
     (data-mw-overlay="fade" + data-mw-overlay-item); these knobs feed it
     Nav's proven formulas, values unchanged. Closing: the toggle's lead beat
     (one duration: glyph morph + button fade), then the items, then the
     backdrop leaves. */
  --mw-overlay-count: var(--overlay-count, 6);
  --mw-overlay-close-delay: calc(
    var(--motion-duration)
    + (var(--overlay-count, 6) - 1) * var(--motion-stagger) / 2
    + var(--motion-duration) * 0.5
  );
}
[data-mw-nav-dialog][data-overlay="contained"] {
  /* Closing: the backdrop also waits for the frame retract; opening: items
     wait for the frame draw beat. */
  --mw-overlay-close-delay: calc(
    var(--motion-duration)
    + (var(--overlay-count, 6) - 1) * var(--motion-stagger) / 2
    + var(--motion-duration) * 1.5
  );
  --mw-overlay-item-lead: calc(var(--motion-duration) * 1.2);
}
/* The room is a flex column filling the dialog's content box (min-height 100%
   resolves against the fixed dialog minus its paddings, which already clear
   the bar above and the floating toggle below), so the emblem's auto block
   margins can split the leftover space evenly: links above, emblem centered,
   close affordance below. On overflow the auto margins collapse to zero and
   the room scrolls as before. */
[data-mw-nav-dialog-inner] {
  padding-top: min(var(--space-xl), 2svh);
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

/* The drawn frame: four bars of --frame-weight animating simultaneously away
   from the top-left corner (top and bottom bars left to right, left and right
   bars top to bottom), so the border pours around the room. position: fixed
   pins the bars to the viewport while the dialog's list scrolls; the dialog
   has no transform, so fixed stays viewport-relative. */
[data-mw-nav-frame] {
  position: fixed;
  background: var(--text-positive-primary);
  transition: transform var(--motion-duration) var(--motion-ease);
  /* Closing: the toggle lead, then the frame retracts once the items are gone. */
  transition-delay: calc(
    var(--motion-duration)
    + (var(--overlay-count, 6) - 1) * var(--motion-stagger) / 2
    + var(--motion-duration) * 0.75
  );
}
[data-mw-nav-frame][data-side="top"]    { top: 0; left: 0; right: 0; height: var(--frame-weight); transform: scaleX(0); transform-origin: left center; }
[data-mw-nav-frame][data-side="bottom"] { bottom: 0; left: 0; right: 0; height: var(--frame-weight); transform: scaleX(0); transform-origin: left center; }
[data-mw-nav-frame][data-side="left"]   { top: 0; bottom: 0; left: 0; width: var(--frame-weight); transform: scaleY(0); transform-origin: center top; }
[data-mw-nav-frame][data-side="right"]  { top: 0; bottom: 0; right: 0; width: var(--frame-weight); transform: scaleY(0); transform-origin: center top; }
[data-mw-nav-dialog][data-open="true"] [data-mw-nav-frame] {
  transform: none;
  transition-delay: calc(var(--motion-duration) * 0.6);
}

/* Overlay items: the entrance stagger and the last-in-first-out close live in
   the shared OverlayMotion preset ([data-mw-overlay-item] + --mw-overlay-index);
   the max() clamp there covers the menu-bar close control (index = count),
   which leads at zero. Nav's formulas became the preset's defaults, so the
   choreography here is value-identical to the pre-preset build. */

/* Overlay links: centered, at --type-lg (one ratio step above body). The size
   rides the type dial like everything else, so a stately fork's menu runs
   larger than a composed fork's BY DESIGN; the component itself stays one calm
   step, not a display size. The chevron on accordion rows rides beside the
   centered label. */
[data-mw-nav-dialog-link] {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  width: 100%;
  font-family: var(--font-display);
  /* The svh terms are the fit rule: on short viewports the link type and its
     block padding compress (tokens stay the ceiling), so links + emblem +
     close fit the small viewport instead of overflowing into scroll. */
  font-size: min(var(--type-lg), 3.4svh);
  color: var(--text-positive-primary);
  text-decoration: none;
  background: none;
  border: 0;
  padding: min(var(--space-sm), 1.2svh) 0;
  border-bottom: 1px solid var(--border-positive-primary);
  cursor: pointer;
  text-align: center;
}
[data-mw-nav-dialog-link]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}

/* Accordion: pure-CSS auto-height transition via the 0fr -> 1fr trick. The
   grid track animates from 0 to its content's intrinsic height; the inner
   wrapper clips during the transition. min-height: 0 on the inner is required
   because the default min-height: auto would prevent the collapse to zero.
   Browser support: Chrome 117+, Firefox 124+, Safari 17.4+, all current. */
[data-mw-nav-dialog-sub] {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--motion-duration) var(--motion-ease);
}
[data-mw-nav-dialog-sub][data-open="true"] {
  grid-template-rows: 1fr;
}
[data-mw-nav-dialog-sub-inner] {
  overflow: hidden;
  min-height: 0;
  list-style: none;
  margin: 0;
  padding: 0;
}
[data-mw-nav-dialog-sub-link] {
  display: block;
  font-family: var(--font-body);
  font-size: min(var(--type-md), 2.8svh);
  color: var(--text-positive-secondary);
  text-decoration: none;
  padding: min(var(--space-sm), 1.2svh) 0;
  text-align: center;
}
[data-mw-nav-dialog-sub-link]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}

/* The emblem: the square brand mark, a home link, the middle beat of the
   room. Auto block margins center it in the leftover space with equal room
   above (to the link block) and below (to the close affordance); the padding
   is the floor so it never touches its neighbors when the room is tight. */
[data-mw-nav-dialog-emblem-wrap] {
  display: flex;
  justify-content: center;
  margin-block: auto;
  /* The padding floor compresses on short viewports (the fit rule); the
     44px emblem itself never shrinks, it is a touch target. */
  padding-block: min(var(--space-xl), 2svh);
}
[data-mw-nav-dialog-emblem] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--control-size-touch);
  min-height: var(--control-size-touch);
  color: var(--text-positive-primary);
  border-radius: var(--component-radius);
}
[data-mw-nav-dialog-emblem]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}

/* The menu-bar variant's centered close control. A plus glyph that rotates
   into an X only after the control has landed (the appear-then-animate beat);
   on close the rotation reverses at delay zero, leading the cascade. The 1rem
   glyph box and 2px strokes are control-glyph geometry (the hamburger class),
   not spacing-scale values. */
/* No top margin of its own: the emblem above carries the separation (its
   padding floor plus its auto bottom margin), so the close sits at the foot
   of the room and the emblem centers between it and the links. */
[data-mw-nav-dialog-close-wrap] {
  display: flex;
  justify-content: center;
}
[data-mw-nav-dialog-close] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--control-size-touch);
  height: var(--control-size-touch);
  background: none;
  border: 1px solid var(--border-positive-primary);
  border-radius: var(--component-radius);
  color: var(--text-positive-primary);
  cursor: pointer;
  transition: background var(--motion-transition);
}
[data-mw-nav-dialog-close]:hover {
  background: var(--background-positive-secondary);
}
[data-mw-nav-dialog-close]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
[data-mw-nav-close-glyph] {
  position: relative;
  display: block;
  width: 1rem;
  height: 1rem;
  transform: rotate(0deg);
  transition: transform var(--motion-duration) var(--motion-ease);
}
[data-mw-nav-close-glyph]::before,
[data-mw-nav-close-glyph]::after {
  content: "";
  position: absolute;
  background: currentColor;
}
[data-mw-nav-close-glyph]::before {
  left: 0;
  right: 0;
  top: calc(50% - 1px);
  height: 2px;
}
[data-mw-nav-close-glyph]::after {
  top: 0;
  bottom: 0;
  left: calc(50% - 1px);
  width: 2px;
}
[data-mw-nav-dialog][data-open="true"] [data-mw-nav-close-glyph] {
  transform: rotate(45deg);
  transition-delay: var(--mw-nav-open-total);
}

/* The in-dialog dismiss. The srOnly recipe (serialized from the shared helper)
   until keyboard focus, so the resting menu paints exactly as before on every
   site; the sheet carries it, not an inline style, so :focus-visible can take
   over. On focus it is the close X at the top corner of the room, touch size,
   on the control rung so it rides above the frame bars, and it wears the focus
   ring the other overlay controls do. Same glyph as the menu-bar X, so the
   plus-to-X beat reads once. */
[data-mw-nav-dialog-dismiss] {
  ${srOnlyCss}
}
[data-mw-nav-dialog-dismiss]:focus-visible {
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
  width: var(--control-size-touch);
  height: var(--control-size-touch);
  margin: 0;
  padding: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--background-positive-primary);
  border: 1px solid var(--border-positive-primary);
  border-radius: var(--component-radius);
  color: var(--text-positive-primary);
  cursor: pointer;
  z-index: var(--z-overlay-control);
  outline: var(--focus-outline);
  outline-offset: 2px;
}

[data-mw-nav-dialog-toggle] [data-mw-nav-chevron][data-open="true"] {
  transform: rotate(180deg);
}

/* Threshold flip at --mw-bp-desktop (1024). Below 1024 the desktop link row
   is hidden, the hamburger reveals, the inner grid gap tightens, and the bar
   CTA flips to a compact size. The 1023.98 fractional cap dodges the boundary
   double-trigger at exactly 1024. CSS @media cannot read --mw-bp-desktop, so
   the value is hardcoded here AND cited in the trailing comment per the
   breakpoint policy in CLAUDE.md. */
[data-mw-nav-desktop] {
  display: flex;
  justify-content: center;
}
/* The bar's desktop template and gap: logo · links · CTA. NO toggle track:
   the hamburger is display:none at desktop, and a reserved empty track's
   gaps are not 0, which inset the CTA one full gap from the page gutter on
   every site. Declared here (not inline) so the mobile overrides below can
   win the cascade; same for the CTA slot's display. (Audit finding: gap was
   the FOURTH inline value silently beating its @media override.) */
[data-mw-nav-inner] {
  grid-template-columns: auto 1fr auto;
  gap: var(--space-lg);
  padding-block: var(--space-md);
}
/* Toggle choreography totals, shared by the CSS and mirrored by the JS route
   push. Open: backdrop beat + full item spread + one reveal; the toggle
   reappears as the last item lands, then its glyph morphs. Close: one
   duration of toggle lead (glyph morph + button fade), then the reverse
   cascade the dialog rules below run. */
/* NAV-1, fixed 2 Sep 2026.

   THE BUG. position: sticky creates a stacking context unconditionally, so --z-overlay
   (200) and --z-overlay-control (210) resolve INSIDE this nav and the whole subtree
   composites against its SIBLINGS at --z-sticky (100). Below --mw-bp-desktop the menu
   toggle is a FIXED button pinned bottom-centre and it is the only affordance that opens
   the mobile overlay, so a fork element fixed at 100 or above painted straight over it and
   a later DOM position won the tie outright. A client fork proved it in production:
   its bottom call bar enclosed the toggle's band and the site had no way to open its menu
   on a phone. v5.4.3 fixed this same class in TopBar and the fix did not generalise, which
   is why scripts/probe-nav-z.mjs now injects the hostile bar and asserts the outcome.

   THE FIX, AND WHY IT IS SCOPED TO THE BREAKPOINT AND NOT TO THE OPEN STATE. The first
   attempt lifted the nav only while the overlay was OPEN, which is useless: the collision
   happens while it is CLOSED, because that is when you have to press the toggle. You cannot
   open what you cannot click, and the probe caught it. Below the desktop breakpoint the nav
   therefore composites at --z-overlay-control at all times, which is the rung its own fixed
   control already claims internally.

   WHAT STAYS TRUE ABOVE IT. --z-modal (900), --z-toast (1000), --z-loader (1100) and
   --z-cursor (9999) all still paint over the nav, which is exactly what the ladder says they
   should do: a Modal belongs above the nav overlay. Above --mw-bp-desktop nothing changes;
   the toggle is not fixed there and the bar stays on the sticky rung with its peers. */
[data-mw-nav] {
  z-index: var(--z-sticky);
}
@media (max-width: 1023.98px) { /* --mw-bp-desktop */
  [data-mw-nav] {
    z-index: var(--z-overlay-control);
  }
}
[data-mw-nav] {
  --mw-nav-open-total: calc(
    var(--motion-duration) * 0.5
    + var(--overlay-count, 6) * var(--motion-stagger)
    + var(--motion-reveal-duration)
  );
  --mw-nav-close-total: calc(
    var(--motion-duration)
    + (var(--overlay-count, 6) - 1) * var(--motion-stagger) / 2
    + var(--motion-duration) * 2
  );
}
/* The chrome is FROSTED (owner, 3 Jul): the modal recipe, a 70% theme-mirrored
   scrim over a backdrop blur, on the bar, the bottom button, and the overlay.
   The bar frost lives on a ::before layer, NOT the nav itself: a filter or
   backdrop-filter on the nav would make it the containing block for its
   position:fixed descendants and rebase the bottom toggle, the dialog, and
   the frame bars into the 53px bar (found live on crescent). */
[data-mw-nav]::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--modal-scrim);
  -webkit-backdrop-filter: blur(var(--overlay-blur));
  backdrop-filter: blur(var(--overlay-blur));
}
[data-mw-nav][data-overlay="contained"] {
  --mw-nav-open-total: calc(
    var(--motion-duration) * 1.2
    + var(--overlay-count, 6) * var(--motion-stagger)
    + var(--motion-reveal-duration)
  );
  --mw-nav-close-total: calc(
    var(--motion-duration)
    + (var(--overlay-count, 6) - 1) * var(--motion-stagger) / 2
    + var(--motion-duration) * 3
  );
}
/* No-CTA bars drop the CTA track too, and the link row right-aligns flush at
   the gutter: a centered row with nothing to its right read as a phantom
   space after the last link (found on crescent, the one no-CTA consumer).
   :where() keeps specificity flat so the mobile template below still wins. */
[data-mw-nav-inner]:where([data-has-cta="false"]) {
  grid-template-columns: auto 1fr;
}
[data-mw-nav-inner]:where([data-has-cta="false"]) [data-mw-nav-desktop] {
  justify-content: flex-end;
}
[data-mw-nav-cta-slot] {
  display: flex;
}
@media (max-width: 1023.98px) { /* --mw-bp-desktop */
  [data-mw-nav-desktop] {
    display: none;
  }
  /* The THIN bar (owner, 3 Jul): the toggle moved to the bottom of the
     viewport, so the top bar is logo + CTA on a tighter block padding. */
  [data-mw-nav-inner] {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-xs);
    /* 2xs + 3xs: the owner's breathing-room pass (9 Jul) adds one 3xs step
       (2px at the normal dial, dial-aware) above and below so the CTA never
       crowds the bar edges. */
    padding-block: calc(var(--space-2xs) + var(--space-3xs));
  }
  [data-mw-nav-inner]:where([data-has-cta="false"]) {
    grid-template-columns: minmax(0, 1fr);
  }
  /* The bottom menu button: fixed, centered, thumb-reachable (owner: easier
     to tap than a top corner). It is the SAME control open and closed; the
     out-in cycle below makes it read as "reappears last, as the close". The
     surface makes it a floating control over page content. */
  [data-mw-nav-toggle] {
    display: inline-flex;
    position: fixed;
    left: 50%;
    bottom: max(var(--space-md), env(safe-area-inset-bottom, 0px));
    margin-left: calc(var(--control-size-touch) / -2);
    background: var(--modal-scrim);
    -webkit-backdrop-filter: blur(var(--overlay-blur));
    backdrop-filter: blur(var(--overlay-blur));
    border: 1px solid var(--border-positive-primary);
    box-shadow: var(--shadow-raised);
  }
  /* The out-in cycle: on open the button hides at once and fades back in as
     the last overlay item lands; on close it hides after its glyph beat and
     returns (as the resting menu button) once the backdrop has gone. Two
     identical keyframe tracks so the state flip restarts the cycle. "idle"
     (pre-first-open) runs nothing, so page load never plays it. */
  [data-mw-nav][data-menu-state="open"] [data-mw-nav-toggle] {
    animation: mw-nav-toggle-cycle-in var(--mw-nav-open-total) var(--motion-ease) both;
  }
  [data-mw-nav][data-menu-state="closing"] [data-mw-nav-toggle] {
    animation: mw-nav-toggle-cycle-out var(--mw-nav-close-total) var(--motion-ease) both;
  }
  /* The appear-then-animate beat: while open, the hamburger-to-X morph waits
     for the button's reappearance; on close the base (no-delay) transitions
     run the X back to a hamburger FIRST, leading the whole reverse. */
  [data-mw-nav][data-menu-state="open"] [data-mw-nav-toggle-bar] {
    transition-delay: var(--mw-nav-open-total);
  }
  /* Narrow-width defensive cap on the consumer logo prop: the minmax(0,1fr)
     track constrains it; overflow keeps a long wordmark from painting out. */
  [data-mw-nav-logo-slot] {
    max-width: 100%;
    overflow: hidden;
  }
  /* The bottom control is the VISIBLE close on small screens (the hidden
     dismiss at the top of the dialog carries the AT dismissal); the centered
     overlay close is the desktop menu-bar affordance. */
  [data-mw-nav-dialog-close-wrap] {
    display: none;
  }
  /* The dialog's bottom clearance mirrors the floating toggle's real
     geometry (offset + touch target + a breath) instead of a flat token, so
     the emblem never rides under the toggle, and safe-area devices (which
     push the toggle UP) get the clearance the toggle actually uses. */
  [data-mw-nav-dialog] {
    padding-bottom: calc(
      var(--control-size-touch)
      + max(var(--space-md), env(safe-area-inset-bottom, 0px))
      + var(--space-sm)
    );
  }
  /* Clearance for the thin bar above. (The bottom clearance is the geometry block above
     this one; v5.5.0 removed a second padding-bottom here that tied it on specificity, won
     on source order, and silently replaced the max(safe-area) expression with a flat sum.) */
  [data-mw-nav-dialog] {
    padding-top: calc(var(--control-size-md) + 2 * var(--space-2xs) + var(--space-lg));
  }
}
@keyframes mw-nav-toggle-cycle-in {
  0%   { opacity: 1; }
  12%  { opacity: 0; }
  82%  { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes mw-nav-toggle-cycle-out {
  0%   { opacity: 1; }
  20%  { opacity: 0; }
  85%  { opacity: 0; }
  100% { opacity: 1; }
}
@media (min-width: 1024px) { /* --mw-bp-desktop */
  /* The links bar has no overlay at desktop; the menu bar keeps it. */
  [data-mw-nav-dialog]:where(:not([data-bar="menu"])) {
    display: none;
  }
  /* Menu bar anatomy at desktop: logo · CTA · menu button, no link row. The
     toggle sits in the bar (static, not the floating bottom control). */
  [data-mw-nav][data-bar="menu"] [data-mw-nav-desktop] {
    display: none;
  }
  /* NAV-3 (v6.37.1, 25 Sep 2026): the link row above is display:none, and a
     display:none grid item takes NO track, so the old templates ("auto 1fr auto
     auto", "auto 1fr auto") placed the CTA, or the toggle, in the 1fr track right
     beside the logo. rosey-seas, the first fork to mount the menu bar, showed the
     menu button glued to the wordmark at 1440 (the owner's screenshot). The logo
     takes the flexible track now and the controls sit in auto tracks at the
     gutter, which is what the mobile bar already did. */
  [data-mw-nav][data-bar="menu"] [data-mw-nav-inner] {
    grid-template-columns: minmax(0, 1fr) auto auto;
  }
  [data-mw-nav][data-bar="menu"] [data-mw-nav-inner][data-has-cta="false"] {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  [data-mw-nav][data-bar="menu"] [data-mw-nav-toggle] {
    display: inline-flex;
  }
  /* The menu bar's centered X is the one in-dialog close at desktop; the
     hidden dismiss steps aside so assistive tech does not meet two. */
  [data-mw-nav][data-bar="menu"] [data-mw-nav-dialog-dismiss] {
    display: none;
  }
  /* While the fullscreen menu is open, the centered close is the ONE close
     affordance: the bar toggle fades and leaves the focus order (visibility
     rides a delay so the fade completes first). */
  [data-mw-nav][data-bar="menu"] [data-mw-nav-toggle] {
    transition: opacity var(--motion-transition), visibility 0s linear;
  }
  [data-mw-nav][data-bar="menu"][data-mobile-open="true"] [data-mw-nav-toggle] {
    opacity: 0;
    visibility: hidden;
    transition: opacity var(--motion-transition), visibility 0s linear var(--motion-duration);
  }
}
`;

/* background lives in the hoisted CSS: the frosted recipe pairs a scrim with
   a backdrop-filter, and an inline background would beat the sheet. */
/* z-index lives in the hoisted CSS, NOT here, for the same reason the background does: an
   inline value beats the sheet, and below --mw-bp-desktop this rung has to change. See the
   [data-mw-nav] rules and the NAV-1 note beside them. */
const navStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  borderBottom: "1px solid var(--border-positive-primary)",
};


/* grid-template-columns AND padding-block live in the hoisted CSS (not
   inline) for the same reason as linksStyle: an inline value would beat the
   below-desktop @media overrides (the collapsed bar, the thin mobile bar). */
const innerStyle: CSSProperties = {
  display: "grid",
  alignItems: "center",
};

const logoSlotStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  minWidth: 0,
};

/* display is set via CSS (not inline) so the @media rule that hides the row
   below --mw-bp-desktop can win specificity-wise. Inline style would beat the
   selector and the row would stay visible at narrow widths. */
const linksStyle: CSSProperties = {
  alignItems: "center",
  /* justify-content lives in the hoisted CSS (not inline) so the no-CTA
     right-align variant can win the cascade (the linksStyle lesson again). */
  gap: "var(--space-lg)",
  listStyle: "none",
  margin: 0,
  padding: 0,
};

/* display lives in the hoisted CSS (not inline) so the below-desktop
   display:none can win the cascade; an inline flex would beat it and the CTA
   would squat in the narrow bar forever (the linksStyle lesson, second
   occurrence). */
const ctaSlotStyle: CSSProperties = {
  justifyContent: "flex-end",
};

const dropdownListStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
};

/* Sizes the mega's TopLayerPanel popover. width:min(44rem,100%) is the desired
   width (44rem in rem, root-font faithful); matchAnchorWidth then writes
   max-width:<bar width> on the same element, and the two compose to
   min(44rem, bar width) so the mega never exceeds the bar. The positioner owns
   position/top/left, so this style deliberately sets width only. */
const megaPanelStyle: CSSProperties = {
  width: "min(44rem, 100%)",
};

/* Auto-fit columns so the mega panel collapses gracefully as it narrows: each
   column wants at least 8rem but never overflows its track, and the count drops
   from four toward one on a constrained panel without a media query. */
const megaGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(8rem, 100%), 1fr))",
  gap: "var(--space-lg)",
};

const megaHeadingStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-xs)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--text-positive-tertiary)",
  margin: 0,
  marginBottom: "var(--space-sm)",
  fontWeight: tokenNumber("var(--weight-regular)"),
};

const megaListStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
};

const overlayListStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
};

const overlayCtaStyle: CSSProperties = {
  marginTop: "var(--space-xl)",
  display: "flex",
  justifyContent: "center",
};

/* The emblem placeholder mirrors the logo placeholder recipe, square, at the
   touch-target size, so an emblem-less fork still shows the slot it should
   fill. */
const emblemPlaceholderStyle: CSSProperties = {
  width: "var(--control-size-touch)",
  height: "var(--control-size-touch)",
  background: "color-mix(in oklch, var(--text-positive-primary) 10%, transparent)",
  borderRadius: "var(--component-radius)",
};
