import { CSSProperties, ReactNode } from "react";

/* ============================================================
   InvoicePaper: the print-preview shell (Sprint 3A, from the
   ArtistHQ handoff: the invoice detail page's paper). A document
   surface with slots for the invoice anatomy: letterhead and
   meta across the head, the bill-to block, line items as
   children, totals, then the payment note and thank-you foot.

   ALWAYS-LIGHT PAPER (deliberate, the badge-solid precedent):
   an invoice prints white in dark mode too, so the sheet reads
   the theme-constant --paper-* tokens (surface, ink, muted ink,
   rule; see tokens.css, no dark mirror by design) instead of the
   theme-mirrored grounds. The paper then RE-GROUNDS the positive
   semantic family for its subtree via inline custom properties,
   so composed components (LineItemRow, PriceLabel, DataLabel)
   keep reading the tokens they always read and automatically
   speak paper: dark ink on the white sheet in both themes.

   THE TOKENS THAT FREEZE AT :ROOT (AX-15, 26 Aug 2026): a link,
   status, badge or accent ink is a CHOSEN colour per ground, not
   an alias of the family, so re-grounding the family never moved
   them, and in dark theme the sheet painted dark-theme inks
   (chosen for a near-black ground) on white: the link 1.59:1, the
   status and badge inks 2.2:1, the negative-surface chip fill
   1:1 against the sheet. The paper now pins the SAME list the
   inverted band re-declares in tokens.css, to the light-ground
   values, because the sheet is a light ground in both themes.

   PRINT CSS (printCss, default true): under @media print the
   classic isolate pattern hides everything else on the page
   (visibility, so layout is preserved for the paper's own
   geometry), lifts the paper to the page origin, and strips the
   screen chrome (shadow, radius), so the browser's print output
   is the invoice alone filling the sheet.

   Server component.
   ============================================================ */

export interface InvoicePaperProps {
  /** Head-left: the studio identity block. */
  letterhead?: ReactNode;
  /** Head-right: invoice number, dates, status. */
  meta?: ReactNode;
  /** The recipient block under the head. */
  billTo?: ReactNode;
  /** The line items region (LineItemRow rows, or any table). */
  children?: ReactNode;
  /** Right-aligned totals block under the items. */
  totals?: ReactNode;
  /** Payment instructions in the foot. */
  paymentNote?: ReactNode;
  /** The closing line under the payment note. */
  thankYou?: ReactNode;
  /** Emit the @media print isolate rules. Default true. */
  printCss?: boolean;
  /** Accessible name for the document region. Default "Invoice". */
  ariaLabel?: string;
}

// The responsive collapse (owner decision 3, 5 Sep 2026): below the tablet
// breakpoint the letterhead/meta head was measured collapsing to a one-
// character-per-line, 13px column, because the flex row's space-between
// squeezed the letterhead into whatever remainder the meta block (fixed by
// its own content width) left behind. Below --mw-bp-tablet the head stacks
// to a single column (each block gets the full measure) and the sheet's
// horizontal padding steps down from --space-2xl to the fluid
// --container-padding-x, so the text column keeps a readable measure at 390.
// Desktop (>= --mw-bp-tablet) is untouched: no rule here fires above it.
// !important is required because every value it overrides (padding, flex
// layout, text-align) is set inline on the element above, and only an
// !important stylesheet rule outranks an inline style (see the raw-pins note
// below on the same mechanic for custom properties).
const invoiceResponsiveCss = `
@media (max-width: 767.98px) { /* --mw-bp-tablet */
  [data-mw-invoice-paper] {
    padding-left: var(--container-padding-x) !important;
    padding-right: var(--container-padding-x) !important;
  }
  [data-mw-invoice-head] {
    flex-direction: column !important;
    align-items: flex-start !important;
  }
  [data-mw-invoice-meta] {
    text-align: left !important;
  }
}
`;

// The print isolate: hide the page by visibility (geometry survives, so the
// paper's own layout holds), reveal the paper subtree, pin it to the page
// origin at full width, and strip the screen-only dress.
const invoicePrintCss = `
@media print {
  body * {
    visibility: hidden;
  }
  [data-mw-invoice-paper],
  [data-mw-invoice-paper] * {
    visibility: visible;
  }
  [data-mw-invoice-paper] {
    position: absolute;
    inset: 0 auto auto 0;
    width: 100%;
    margin: 0;
    box-shadow: none;
    border: none;
    border-radius: 0;
  }
}
`;

export function InvoicePaper({
  letterhead,
  meta,
  billTo,
  children,
  totals,
  paymentNote,
  thankYou,
  printCss = true,
  ariaLabel = "Invoice",
}: InvoicePaperProps) {
  return (
    <section data-mw-invoice-paper="" aria-label={ariaLabel} style={paperStyle}>
      <style href="magentaweb-invoice-paper-responsive" precedence="default">
        {invoiceResponsiveCss}
      </style>
      {printCss ? (
        <style href="magentaweb-invoice-paper-print" precedence="default">
          {invoicePrintCss}
        </style>
      ) : null}

      {(letterhead || meta) && (
        <header data-mw-invoice-head="" style={headStyle}>
          {letterhead != null ? <div style={letterheadStyle}>{letterhead}</div> : <div />}
          {meta != null ? (
            <div data-mw-invoice-meta="" style={metaStyle}>
              {meta}
            </div>
          ) : null}
        </header>
      )}

      {billTo != null ? <div style={billToStyle}>{billTo}</div> : null}

      {children != null ? <div style={itemsStyle}>{children}</div> : null}

      {totals != null ? (
        <div style={totalsRowStyle}>
          <div style={totalsStyle}>{totals}</div>
        </div>
      ) : null}

      {(paymentNote || thankYou) && (
        <footer style={footStyle}>
          {paymentNote != null ? <div style={paymentNoteStyle}>{paymentNote}</div> : null}
          {thankYou != null ? <div style={thankYouStyle}>{thankYou}</div> : null}
        </footer>
      )}
    </section>
  );
}

/* ---------- inline styles ---------- */

// The paper: theme-constant surface + the subtree re-ground. Every composed
// component below keeps reading the positive family and gets paper values.
const paperStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xl)",
  padding: "var(--space-2xl)",
  background: "var(--paper-surface)",
  color: "var(--paper-ink)",
  boxShadow: "var(--shadow-raised)",
  borderRadius: "var(--component-radius)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-normal)",
  // The subtree re-ground (see the header note): positive semantics -> paper.
  "--text-positive-primary": "var(--paper-ink)",
  "--text-positive-secondary": "var(--paper-ink-muted)",
  "--text-positive-tertiary": "var(--paper-ink-muted)",
  "--background-positive-primary": "var(--paper-surface)",
  "--background-positive-secondary": "var(--paper-surface)",
  "--border-positive-primary": "var(--paper-rule)",
  "--border-positive-secondary": "var(--paper-rule)",
  // ============================================================================
  // THE RAW PINS. Twenty reads of the --raw-* ramps, the sanctioned exception to
  // the system rule that components read semantic tokens only (CLAUDE.md, "Rule:
  // components read only semantic tokens"). Owner decision D30, 27 Aug 2026:
  // KEEP THEM, DOCUMENTED. No --paper-accent-* set is minted. This is the
  // justification, written once here so each group below can be one line.
  //
  // WHY A SEMANTIC TOKEN IS THE WRONG LAYER, not merely the wrong value.
  // The paper is a THEME-CONSTANT surface. An invoice is a document, not a UI
  // surface: it prints white, so the sheet holds ONE light ground in BOTH themes
  // (--paper-*, declared once at :root in tokens.css with no dark mirror, by
  // design). A semantic token carries the opposite contract by construction: it
  // flips with the theme. Every one of the twenty names pinned below is
  // re-declared under html[data-theme="dark"] in tokens.css, so reading the
  // semantic here would import exactly the theme this surface has opted out of,
  // and did: in dark theme the sheet painted dark-theme inks (chosen for a
  // near-black ground) on white, the link at 1.59:1, the status and badge inks at
  // 2.2:1, the negative chip fill at 1:1 (AX-15, 26 Aug 2026). There is no
  // semantic token that means "the light-ground value whatever the theme", so the
  // pins reach past the semantic layer to the ramp, which is the same thing
  // html[data-theme="dark"] [data-section-bg="inverted"] does for the SAME list
  // in tokens.css. Minting --paper-accent-* would not remove the exception, only
  // relocate it: a second theme-constant family to keep in step with the first,
  // for one surface, and every fork would then have two places to retune.
  //
  // SECOND REASON, mechanical. These are INLINE custom properties, so a var()
  // here resolves against THIS element's own declarations. Aliasing a sibling
  // that is also re-declared here collapses the pair (the v5.4.0 note in
  // tokens.css). The six pins below that are NOT raw alias --paper-* instead,
  // which is theme-constant at :root and is not re-declared here, so the chart
  // and neutral-badge inks keep following the paper ink a fork tunes.
  //
  // WHAT A FORK OWNER INHERITS. Re-measured 27 Aug 2026 the honest way: each
  // fork's OWN brand.css was read off disk and injected verbatim over this page
  // in chromium, in light, in dark, and in auto under prefers-color-scheme dark.
  // The pins read the --raw-* RAMPS, which brand.css owns, so a fork that retunes
  // its ramp is followed here for free: seven forks declare --raw-magenta-*
  // values today (crescent-moon-art, global-medical-services, magenta-web,
  // meridian, readilyhome, tears-of-elune, zafiro) and their sheets take the
  // brand hue with no extra work.
  //
  // A fork that retuned the SEMANTIC --accent-base / -ink / -soft / -emphasis AT
  // :root would NOT be followed here, and would need a third definition beside
  // :root and the inverted band, from brand.css:
  //   [data-mw-invoice-paper] { --accent-ink: <value> !important; }
  // The !important is not optional: an inline custom property outranks any
  // stylesheet rule without it, and the same rule without it was measured to move
  // nothing at all.
  //
  // NO FORK IS IN THAT POSITION TODAY. Every accent declaration in every fork's
  // brand.css sits inside html[data-theme="dark"], its prefers-color-scheme
  // mirror, or a scoped block ([data-rh-cta="green"] on readilyhome,
  // [data-section-bg="accent"] on global-medical-services). Not one fork declares
  // an accent semantic at :root. So in LIGHT theme the page and the sheet resolve
  // the SAME value on all fourteen: both read that fork's own magenta-darken-20
  // for --accent-ink and for --badge-accent-fg. In DARK theme, and in auto under
  // a dark OS, all fourteen split, the MOTHER included (page #ca9bc7 against
  // sheet #884883), and that split is the theme-constant pin doing its job rather
  // than a fork defect. An earlier draft of this note claimed five forks carried a
  // latent light-theme split, with hex pairs; it was wrong and is withdrawn.
  //
  // The mechanical detail that made that count wrong is worth keeping, because it
  // will catch the next reader too: --badge-accent-fg reads --accent-base ONLY at
  // :root. Under html[data-theme="dark"] tokens.css re-declares it straight off
  // the ramp, so a fork's dark-block --accent-base override never reaches it.
  // Injecting those four forks' dark blocks moved the page value by nothing.
  //
  // The doc module's "Retuning a fork" note carries the shape of this where a
  // fork owner will actually meet it.
  //
  // GUARDED: scripts/check-raw-reads.mjs holds this file at 20 raw reads and
  // fails any NEW raw reader inside the sync unit. It counts TEXTUALLY and fails
  // closed, so a comment must describe a read rather than spell one. Raising the
  // ceiling means writing the reason here first.
  // ============================================================================

  // Link ink. --text-positive-link flips blue-darken-60 (light) to
  // blue-lighten-60 (dark); the sheet is a light ground in both, so it pins the
  // light value. C-17 pinned the same value on the inverted band.
  "--text-positive-link": "var(--raw-blue-darken-60)",

  // The negative (inverted) surface and its inks, six pins. The family MIRRORS
  // the positive one, so it flips whole: on a light root the negative chip is
  // dark with light ink, on a dark root it is light with dark ink. On the sheet
  // it must stay the light-root shape, or an IdChip, Tooltip, Badge solid,
  // ChatMessage bubble or HeroBanner scrim inside the paper inverts against a
  // white ground (the 1:1 fill AX-15 measured). --text-on-negative is pinned to
  // the VALUE, not aliased to --text-negative-primary the way the band block
  // aliases it, for the inline-var reason above. -secondary, -tertiary and
  // background -secondary have no consumer in the sync unit today; they are
  // pinned for family completeness, exactly as tokens.css reserves them.
  "--text-negative-primary": "var(--raw-neutral-lighten-95)",
  "--text-negative-secondary": "var(--raw-neutral-lighten-60)",
  "--text-negative-tertiary": "var(--raw-neutral-lighten-30)",
  "--background-negative-primary": "var(--raw-neutral-darken-95)",
  "--background-negative-secondary": "var(--raw-neutral-darken-90)",
  "--text-on-negative": "var(--raw-neutral-lighten-95)",

  // The chart aliases, five pins and NOT raw. They are pure aliases declared only
  // at :root, so they freeze at their declaration and a re-ground never moves
  // them (the v5.5.0 note). Here they alias --paper-*, which is theme-constant at
  // :root and is not re-declared on this element, so a chart on the sheet follows
  // the paper ink a fork tunes rather than a pinned hex.
  "--chart-text-primary": "var(--paper-ink)",
  "--chart-text-secondary": "var(--paper-ink-muted)",
  "--chart-text-tertiary": "var(--paper-ink-muted)",
  "--chart-axis-line-color": "var(--paper-rule)",
  "--chart-grid-line-color": "var(--paper-rule)",

  // Accent inks, three pins. A CHOSEN colour per ground, not an alias of the
  // accent family, so re-grounding the positive family never moved them. On the
  // sheet: the light-ground trio. ContactStrip (inside the showroom's own paper)
  // reads --accent-ink, so these paint on all fourteen sites.
  "--accent-ink": "var(--raw-magenta-darken-20)",
  "--accent-soft": "var(--raw-magenta-lighten-80)",
  "--accent-emphasis": "var(--raw-magenta-darken-60)",

  // Badge foregrounds, five pins: Badge's soft tones. --badge-accent-fg is the
  // one pin that is not the byte-identical light :root declaration, because at
  // :root it reads var(--accent-base); it follows the RAMP here, as on the band,
  // since var(--accent-base) would resolve in the dark cascade to the dark fill
  // mix, the wrong theme for this light sheet.
  "--badge-info-fg": "var(--raw-cyan-darken-20)",
  "--badge-success-fg": "var(--raw-green-darken-20)",
  "--badge-warning-fg": "var(--raw-yellow-darken-20)",
  "--badge-error-fg": "var(--raw-red-darken-20)",
  "--badge-accent-fg": "var(--raw-magenta-darken-20)",
  "--badge-neutral-fg": "var(--paper-ink-muted)",  // not raw: the neutral rung follows the paper ink (C-22)

  // Status inks, four pins: the hue words CalloutCard, NotificationFeed, Stat and
  // every field's error line paint. Same chosen-per-ground shape as the accent.
  "--status-info-text": "var(--raw-cyan-darken-20)",
  "--status-success-text": "var(--raw-green-darken-20)",
  "--status-warning-text": "var(--raw-yellow-darken-20)",
  "--status-danger-text": "var(--raw-red-darken-20)",

  // The error boundary, one pin: red-base on light, red-lighten-40 on dark. A
  // field in an error state inside the paper keeps the light-ground boundary
  // (C-22 pinned the identical value on the inverted band).
  "--border-error": "var(--raw-red-base)",
} as CSSProperties;

const headStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "var(--space-lg)",
  paddingBottom: "var(--space-lg)",
  borderBottom: "1px solid var(--paper-rule)",
};

const letterheadStyle: CSSProperties = {
  minWidth: 0,
};

const metaStyle: CSSProperties = {
  textAlign: "right",
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-xs)",
  letterSpacing: "var(--tracking-wide)",
  color: "var(--paper-ink-muted)",
};

const billToStyle: CSSProperties = {
  minWidth: 0,
};

const itemsStyle: CSSProperties = {
  minWidth: 0,
};

const totalsRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
};

const totalsStyle: CSSProperties = {
  minWidth: "40%",
  paddingTop: "var(--space-sm)",
  borderTop: "1px solid var(--paper-rule)",
};

const footStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
  paddingTop: "var(--space-lg)",
  borderTop: "1px solid var(--paper-rule)",
};

const paymentNoteStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-xs)",
  letterSpacing: "var(--tracking-wide)",
  color: "var(--paper-ink-muted)",
};

// The closing line in the quoted italic (the handoff's thank-you voice). --font-quote, not
// --font-display (D28): the lever defaults to the display face, so nothing moves today.
const thankYouStyle: CSSProperties = {
  fontFamily: "var(--font-quote)",
  fontStyle: "italic",
  fontSize: "var(--type-md)",
  color: "var(--paper-ink)",
};
