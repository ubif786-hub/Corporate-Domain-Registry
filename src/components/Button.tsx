import {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  CSSProperties,
  MouseEvent,
  ReactElement,
  ReactNode,
} from "react";
import Link from "next/link";
import { tokenNumber } from "@/components/internal/styles";

/* ============================================================
   Button — four variants (primary / secondary / ghost / ink), three sizes,
   optional leading/trailing icon.

   Hover motion (Linear / Vercel / Mercury style) ships on every Button:
   the label slides up and fades out while a duplicate slides up from below
   to replace it, and a trailing icon nudges right / a leading icon nudges
   left. An icon-only button has no label to nudge toward, so it runs the SAME
   dual-stack vertical motion on the icon itself: the glyph rises and fades
   while a clone rises from below to replace it. All of it rides
   --motion-transition, so the motion dial controls the feel, and the
   prefers-reduced-motion block zeroes the translation entirely (no slide, the
   glyph simply stays). Disabled buttons fire no hover motion.

   The motion lives in a hoisted <style> block because :hover and the dual
   label stack can't be expressed from inline CSSProperties. React 19 dedupes
   by precedence so the rule emits once across the page. Stays a server
   component — no hooks, pure CSS.

   aria-disabled is the in-flight idiom (v5.12.0). A control the user is
   focused on when it flips (a submit button during its own save, "Mark all
   read" at the moment it clears the count that enables it) must not take the
   native attribute, which blurs it to <body>; behind a dialog the page is
   inert, so the next Tab then lands back inside the dialog instead of at the
   page top. aria-disabled keeps the tab stop and the focus ring, and Button
   makes it honest: data-disabled (derived from either attribute) gates the
   hover fill and the label motion, the sheet's [aria-disabled="true"] rule
   mirrors :disabled, and the click is cancelled (onClick never runs; a submit
   or reset button prevents its default, so Enter in a text field, which
   clicks the default button, cannot re-submit a form in flight). The guard
   is attached only when there is a click to cancel, because a function prop
   cannot cross the RSC boundary: the idiom is a CLIENT-state affordance, and
   a statically unavailable control in a server component keeps `disabled`.
   ============================================================ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "ink";
/* xs (v6.30.0, HQ v7 system pass, theme 2): the PANEL HEAD rung, for a ghost or a secondary
   beside a Heading 6 (a Refresh, a "Show" on a collapsed group), where sm at about 35 px
   towers over the title's 21 px line box the way an sm segmented control does. It sits on
   --control-size-sm (28 px), the same token SegmentedControl xs lands near, one type rung
   and one space rung under sm. A primary never takes xs: a filled accent box at 28 px is a
   chip, so a primary or ink button asked for xs renders sm and warns in development. */
type ButtonSize = "xs" | "sm" | "md" | "lg";
type IconPosition = "left" | "right";

interface ButtonBase
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    // The anchor passthrough props that make sense on a link-mode button (href set).
    // They spread onto the next/link anchor; on a plain button they are simply unused.
    Pick<AnchorHTMLAttributes<HTMLAnchorElement>, "target" | "rel" | "download"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** "accent": the icon renders in the accent ink while the label keeps its
   *  variant color (the accent-arrow treatment for ghost view links). Composes
   *  with every variant, size, iconPosition, and iconOnly; disabled mutes it
   *  together with the label. Default undefined = the icon rides the label color. */
  iconTone?: "accent";
  /** Render as a next/link anchor with identical look and hover motion. Navigation
   *  CTAs must be links (soft navigation, no full-document reload), never buttons. */
  href?: string;
}

/** The default: a labelled button, with an optional leading or trailing icon. */
interface LabelledButtonProps extends ButtonBase {
  iconOnly?: false;
  children: ReactNode;
  icon?: ReactElement;
  iconPosition?: IconPosition;
}

/** Icon-only mode: no visible label, square padding. Orthogonal to variant (works
 *  with primary / secondary / ghost) and to href / disabled. The icon carries no
 *  accessible name, so aria-label is REQUIRED and enforced here at the type level. */
interface IconOnlyButtonProps extends ButtonBase {
  iconOnly: true;
  icon: ReactElement;
  "aria-label": string;
  children?: never;
  iconPosition?: never;
}

export type ButtonProps = LabelledButtonProps | IconOnlyButtonProps;

// Button is the one control in the kit whose size is an INLINE STYLE rather than a
// [data-size] rule, because its padding pairs with a font step and a variant fill that
// never wanted a selector of their own. That made Button unselectable BY SIZE, and Button
// is the height reference every other field shell is graded against (CG-1): a probe could
// find "a Button" but not "the sm Button", so the sm and lg rows of the parity matrix had
// no reference and went unmeasured. data-size below is a read-only mirror of the prop,
// rendered for that reason and deliberately styled by nothing: keep the sizeMap as the
// single source of the geometry, and do NOT add [data-mw-button][data-size="x"] rules
// beside it, or the two will drift and the probe will grade against the wrong one.
const sizeMap: Record<ButtonSize, { padding: string; font: string }> = {
  xs: { padding: "var(--space-3xs) var(--space-xs)", font: "var(--type-xs)" },
  sm: { padding: "var(--space-xs) var(--space-sm)", font: "var(--type-sm)" },
  md: { padding: "var(--space-sm) var(--space-md)", font: "var(--type-md)" },
  lg: { padding: "var(--space-md) var(--space-lg)", font: "var(--type-lg)" },
};

// Icon-only buttons pad equally on all four sides so the box is square around the
// icon (the icon carries its own size). One step down from the labelled vertical
// padding at each size, so an icon-only button reads a touch more compact.
const iconOnlyPadMap: Record<ButtonSize, string> = {
  xs: "var(--space-3xs)",
  sm: "var(--space-xs)",
  md: "var(--space-sm)",
  lg: "var(--space-md)",
};

const variantMap: Record<ButtonVariant, CSSProperties> = {
  primary: {
    // background lives in the hoisted sheet (not inline) so the :hover fill can
    // win the cascade — an inline declaration beats every sheet rule, the same
    // audit-F7 class the cursor fix below records.
    color: "var(--text-on-accent)",
    borderColor: "var(--accent-base)",
  },
  secondary: {
    // background lives in the hoisted sheet (not inline) so the app shell's
    // canvas-flip can raise it to the panel surface — v4.8.0 surface hierarchy.
    color: "var(--text-positive-primary)",
    borderColor: "var(--border-positive-secondary)",
  },
  ghost: {
    // background lives in the hoisted sheet for the same cascade reason as
    // primary: ghost carries a resting fill AND a hover fill, and neither can
    // be reached from an inline declaration.
    color: "var(--text-positive-primary)",
    borderColor: "transparent",
  },
  // ink: the high-contrast NEUTRAL fill (the ArtistHQ modal-submit treatment,
  // "Log it"). The fill is --text-positive-primary and the label is
  // --text-negative-primary: in light theme that is the near-black ink with a
  // light label; in dark theme text-positive-primary flips to the near-white
  // ink and text-negative-primary to the near-black, so ink MIRRORS to a light
  // fill with a dark label. Chosen over a fixed dark fill on purpose: the
  // variant's job is "the strongest neutral fill on this surface", and a
  // pinned dark fill would vanish into a dark page. The pair are exact
  // inverses by definition (v1.0.1), so contrast stays maximal per theme.
  ink: {
    background: "var(--text-positive-primary)",
    color: "var(--text-negative-primary)",
    borderColor: "var(--text-positive-primary)",
  },
};

const buttonCss = `
[data-mw-button] {
  cursor: pointer;
}
/* Secondary surface hierarchy (v4.8.0): the outlined secondary button takes the
   PANEL surface fill (not transparent) so it reads as a raised object on the
   shell, matching cards. Set from the sheet (not inline) so the app shell's
   canvas-flip can raise it to --background-positive-primary on a secondary
   canvas; the outline is the tier separator on any ground. Ghost stays
   transparent (the no-fill tier). */
[data-mw-button][data-variant="primary"] {
  background: var(--accent-base);
}
[data-mw-button][data-variant="secondary"] {
  background: var(--background-positive-secondary);
}
/* Ghost rests with NO fill at all: it is the no-chrome tier, and at rest it
   should read as text. The fill is the HOVER affordance and nothing else, which
   is what separates it from secondary (a fill and an outline at rest). Declared
   here rather than inline so the hover rule below can win the cascade — an
   inline background beats every sheet rule, transparent included. */
[data-mw-button][data-variant="ghost"] {
  background: transparent;
}
/* Hover fills (v4.10.2). Primary shifts its accent fill away from the label ink
   by a fixed perceptual step (--accent-hover-lift). Secondary and ghost take the
   SAME shared neutral hover wash — the DropdownMenu secondary trigger's
   established idiom, and the reason the wash is an alpha over transparent: it
   composes on whatever ground the control sits on. For secondary the wash
   replaces its resting panel fill; for ghost it is the whole affordance,
   arriving from nothing.

   The trailing :not(:disabled) is not decoration. It carries the intent (a
   disabled control lights up for nobody, matching the motion rules below) and
   it lifts these to (0,5,0), one step above the AppShell canvas-flip's
   (0,4,0) resting rule, so the hover still lands on a secondary canvas. Without
   it the two tie on specificity and the winner would depend on which hoisted
   sheet React emitted first. */
[data-mw-button][data-variant="primary"]:hover:not([data-disabled="true"]):not(:disabled) {
  background: var(--accent-hover-lift);
}
[data-mw-button][data-variant="secondary"]:hover:not([data-disabled="true"]):not(:disabled),
[data-mw-button][data-variant="ghost"]:hover:not([data-disabled="true"]):not(:disabled) {
  background: var(--background-hover-wash);
}
/* A ghost on the SECONDARY ground (an AppShell secondary canvas, a surface panel) takes the
   strong wash on hover (v6.30.0, D31's second tier): the 8% wash over a ground that is itself
   a wash of the ink is invisible, so the hover was not there. The strong tier is one clear
   step above the ground. Specificity (0,6,0) so it beats the pair above wherever both match. */
[data-mw-appshell][data-canvas="secondary"] [data-mw-button][data-variant="ghost"]:hover:not([data-disabled="true"]):not(:disabled),
[data-mw-panel][data-variant="surface"] [data-mw-button][data-variant="ghost"]:hover:not([data-disabled="true"]):not(:disabled) {
  background: var(--background-hover-wash-strong);
}
/* xs sits on the 28 px control rung (the pad plus the xs type rung lands short of it, and a
   panel-head control that is shorter than its own touch floor reads as a chip). */
[data-mw-button][data-size="xs"] {
  min-height: var(--control-size-sm);
}
/* An icon-only GHOST on a phone has no visible boundary and a box under the touch floor, so
   nothing tells a thumb where the button is (v6.30.0). Below the tablet breakpoint it takes the
   --control-size-touch box and the control wash as its resting ground; the hover wash still
   arrives on top. Ghosts only: a secondary has its outline and a primary its fill. */
@media (max-width: 767.98px) { /* --mw-bp-tablet */
  [data-mw-button][data-variant="ghost"][data-icon-only="true"] {
    min-width: var(--control-size-touch);
    min-height: var(--control-size-touch);
    justify-content: center;
    background: var(--background-control-wash);
  }
}
[data-mw-button]:focus-visible {
  /* The house keyboard ring (BrandMark and BackToTop run the same pair). The
     docs promised this ring but no rule shipped, leaving the UA default. */
  outline: var(--focus-outline);
  outline-offset: 2px;
}
[data-mw-button-label] {
  position: relative;
  display: inline-flex;
  overflow: hidden;
  white-space: nowrap;
  vertical-align: bottom;
}
[data-mw-button-label-primary],
[data-mw-button-label-clone] {
  display: inline-block;
  transition:
    transform var(--motion-transition),
    opacity var(--motion-transition);
}
/* Clone waits one line below, clipped by the wrapper's overflow. */
[data-mw-button-label-clone] {
  position: absolute;
  left: 0;
  top: 0;
  transform: translateY(100%);
  opacity: 0;
}
/* Icon-only dual stack: the same vertical motion the label runs. The wrapper
   clips; the primary glyph sits in flow (sizing the box), the clone waits one
   glyph-height below until hover. */
[data-mw-button-icon-stack] {
  position: relative;
  display: inline-flex;
  overflow: hidden;
}
[data-mw-button-icon-primary],
[data-mw-button-icon-clone] {
  display: inline-flex;
  transition:
    transform var(--motion-transition),
    opacity var(--motion-transition);
}
[data-mw-button-icon-clone] {
  position: absolute;
  left: 0;
  top: 0;
  transform: translateY(100%);
  opacity: 0;
}
[data-mw-button-icon] {
  display: inline-flex;
  align-items: center;
  transition: transform var(--motion-transition);
}
[data-mw-button]:hover:not([data-disabled="true"]) [data-mw-button-label-primary] {
  transform: translateY(-100%);
  opacity: 0;
}
[data-mw-button]:hover:not([data-disabled="true"]) [data-mw-button-label-clone] {
  transform: translateY(0);
  opacity: 1;
}
[data-mw-button]:hover:not([data-disabled="true"]) [data-mw-button-icon-primary] {
  transform: translateY(-100%);
  opacity: 0;
}
[data-mw-button]:hover:not([data-disabled="true"]) [data-mw-button-icon-clone] {
  transform: translateY(0);
  opacity: 1;
}
[data-mw-button]:hover:not([data-disabled="true"]) [data-mw-button-icon="right"] {
  transform: translateX(var(--motion-nudge-distance));
}
[data-mw-button]:hover:not([data-disabled="true"]) [data-mw-button-icon="left"] {
  transform: translateX(calc(-1 * var(--motion-nudge-distance)));
}
/* iconTone="accent": the icon (leading, trailing, or the icon-only dual stack)
   takes the accent ink while the label keeps its variant color. Applied as
   color, so the button-level disabled opacity mutes it exactly like the label,
   and the clone spans inherit through their wrappers. */
[data-mw-button][data-icon-tone="accent"] [data-mw-button-icon],
[data-mw-button][data-icon-tone="accent"] [data-mw-button-icon-stack] {
  color: var(--accent-ink);
}
/* aria-disabled mirrors :disabled (the Textarea rule, 5.11.0): an in-flight
   control that stays focusable must read disabled all the same. The hover
   rules above are gated on data-disabled, which Button derives from either
   attribute, so this pair only has to paint the resting look.

   The aria half is scoped to the button element on purpose (no backticks in
   here: this sheet is a template literal). :disabled can never match
   the link branch (an anchor has no disabled state, which is why href plus
   disabled is unsupported), so an unscoped attribute selector would hand a
   link-mode Button HALF a disabled state: dimmed and not-allowed, while
   data-disabled stays "false" on the anchor, so the hover fill and the label
   motion still run, the click guard is never attached and the link still
   navigates. A look without the behaviour is the worse half to ship. Button
   mode only, as the prop row says, and now in the sheet too. */
[data-mw-button]:disabled,
button[data-mw-button][aria-disabled="true"] {
  opacity: 0.5;
  cursor: not-allowed;
}
/* Reduced motion: no slide, no nudge. The label stays put, the clone never
   shows. (The global override also caps durations, but this removes the
   translation outright so nothing jumps instantly.) */
@media (prefers-reduced-motion: reduce) {
  [data-mw-button]:hover [data-mw-button-label-primary],
  [data-mw-button]:hover [data-mw-button-label-clone],
  [data-mw-button]:hover [data-mw-button-icon],
  [data-mw-button]:hover [data-mw-button-icon-primary],
  [data-mw-button]:hover [data-mw-button-icon-clone] {
    transform: none;
  }
  [data-mw-button]:hover [data-mw-button-label-primary],
  [data-mw-button]:hover [data-mw-button-icon-primary] { opacity: 1; }
  [data-mw-button]:hover [data-mw-button-label-clone],
  [data-mw-button]:hover [data-mw-button-icon-clone] { opacity: 0; }
}
`;

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  iconTone,
  href,
  style,
  disabled,
  iconOnly,
  children,
  // AX-16. HTML defaults a typeless <button> inside a <form> to type="submit",
  // so every Button written without a type was an ACCIDENTAL submit: eleven of
  // them across nine components in this library alone, and ChatComposer's Send
  // fired a real form submission on top of onSend, delivering the message twice
  // and wiping the thread. A design-system button is a button unless its author
  // says otherwise; passing type="submit" still works and is what FormModal and
  // every real submit control does.
  //
  // Destructured rather than left to ...rest for a second reason: type is
  // meaningless on an anchor, and in link mode (href set) it used to be spread
  // onto the next/link element. It now reaches only the <button> branch.
  type = "button",
  ...rest
}: ButtonProps) {
  // children and iconPosition are destructured out (even in icon-only mode, where
  // they are absent) so they never leak onto the DOM element via ...rest.
  // xs is refused on the filled variants (see the size type): a 28 px accent box is a chip.
  if (size === "xs" && (variant === "primary" || variant === "ink")) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`Button: size="xs" is for ghost and secondary only; a ${variant} button renders sm.`);
    }
    size = "sm";
  }
  const sz = sizeMap[size];
  const v = variantMap[variant];

  // The in-flight idiom (see the banner). React passes aria-disabled through
  // in rest; Button reads it too, so the look, the gated hover and the
  // cancelled click all follow from the one attribute. The guard replaces the
  // consumer's onClick only when a click has a default or a handler to cancel
  // (submit / reset, or an onClick), so a server-rendered aria-disabled
  // <Button type="button"> with no handler never grows a function prop that
  // the RSC serializer would refuse.
  const ariaDisabled = rest["aria-disabled"] === true || rest["aria-disabled"] === "true";
  const onClick =
    ariaDisabled && (type !== "button" || rest.onClick)
      ? (e: MouseEvent<HTMLButtonElement>) => {
          e.preventDefault();
        }
      : rest.onClick;

  // cursor lives in the hoisted sheet so :disabled's not-allowed can win the
  // cascade (audit F7: the inline pointer beat it).
  const merged: CSSProperties = {
    fontFamily: "var(--font-body)",
    fontSize: sz.font,
    fontWeight: tokenNumber("var(--weight-medium)"),
    lineHeight: tokenNumber("var(--leading-tight)"),
    // icon-only pads square (no label); labelled keeps the size's h/v padding.
    padding: iconOnly ? iconOnlyPadMap[size] : sz.padding,
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-xs)",
    borderRadius: "var(--component-radius)",
    borderWidth: "var(--control-border-weight)",
    borderStyle: "solid",
    transition:
      "background var(--motion-transition), color var(--motion-transition), border-color var(--motion-transition)",
    ...v,
    ...style,
  };

  // Icon-only: no label to nudge toward, so the icon runs the same dual-stack
  // vertical motion the label uses (the glyph rises and fades, a clone rises
  // from below to replace it). aria-label on the element (via rest) carries the
  // accessible name; the whole stack stays aria-hidden.
  const inner = iconOnly ? (
    <span data-mw-button-icon-stack="" aria-hidden="true">
      <span data-mw-button-icon-primary="">{icon}</span>
      <span data-mw-button-icon-clone="">{icon}</span>
    </span>
  ) : (
    <>
      {icon && iconPosition === "left" && (
        <span data-mw-button-icon="left" aria-hidden="true">{icon}</span>
      )}
      <span data-mw-button-label="">
        <span data-mw-button-label-primary="">{children}</span>
        <span data-mw-button-label-clone="" aria-hidden="true">{children}</span>
      </span>
      {icon && iconPosition === "right" && (
        <span data-mw-button-icon="right" aria-hidden="true">{icon}</span>
      )}
    </>
  );

  if (href) {
    // Anchors have no disabled state; a disabled navigation CTA is a design
    // smell, so href + disabled is not supported.
    return (
      <>
        <style href="magentaweb-button" precedence="default">{buttonCss}</style>
        <Link
          href={href}
          data-mw-button=""
          data-variant={variant}
          data-size={size}
          data-icon-tone={iconTone}
          data-icon-only={iconOnly ? "true" : undefined}
          data-disabled="false"
          style={{ ...merged, textDecoration: "none" }}
          {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {inner}
        </Link>
      </>
    );
  }

  return (
    <>
      <style href="magentaweb-button" precedence="default">{buttonCss}</style>
      <button
        data-mw-button=""
        data-variant={variant}
        data-size={size}
        data-icon-tone={iconTone}
        data-icon-only={iconOnly ? "true" : undefined}
        data-disabled={disabled || ariaDisabled ? "true" : "false"}
        disabled={disabled}
        style={merged}
        type={type}
        {...rest}
        onClick={onClick}
      >
        {inner}
      </button>
    </>
  );
}
