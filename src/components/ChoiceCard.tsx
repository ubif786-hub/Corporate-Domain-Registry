"use client";

import { isValidElement, useId, type ReactNode } from "react";
import { Radio } from "@/components/Radio";
import { Checkbox } from "@/components/Checkbox";

/* ============================================================
   ChoiceCard — a selectable card. It wraps the real Radio (mode="single") or
   Checkbox (mode="multi") as its indicator and adds a card surface: the whole card
   is the click target, and the selected state is an accent border + accent-soft
   fill. It does NOT reinvent selection state; the wrapped control owns it, and the
   card reflects the control via :has(input:checked / :disabled / :focus-visible),
   so a11y, form submission, and native group behaviour come for free.

   mode="single" delegates to Radio, so it MUST be rendered inside a RadioGroup
   (which owns the shared name and the single-select). mode="multi" delegates to a
   standalone Checkbox (independent booleans). Description is the wrapped control's
   own second line: Radio.description (inside the label) or Checkbox.helper (below).

   IMAGE variant (v4.8.0): pass `image` to turn the card into a media tile — the
   image fills the card and the label rides a bottom gradient scrim, legible over
   any photo (the roof-shape / roof-material onboarding steps; also the artist
   tool). Unselected tiles recede (blurred + dimmed) BY DEFAULT, which unselectedMedia
   can turn off for a first-choice screen (AUD-20); the selected tile shows the
   full image with the accent border and its indicator. The slot takes EITHER a
   { src } photo OR a ReactNode (line-art illustration), so one variant serves
   both. The tile is DECORATIVE: the wrapped control's label names the choice
   and the media wrapper is aria-hidden, so an `alt` never reached assistive
   tech; the field is gone (deprecated and removed, 27 Aug 2026). Additive:
   `image` unset renders the byte-identical checkbox/radio card, so nothing
   changes for existing consumers. Works in both modes.

   A client component: its API takes onChange (a function prop), which only a client
   component can receive. Flat file, named export, inline tokens + hoisted style.
   ============================================================ */

export type ChoiceCardMode = "single" | "multi";

/** The image-variant photo slot. A ReactNode (line-art) may be passed to `image` instead, for
 *  illustrated tiles. The photo is DECORATIVE: the card's `label` names the choice, and the media
 *  wrapper is aria-hidden, so the image never reaches assistive tech. Anything the picture says
 *  that the label does not (a roof-shape picker whose label is a code) belongs in `label` or
 *  `description`.
 *
 *  There is no `alt`. It was deprecated and ignored on 27 Aug 2026 and REMOVED the same day, once
 *  a census over the fleet's app code found zero surviving consumers: readilyhome's
 *  OnboardingWizard and the kit demo both dropped theirs in the v5.11.0 fork pass, and the only
 *  `alt:` left anywhere under ~/projects is readilyhome-frontend, the frozen Ropstam export, which
 *  carries its own copy of this file and never receives the mother's. */
export interface ChoiceCardImage {
  src: string;
}

export interface ChoiceCardProps {
  mode: ChoiceCardMode;
  /** The card's primary line and the control's accessible name. */
  label: string;
  /** Optional live result count shown beside the label ("Insurance · 4") and
   *  announced with it (v4.8.0). Opt-in: pass it ONLY where results are shown
   *  live (a filter row over a visible list); leave unset in filter panels
   *  where a count is unavailable or would be wrong. */
  count?: number;
  /** Optional second line. Single: Radio's description; multi: Checkbox's helper. */
  description?: string;
  /** The IMAGE variant (v4.8.0): a { src } photo (decorative) OR a ReactNode line-art
   *  illustration. When set, the card becomes a media tile — image behind, label
   *  on a bottom scrim, blurred-when-unselected. Omit for the plain card. */
  image?: ReactNode | ChoiceCardImage;
  /** Single: the Radio value (falls back to label). Multi: unused since 27 Aug 2026, when the
   *  checkbox id stopped embedding it (ids are minted by useId alone); accepted so call sites
   *  compile. */
  value?: string;
  /** Multi: unused since 27 Aug 2026. It seeded the checkbox id, which is now minted by useId
   *  alone, and Checkbox takes no native name, so nothing reaches the DOM; accepted so call sites
   *  compile. Single: the RadioGroup owns the name. */
  name?: string;
  /** How the IMAGE variant treats tiles that are NOT selected. Only meaningful with `image`.
   *
   *  "recede" (default, unchanged): unselected tiles blur and dim so the chosen one reads as
   *  chosen. Right when the set is a gallery being narrowed, or when a choice has already been
   *  made and the screen is confirming it.
   *
   *  "steady": every tile stays crisp, and hover lifts the image slightly instead. Right when
   *  the user is choosing for the FIRST time and has not selected anything yet, because with
   *  nothing selected "recede" dims the entire set at once and the screen reads as broken
   *  rather than as waiting. That is not hypothetical: it is why readilyhome overrode this from
   *  fork-owned CSS on its roof-material step, after a first-time tester read the blurred grid
   *  as a loading failure (AUD-20, promoted 2 Sep 2026 so the override can be deleted).
   *
   *  The two are mutually exclusive looks of one thing, so per D-S1 they are ONE named enum
   *  prop rather than a boolean like `noBlur`. */
  unselectedMedia?: "recede" | "steady";
  /** Multi only: single-select state lives in the enclosing RadioGroup. */
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}

// A { src } object is the photo slot; a React element is line-art; anything else
// (unset) means no image. isValidElement splits the illustration from the photo
// object, since a plain { src } is not a renderable node.
function isPhoto(image: ReactNode | ChoiceCardImage | undefined): image is ChoiceCardImage {
  return (
    typeof image === "object" &&
    image !== null &&
    !isValidElement(image) &&
    "src" in image
  );
}

export function ChoiceCard({
  mode,
  unselectedMedia = "recede",
  label,
  count,
  description,
  image,
  value,
  // `name` is accepted (the type) and not read: see its prop comment.
  checked,
  defaultChecked,
  onChange,
  disabled,
}: ChoiceCardProps) {
  // Multi: the checkbox id is useId alone, no caller text. Until 26 Aug 2026 it was the bare
  // `${name}-${value}`, so two cards sharing both (FilterPanel mounted twice with one groups
  // array) shared an id, and a label's htmlFor resolved to the first match in the document: the
  // other card's input. Pass 2 put it under useId but kept `${name}-${value}` as a readable seed
  // with whitespace folded, and a fold collides ("Same day" and "Same-day" make one id), so the
  // seed went too (27 Aug 2026). The id shape is a contract change; see the changelog.
  const checkboxId = useId();
  // The count composes into the label line ("Insurance · 4") so the visible text
  // and the accessible name stay one string — the wrapped controls take string
  // labels by contract. Non-breaking spaces join the unit so a narrow card never
  // orphans "· 4" onto its own line. `value` stays the caller's key, unaffected.
  const line = count != null ? `${label} · ${count}` : label;
  const hasImage = image != null;
  const media = hasImage ? (
    <div data-mw-choicecard-media="" aria-hidden="true">
      {isPhoto(image) ? (
        // Decorative by contract (the type comment): the label names the choice, and the
        // wrapper above is aria-hidden, so the alt is empty and the type offers no way to set it.
        <img src={image.src} alt="" draggable={false} />
      ) : (
        image
      )}
    </div>
  ) : null;
  return (
    // data-cursor-grow: the card is a real control (a native label+input inside),
    // but the click surface is a <label>, not a button/link — so the custom
    // cursor opts in explicitly to grow over it (v4.8.0).
    <div data-mw-choicecard="" data-mode={mode} data-has-image={hasImage ? "" : undefined} data-unselected-media={hasImage ? unselectedMedia : undefined} data-cursor-grow="">
      <style href="magentaweb-choicecard" precedence="default">{css}</style>
      {media}
      {mode === "single" ? (
        <Radio value={value ?? label} label={line} description={description} disabled={disabled} />
      ) : (
        <Checkbox
          id={checkboxId}
          label={line}
          helper={description}
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={onChange}
          disabled={disabled}
        />
      )}
    </div>
  );
}

const css = `
[data-mw-choicecard] {
  display: block;
  box-sizing: border-box;
  border: 1px solid var(--border-positive-primary);
  border-radius: var(--component-radius);
  background: var(--background-positive-secondary);
  transition:
    border-color var(--motion-transition),
    background var(--motion-transition);
}
/* The wrapped control's label is the click surface: fill the card, carry the padding,
   so clicking anywhere on the row toggles, not just the indicator. */
[data-mw-choicecard] label {
  width: 100%;
  box-sizing: border-box;
  padding: var(--space-md);
}
/* Multi: the standalone Checkbox root fills the card, and its helper (the description
   line, a sibling of the label) aligns under the padded label. The label's bottom
   padding shrinks ONLY when a helper follows to carry the card's bottom padding;
   without one the label keeps the full pad (the fix for the clipped bottom on
   description-less cards). */
[data-mw-choicecard][data-mode="multi"] [data-mw-checkbox] {
  width: 100%;
  gap: 0;
}
[data-mw-choicecard][data-mode="multi"] [data-mw-checkbox]:has(> p) > label {
  padding-bottom: var(--space-2xs);
}
[data-mw-choicecard][data-mode="multi"] [data-mw-checkbox] > p {
  margin-top: 0;
  padding: 0 var(--space-md) var(--space-md);
}
/* Selected: reflect the wrapped input's checked state; no duplicated state. */
[data-mw-choicecard]:has(input:checked) {
  border-color: var(--accent-base);
  background: var(--accent-soft);
}
[data-mw-choicecard]:hover:not(:has(input:disabled)):not(:has(input:checked)) {
  border-color: var(--text-positive-tertiary);
}
/* Disabled: dim ONCE, at the same 0.5 opacity the rest of the kit uses for a
   disabled control (Switch, Radio, Checkbox all dim their own label to 0.5;
   there is no semantic token for it yet, so this reuses their literal value
   rather than inventing a second one). The card used to dim to 0.6 while the
   WRAPPED control also dimmed its own label to 0.5, compounding to 0.30 and
   making the label read fainter than its own description line (audit finding,
   4 Sep 2026). The wrapped control's own disabled dimming is cancelled just
   below so only this one opacity applies to the whole card. */
[data-mw-choicecard]:has(input:disabled) {
  opacity: 0.5;
}
/* Cancel the wrapped control's own disabled opacity (Radio/Checkbox's
   label[data-disabled="true"] rule) so the card's single 0.5 above is the
   only dimming applied. Matched on [data-mode] alongside [data-mw-choicecard]
   for specificity (0,3,1) so it reliably beats the wrapped control's own rule
   (0,2,1) regardless of <style> insertion order. */
[data-mw-choicecard][data-mode="single"] label[data-disabled="true"],
[data-mw-choicecard][data-mode="multi"] label[data-disabled="true"] {
  opacity: 1;
}
/* One focus ring, on the card; suppress the control's own inner ring inside a card. */
[data-mw-choicecard]:has(input:focus-visible) {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
[data-mw-choicecard] input:focus-visible + [data-mw-radio-circle],
[data-mw-choicecard] input:focus-visible + [data-mw-checkbox-box] {
  outline: none;
}

/* ---------- IMAGE variant (v4.8.0) ---------- */
/* The media tile: the image fills the card, the wrapped control's label rides a
   bottom scrim. */
[data-mw-choicecard][data-has-image] {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 9rem;
  overflow: hidden;
  background: var(--background-positive-secondary);
}
[data-mw-choicecard-media] {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: filter var(--motion-transition), opacity var(--motion-transition);
}
[data-mw-choicecard-media] > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
/* A ReactNode illustration (line-art) sits centred at a comfortable inset,
   never edge-bled like a photo. */
[data-mw-choicecard-media] > :not(img) {
  max-width: 76%;
  max-height: 68%;
}
/* Unselected tiles recede: a soft blur + dim, so the selected (crisp, full) tile
   reads as chosen. The selected card clears the filter.
   SCOPED to the default since AUD-20: with nothing selected yet this dims the WHOLE set at
   once, which reads as broken rather than as waiting, so a first-choice screen passes
   unselectedMedia="steady" instead. */
[data-mw-choicecard][data-has-image][data-unselected-media="recede"]:not(:has(input:checked)) [data-mw-choicecard-media] {
  filter: blur(3px) saturate(0.88);
  opacity: 0.82;
}

/* "steady": every tile stays crisp. The blur was doing double duty as the "this is
   pickable" cue, so removing it without replacing it leaves the grid inert-looking. A
   hover lift stands in, riding the motion dial so it disappears under prefers-reduced-motion
   with everything else. This is the promoted form of readilyhome's fork-owned override
   (AUD-20); the fork's copy is deleted in the same release. */
[data-mw-choicecard][data-has-image][data-unselected-media="steady"] [data-mw-choicecard-media] {
  transition: transform var(--motion-transition), filter var(--motion-transition), opacity var(--motion-transition);
}
[data-mw-choicecard][data-has-image][data-unselected-media="steady"]:hover [data-mw-choicecard-media] {
  transform: scale(1.03);
}
/* The bottom scrim: a constant-dark gradient under the label, above the media. */
[data-mw-choicecard][data-has-image]::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 62%;
  z-index: 1;
  background: linear-gradient(to top, var(--media-scrim), transparent);
  pointer-events: none;
}
/* The label overlays the bottom, above media + scrim. margin-top:auto pins it to
   the card foot in the flex column. The positive TEXT family is redefined to the
   constant media ink ONLY on the label (the inverted-band idiom), so the wrapped
   Radio/Checkbox — whose label colour is an inline var() — reads light over the
   scrim, while a line-art media node above keeps the normal dark tokens and stays
   visible on the card surface. */
[data-mw-choicecard][data-has-image] label,
[data-mw-choicecard][data-has-image][data-mode="multi"] [data-mw-checkbox] {
  /* static, NOT relative (v4.10.2): the indicator below positions against the
     CARD's top-left, and a relative label would capture it as the containing
     block and pin it to the label — which margin-top:auto holds at the card
     FOOT. z-index still applies here: these are flex items of the card, and a
     flex item honours z-index as if it were positioned. */
  position: static;
  z-index: 2;
  margin-top: auto;
  --text-positive-primary: var(--media-ink);
  --text-positive-secondary: color-mix(in srgb, var(--media-ink) 82%, transparent);
  --text-positive-tertiary: color-mix(in srgb, var(--media-ink) 66%, transparent);
}
[data-mw-choicecard][data-has-image][data-mode="multi"] [data-mw-checkbox] {
  width: 100%;
}
/* The indicator rides the card's TOP-LEFT on a media tile (v4.10.2), not the
   label line. Two reasons. It frees the whole label line for the text: in a
   five-across grid the inline mark plus --radio-label-gap ate most of a narrow
   tile, so "Concrete" had about 2rem to live in. And selection reads at the
   corner the eye already checks, away from the label.

   CSS-ONLY, by design: the DOM is untouched, so every selector that walks from
   the mark still matches — the card's inner-ring suppression
   (input:focus-visible + [data-mw-radio-circle]), the docs VariantCatalog's
   name treatment, and Radio's label-scoped hover and disabled rules. Hoisting
   the mark in the DOM would have broken all four silently.

   Scoped to [data-has-image]: the PLAIN card already carries its mark at the
   top-left of its content box (Radio's align-items: flex-start), so it needs
   nothing and gets nothing. */
[data-mw-choicecard][data-has-image] [data-mw-radio-circle],
[data-mw-choicecard][data-has-image] [data-mw-checkbox-box] {
  position: absolute;
  top: var(--space-sm);
  left: var(--space-sm);
  z-index: 3;
  /* The backing plate. The card top has NO scrim (the ::after gradient fades to
     transparent going up), and the mark's own fill and border are theme-tokens,
     so a near-white mark would vanish on a light roof in light theme and a dark
     one on dark shingle in dark. The media pair is theme-CONSTANT, which is
     what a photograph needs: a constant-light disc on a constant-dark halo
     reads on clay and on slate, in either theme.

     Only the fill and the halo are set here. border-color is deliberately left
     alone so Radio's resting, :hover, and [data-checked] accent border rules all
     still land — the checked mark keeps its accent ring and its accent dot, which
     is what ties it to the card's accent edge as ONE selection signal. */
  background: var(--media-ink);
  /* 3xs, not 2xs: at 2xs the halo read as a thick outline around the mark rather
     than as the mark sitting on a ground. Half the width still separates a light
     disc from a light roof, because the job is separation, not weight. */
  box-shadow: 0 0 0 var(--space-3xs) var(--media-scrim);
}
/* THE CLICK TARGET (v4.10.2). The wrapped control's <label> is the click
   surface, and on a media tile margin-top:auto pins it to the card foot, so it
   only ever covered its own text line. Everything above it — the photograph,
   which is the thing being chosen — belonged to no clickable element: about a
   third of the tile was live, in two islands, with a dead gap between them.

   Nothing was intercepting those clicks. The scrim is pointer-events:none at
   z-1 and the media sits at z-0; the label simply was not there to be hit.

   So the label grows a transparent ::before that fills the card. It resolves
   against the CARD because the label is position:static and the card is
   position:relative, which is the same property this variant already relies on
   to put the mark in the corner. The mark stays above it at z-3 and keeps its
   own hit area. No DOM change, so every selector that walks from the mark still
   matches, and the plain card is untouched. */
[data-mw-choicecard][data-has-image] label::before {
  content: "";
  position: absolute;
  inset: 0;
}
/* Selected media tile: keep the card's accent edge (the token redefinition above
   only touched the text family, so the resting border + the accent selection are
   the normal tokens) but drop the accent-soft FILL — the image is the surface. */
[data-mw-choicecard][data-has-image]:has(input:checked) {
  background: var(--background-positive-secondary);
  /* The accent edge doubles to ~2px on a media tile. A 1px hairline that reads
     as selection against a flat card surface disappears against a photograph.
     Done as an INSET shadow rather than a wider border so the card does not
     shift by a pixel when it is picked. */
  box-shadow: inset 0 0 0 1px var(--accent-base);
}
`;
