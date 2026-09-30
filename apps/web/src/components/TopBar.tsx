import { ReactNode } from "react";
import { Menu } from "@carbon/icons-react";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/Button";
import { TopBarAccount, TopBarAccountProps } from "@/components/internal/TopBarAccount";

// The account control is PART of the top bar (v4.8.0: the old standalone
// AccountMenu folded in) — its item type and the profile validators surface
// through this module, the public seam.
export type { TopBarAccountItem, TopBarAccountProps } from "@/components/internal/TopBarAccount";
export {
  validateDisplayName,
  validateEmail,
  type ValidationResult,
} from "@/components/internal/profile-validation";

/* ============================================================
   TopBar — the app shell's fixed one-row header (56px, --chrome-bar-height). Left: below
   --mw-bp-desktop a hamburger toggle that opens the rail overlay (AppShell
   supplies the handler, so the bar never owns the state) plus a brand slot; at
   desktop the brand alone, centred over the rail's 3rem icon column so the mark
   sits exactly on the rail glyphs' axis in both rail states (owner, 9 Jul; the
   desktop collapse control moved INTO the rail's foot, see NavRail onToggle).
   Right: a utilities slot the consumer fills (in the mother that is
   MasterControls + a log-out link; a fork drops in whatever it needs). The bar
   itself renders nothing speculative: brand and utilities are slots.

   Not a client component: it passes the toggle handler through and has no hooks,
   so it works inside a client shell (AppShell) or a server surface. Token-driven
   height, colours, spacing.

   v3.16.0, the rail-aligned brand zone (opt-in): wire the `collapsed` prop
   (AppShell's render-prop state carries it) and the brand column becomes the
   rail's twin: exact rail width, the rail hairline continued up through the
   bar, and a direction-staggered crossfade between the wide `brand` and the
   square `brandCollapsed`, both centred over the rail's content column. The
   whole move rides the same width tokens and motion tokens the rail animates
   with, so collapse reads as one gesture. Unwired, the bar renders the legacy
   fixed 3rem brand cell, byte-identical to v3.15.0.
   ============================================================ */

export interface TopBarProps {
  /** Called when the toggle is pressed; AppShell wires this to its toggle. */
  onToggle?: () => void;
  /** Whether to render the toggle (hide it where none makes sense). */
  showToggle?: boolean;
  /** Overlay open state (from AppShell). Drives the mobile hamburger aria-label. */
  mobileOpen?: boolean;
  /** Left-side brand. Defaults to the square BrandMark linking home ("/"); pass your
   *  own (e.g. BrandMark with a different href), or null to omit. With `collapsed`
   *  wired this is the EXPANDED-rail brand: use the wide horizontal logo here. */
  brand?: ReactNode;
  /** Rail state, from AppShell's render-prop state. Wiring this prop turns on the
   *  rail-aligned brand zone (v3.16.0): the brand column takes the rail's exact
   *  width, continues the rail's hairline up through the bar, animates in lockstep
   *  with the rail collapse, and crossfades between `brand` (expanded, wide logo)
   *  and `brandCollapsed` (collapsed, square mark), both centred over the rail's
   *  content column. Leave it unwired for the legacy fixed 3rem brand cell. */
  collapsed?: boolean;
  /** The COLLAPSED-rail brand: the small square mark shown when the rail is
   *  icon-only. Defaults to the square BrandMark linking home ("/"). Only used
   *  when `collapsed` is wired. */
  brandCollapsed?: ReactNode;
  /** Product CONTEXT pinned at the leading edge of the utilities region (a property
   *  address, an environment name, a workspace label): it renders after the brand
   *  zone and pushes the utilities cluster to the trailing edge. Promoted from the
   *  readilyhome homeowner bar (v4.10.0), where the fork carried it as a scoped
   *  width override. Omit and the bar is byte-identical to the cluster-only layout. */
  context?: ReactNode;
  /** Right-side utilities (MasterControls, actions, links). */
  utilities?: ReactNode;
  /** The built-in account control (v4.8.0, the folded-in AccountMenu): the
   *  signed-in person's avatar + name opening the account-level menu. Renders
   *  at the trailing end of the utilities cluster in the SECONDARY register.
   *  Omit for bars without a signed-in identity. */
  account?: TopBarAccountProps;
}

export function TopBar({
  onToggle,
  showToggle = true,
  mobileOpen = false,
  brand = <BrandMark href="/" />,
  collapsed,
  brandCollapsed = <BrandMark href="/" />,
  context,
  utilities,
  account,
}: TopBarProps) {
  const railBrand = collapsed !== undefined;
  return (
    <header data-mw-topbar="">
      <style href="magentaweb-topbar" precedence="default">{css}</style>
      <div data-mw-topbar-left="">
        {showToggle && (
          /* Below --mw-bp-desktop: a hamburger that opens / closes the rail overlay.
             The action is disclosure, so its label + aria-expanded track mobileOpen.
             The span carries the responsive show/hide: Button sets its own display
             inline, so the media query targets the wrapper, not the button. The
             desktop collapse control lives in the rail's foot (NavRail onToggle). */
          <span data-mw-topbar-toggle="menu">
            <Button
              iconOnly
              variant="ghost"
              size="sm"
              icon={<Menu size={20} />}
              onClick={onToggle}
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileOpen}
            />
          </span>
        )}
        {railBrand ? (
          /* The rail-aligned brand zone: both logo variants live stacked in one
             grid cell, centred over the rail's content column; the zone's right
             border continues the rail hairline up through the bar and its width
             rides the same tokens the rail animates, so collapse is one
             orchestrated move. The hidden variant is `inert` so the invisible
             link never takes keyboard focus; AppShell re-renders the bar on
             toggle, so the attribute tracks the state. */
          (brand || brandCollapsed) && (
            <div data-mw-topbar-brandzone="" data-collapsed={collapsed}>
              {brand && (
                <div data-mw-topbar-brand-wide="" inert={collapsed || undefined}>
                  {brand}
                </div>
              )}
              {brandCollapsed && (
                <div data-mw-topbar-brand-mark="" inert={!collapsed || undefined}>
                  {brandCollapsed}
                </div>
              )}
            </div>
          )
        ) : (
          brand && <div data-mw-topbar-brand="">{brand}</div>
        )}
      </div>
      {(context || utilities || account) && (
        <div data-mw-topbar-utils="" data-has-context={context ? "true" : undefined}>
          {context && <div data-mw-topbar-context="">{context}</div>}
          {utilities}
          {account && <TopBarAccount {...account} />}
        </div>
      )}
    </header>
  );
}

const css = `
[data-mw-topbar] {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  height: var(--chrome-bar-height);
  /* The chrome gutter (owner fine-tune, 9 Jul): space-sm, ~40 percent under
     the first lg pass. The rail carries the same inline padding, so the brand
     and the rail glyphs stay on one axis. */
  padding-inline: var(--space-sm);
  box-sizing: border-box;
  border-bottom: 1px solid var(--border-positive-primary);
}
/* Frosted chrome: the modal recipe (a theme-mirrored scrim over a backdrop
   blur), matching the Nav bar. It rides a ::before layer rather than the bar
   itself, so the backdrop-filter never makes the bar the containing block for a
   fixed utility a fork might drop into the slots. The page content scrolls under
   the sticky bar and shows through, blurred. */
[data-mw-topbar]::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--modal-scrim);
  -webkit-backdrop-filter: blur(var(--overlay-blur));
  backdrop-filter: blur(var(--overlay-blur));
}
[data-mw-topbar-left] {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}
/* One toggle, mobile only: the hamburger opens the overlay below the desktop
   breakpoint. At/above it the rail carries its own collapse control (NavRail's
   foot), so the bar shows the brand alone. The button itself is the shared
   Button (iconOnly ghost); the wrapper owns only the responsive show/hide. */
[data-mw-topbar-toggle] { display: inline-flex; }
@media (min-width: 1024px) { /* --mw-bp-desktop */
  [data-mw-topbar-toggle="menu"] { display: none; }
}
[data-mw-topbar-brand] {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  font-family: var(--font-brand);
  font-size: var(--type-md);
  color: var(--text-positive-primary);
}
/* Desktop brand alignment (owner, 9 Jul): the mark centres over the rail's 3rem
   icon column (NavRail's [data-mw-navrail-ico] slot), so the brand and the rail
   glyphs share one vertical axis in both rail states. Both bars carry the same
   space-sm inline padding, so the two columns start at the same x. */
@media (min-width: 1024px) { /* --mw-bp-desktop */
  [data-mw-topbar-brand] {
    flex: 0 0 var(--rail-icon-column);
    justify-content: center;
  }
}
[data-mw-topbar-utils] {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  flex-shrink: 0;
}

/* NARROW WIDTHS: the account NAME is the first thing to go, and the toggle never
   gives up its slot. (v5.4.3, from readilyhome.)

   The account trigger would not shrink, so on a 390px phone it demanded ~145px it
   did not have and ran 81px past the viewport, taking the body into horizontal
   scroll on every app route. Worse, the overflow squeezed the brand zone, which
   centres its child in whatever width flex leaves it, so the logo overflowed
   SYMMETRICALLY and landed on top of the hamburger: document.elementFromPoint at
   the button's centre returned the logo, and navigation was unreachable by tap on
   iPhone-width screens. The handler was fine the whole time. Nothing was clickable
   through it.

   Hiding the name is the honest trim: the glyph and chevron still identify the
   control, its accessible name still reads "Account: <name>", and the name itself
   is the first thing inside the menu it opens. */
[data-mw-topbar-toggle] { flex: 0 0 auto; }

@media (max-width: 767px) { /* below --mw-bp-tablet */
  /* Three levels, not two: DropdownMenu styles this label as
     [data-mw-menu-trigger] [data-mw-menu-label], which is the same specificity as
     a two-part selector here, and its sheet is inserted later because the trigger
     renders inside this bar. A tie loses to source order, and the first version of
     this rule silently did nothing: the label still computed to display:flex. */
  [data-mw-topbar-utils] [data-mw-menu-trigger] [data-mw-menu-label] { display: none; }
  /* The same trim for whatever the consumer puts in the utilities slot. The BAR
     owns the horizontal budget, so it is the bar's job to reclaim it, and a
     consumer hand-rolling this per fork would be fourteen copies of one rule.
     readilyhome passes a labelled "Gift" and "Notifications" here, 217px of the
     390 available on a phone. The icon and the accessible name both survive; only
     the visible word goes. */
  [data-mw-topbar-utils] [data-mw-button] [data-mw-button-label] { display: none; }
  /* Belt and braces: if a consumer puts something else unshrinkable in the
     cluster, the brand clips rather than climbing on top of the toggle. */
  [data-mw-topbar-brandzone],
  [data-mw-topbar-brand] {
    justify-items: start;
    overflow: hidden;
  }
}
/* With a context slot the region GROWS to span the bar: the context takes the
   leading edge and its auto margin pushes the cluster to the trailing edge
   (the promoted readilyhome layout). Without it, nothing changes. */
[data-mw-topbar-utils][data-has-context] {
  flex: 1 1 auto;
  min-width: 0;
}
[data-mw-topbar-context] {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  margin-inline-end: auto;
  min-width: 0;
}

/* The rail-aligned brand zone (v3.16.0, opt-in via the collapsed prop).
   Geometry: the bar and the rail share the same space-sm inline padding, so a
   zone of width (rail-width minus space-sm) puts its right border at exactly
   the rail's outer edge, continuing the rail hairline up through the bar; its
   space-sm padding-right then makes the zone's CONTENT box congruent with the
   rail's content box, so a centred logo is centred over the links by
   construction, at either width. The width transition rides the exact tokens
   the rail animates with, one orchestrated move.

   The crossfade staggers by direction: the outgoing variant fades over the
   first 40 percent of the move (gone before the column can crowd it), the
   incoming one arrives over the back 55 percent with a 0.96 scale settle. The
   still dial and reduced motion collapse the durations with the motion tokens,
   so the swap degrades to an instant switch. */
[data-mw-topbar-brandzone] {
  position: relative;
  display: grid;
  place-items: center;
  align-self: stretch;
  box-sizing: border-box;
  min-width: 0;
}
[data-mw-topbar-brandzone] > * {
  grid-area: 1 / 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}
/* Below desktop the rail is an overlay, so the zone has no rail to align to:
   it behaves like the legacy inline brand and shows only the wide variant. */
[data-mw-topbar-brand-mark] { opacity: 0; pointer-events: none; }
@media (min-width: 1024px) { /* --mw-bp-desktop */
  [data-mw-topbar-brandzone] {
    width: calc(var(--rail-width) - var(--space-sm));
    padding-right: var(--space-sm);
    border-right: 1px solid var(--border-positive-primary);
    transition: width var(--motion-reveal-duration) var(--motion-ease);
  }
  [data-mw-topbar-brandzone][data-collapsed="true"] {
    width: calc(var(--rail-width-collapsed) - var(--space-sm));
  }
  [data-mw-topbar-brand-wide] {
    opacity: 1;
    transition: opacity calc(var(--motion-reveal-duration) * 0.55) var(--motion-ease) calc(var(--motion-reveal-duration) * 0.45);
  }
  [data-mw-topbar-brandzone][data-collapsed="true"] [data-mw-topbar-brand-wide] {
    opacity: 0;
    transition: opacity calc(var(--motion-reveal-duration) * 0.4) var(--motion-ease);
  }
  [data-mw-topbar-brand-mark] {
    opacity: 0;
    transform: scale(0.96);
    pointer-events: none;
    transition:
      opacity calc(var(--motion-reveal-duration) * 0.4) var(--motion-ease),
      transform calc(var(--motion-reveal-duration) * 0.4) var(--motion-ease);
  }
  [data-mw-topbar-brandzone][data-collapsed="true"] [data-mw-topbar-brand-mark] {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
    transition:
      opacity calc(var(--motion-reveal-duration) * 0.55) var(--motion-ease) calc(var(--motion-reveal-duration) * 0.45),
      transform calc(var(--motion-reveal-duration) * 0.55) var(--motion-ease) calc(var(--motion-reveal-duration) * 0.45);
  }
}
`;
