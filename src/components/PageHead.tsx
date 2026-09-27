import { CSSProperties, ElementType, ReactNode } from "react";
import { Heading } from "@/components/Heading";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";

/* ============================================================
   PageHead — the app-page section header spoken as one component: a mono
   uppercase eyebrow over a level-1 Heading (headingLevel / as override it), an optional lede capped at a
   reading measure, and an optional primary action slot. This is the anatomy
   every product page opens with; reach for it instead of re-assembling an
   eyebrow + <Heading> + lede by hand.

   Promoted to mother from the proven studio fork-local (works/page-head).
   Generalized with an `align` axis:
     • "start" (default) — the classic left-aligned header: the stack on the
       left, the primary action pinned to the right edge, baseline-aligned.
     • "center" — the stack is centred and the action drops INTO the column
       beneath the lede, for onboarding / auth flows where the header owns a
       narrow centred measure.

   TWO VARIANTS (v6.30.0, HQ v7 system pass, theme 1). "intro" is the page
   intro above: eyebrow, title, lede, one action, and `align` composes with
   it. "record" is the head of a RECORD or a LIST on a data surface (a
   client, a site, the worksheet, the library), where the title is a name
   and the lines under it are facts: breadcrumbs above the title, a meta
   line (facts, each with an optional glyph and link), a labelled links
   line ("Production: zafiro.com"), a note line for a sentence with a chip,
   a read stamp, and an actions slot (at most one primary, then ghosts) on
   the title's baseline. `align` is refused on record (it is always start);
   the two anatomies exclude each other, which is why they are one prop
   rather than a third align. The mother stores it; the HQ and the docs
   surfaces serve it with data; the sites never use it.

   Composes mother <Heading> and <Breadcrumbs>. Server component; zero state.
   ============================================================ */

export type PageHeadVariant = "intro" | "record";

/** One fact on the record head's meta line. */
export interface PageHeadMetaItem {
  text: ReactNode;
  /** A Carbon glyph before the text where the item is a channel (mail, phone). */
  glyph?: ReactNode;
  href?: string;
}

/** One labelled link on the record head's links line: "Production: zafiro.com". */
export interface PageHeadLinkItem {
  /** Omit it to continue the previous item's label ("See also: Style guide · Section library"). */
  label?: ReactNode;
  value: ReactNode;
  href: string;
}

export interface PageHeadProps {
  /** The mono uppercase line above the title, e.g. "The record". Optional — omit
   *  it for a bare title (no eyebrow element is rendered, no reserved gap). Intro only. */
  eyebrow?: string;
  title: string;
  /** The quiet sentence under the title. Capped at a reading measure. Intro only. */
  lede?: string;
  /**
   * Primary action. When align="start" it sits right-aligned against the
   * title baseline; when align="center" it stacks centred below the lede.
   * On the record variant, prefer `actions` (a slot for several).
   */
  action?: ReactNode;
  /**
   * Header alignment. "start" (default) is the left-aligned page header;
   * "center" stacks everything centred for onboarding / auth flows. Intro only:
   * a record head is always start.
   */
  align?: "start" | "center";
  /**
   * Heading level of the title. Default 1: PageHead IS the page's h1 by design. Pass 2 where a
   * page already carries its h1 and the head opens a section. (v5.6.0; was a fixed h1, which
   * made every docs demo and showroom sample a second h1: eight on /components/page-head.)
   */
  headingLevel?: 1 | 2 | 3;
  /**
   * Render-tag override for the title, forwarded to Heading's `as`: `as="div"` keeps the
   * visual treatment and takes a specimen out of the document outline (the docs use it).
   */
  as?: ElementType;
  /** The anatomy (v6.30.0): "intro" (default) or "record". */
  variant?: PageHeadVariant;
  /** RECORD: the trail above the title; the last item is the title's name and is not a link. */
  breadcrumbs?: BreadcrumbItem[];
  /** RECORD: the fact line under the title (kind, source, channel with its glyph, since). */
  meta?: PageHeadMetaItem[];
  /** RECORD: the labelled links line ("Production: zafiro.com", "Repo: magentaweb/zafiro"). */
  links?: PageHeadLinkItem[];
  /** RECORD: one line under the meta for a sentence with a chip (a draft note). */
  note?: ReactNode;
  /** RECORD: the read stamp, mono 2xs tertiary, beside the actions ("read 09:12"). */
  stamp?: ReactNode;
  /** RECORD: the trailing actions on the title's baseline: at most one primary, then ghosts. */
  actions?: ReactNode;
}

export function PageHead({
  eyebrow,
  title,
  lede,
  action,
  align = "start",
  headingLevel = 1,
  as,
  variant = "intro",
  breadcrumbs,
  meta,
  links,
  note,
  stamp,
  actions,
}: PageHeadProps) {
  if (variant === "record") {
    return (
      <header data-mw-page-head="record" style={recordRootStyle}>
        <style href="magentaweb-page-head" precedence="default">{pageHeadCss}</style>
        <div style={stackStyle}>
          <div style={headClusterStyle}>
            {breadcrumbs && breadcrumbs.length ? <Breadcrumbs items={breadcrumbs} /> : null}
            {/* measure="none" (v6.33.0): a record's title is its NAME, read whole on one line where it
                fits; the 32ch title cap is for a statement on a page, and it broke "Freeze the sync
                unit at v6.29.2 until batch one of HQ v7 ships" in two on a 1440 data screen. */}
            <Heading level={headingLevel} size={3} as={as} measure="none">
              {title}
            </Heading>
          </div>
          {meta && meta.length ? (
            <ul role="list" style={metaLineStyle}>
              {meta.map((m, i) => (
                <li key={i} style={metaItemStyle}>
                  {m.glyph ? <span aria-hidden="true" style={glyphStyle}>{m.glyph}</span> : null}
                  {m.href ? <a href={m.href} style={metaLinkStyle}>{m.text}</a> : m.text}
                </li>
              ))}
            </ul>
          ) : null}
          {links && links.length ? (
            <ul role="list" style={linksLineStyle}>
              {links.map((l, i) => (
                <li key={i} style={metaItemStyle}>
                  {/* A label-less item continues the line before it: "See also: Style guide ·
                      Section library" is one label and two links (v6.36.0, the reference boards). */}
                  {l.label != null && l.label !== "" ? <span>{l.label}: </span> : null}
                  <a href={l.href} style={metaLinkStyle}>{l.value}</a>
                </li>
              ))}
            </ul>
          ) : null}
          {note ? <div style={noteStyle}>{note}</div> : null}
        </div>
        {actions || action || stamp ? (
          <div style={actionsStyle}>
            {stamp ? <span style={stampStyle}>{stamp}</span> : null}
            {actions ?? action}
          </div>
        ) : null}
      </header>
    );
  }

  const centered = align === "center";

  return (
    <header data-mw-page-head="intro" style={centered ? rootCenterStyle : rootStyle}>
      <div style={centered ? stackCenterStyle : stackStyle}>
        {/* The head cluster: eyebrow hugs its title at xs. The lede and action bind below with
            their own rungs, so the stack carries no uniform gap (v5.5.0; was xs across all). */}
        <div style={centered ? headClusterCenterStyle : headClusterStyle}>
          {eyebrow ? <span style={eyebrowStyle}>{eyebrow}</span> : null}
          <Heading level={headingLevel} size={3} as={as}>
            {title}
          </Heading>
        </div>
        {lede ? <p style={centered ? ledeCenterStyle : ledeStyle}>{lede}</p> : null}
        {/* Centred: the action joins the column beneath the lede. */}
        {centered && action ? <div style={actionCenterStyle}>{action}</div> : null}
      </div>
      {/* Start: the action pins to the right edge, baseline-aligned. */}
      {!centered && action ? <div style={actionStyle}>{action}</div> : null}
    </header>
  );
}

/* ---------- inline styles (token-pure) ---------- */

const rootStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "var(--space-md)",
};

const rootCenterStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "var(--space-md)",
  textAlign: "center",
};

const stackStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
};

const stackCenterStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  minWidth: 0,
};

// The anatomy's eyebrow dress: mono micro, tracked, tertiary.
// The eyebrow -> title hug, the ladder's xs rung, owned by this cluster alone.
const headClusterStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xs)",
};
const headClusterCenterStyle: CSSProperties = {
  ...headClusterStyle,
  alignItems: "center",
};
const eyebrowStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--text-positive-tertiary)",
};

const ledeStyle: CSSProperties = {
  margin: 0,
  marginTop: "var(--flow-heading)", // title -> lede: the heading rung (v5.5.0)
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-md)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
  maxWidth: "var(--measure-prose)", // was 60ch: the reading measure, the anatomy's lede cap (pass 4, 27 Aug 2026)
};

// Centred flows read on a narrower measure so the centred column stays a tidy
// block rather than a full-bleed line.
const ledeCenterStyle: CSSProperties = {
  margin: 0,
  marginTop: "var(--flow-heading)", // title -> lede: the heading rung (v5.5.0)
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-md)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
  maxWidth: "var(--measure-narrow)", // was 48ch: the note measure, the centred lede cap (pass 4, 27 Aug 2026)
};

const actionStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
};

// In the centred stack the action is a block under the lede (md), centred.
const actionCenterStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-sm)",
  marginTop: "var(--space-md)",
};

/* ---------- the record variant ---------- */

// Two columns: the stack takes the width and wraps its own lines, the actions keep their
// content width on the title's line. A flex-wrap root put the actions under a long links line
// (the first HQ build): the head's lines are allowed to be long, the actions are not allowed to
// move. At the phone width the columns stack (the actions row under the meta).
// The phone: one column, the actions row under the meta, a primary keeping its label.
// The column template lives in the SHEET, not inline: an inline declaration beats every sheet
// rule, so the phone rule below could never have collapsed it (the first cut broke a title
// letter by letter at 390 while the actions column kept its width).
const pageHeadCss = `
[data-mw-page-head="record"] {
  grid-template-columns: minmax(0, 1fr) auto;
}
/* The record head's trail is a caption over the title, not a line of its own (v6.32.0, the HQ v7
   boards): the xs rung, the trail's secondary ink throughout, so the title is the one loud line. */
[data-mw-page-head="record"] [data-mw-breadcrumbs-trail] {
  font-size: var(--type-xs);
}
[data-mw-page-head="record"] [data-mw-breadcrumbs-current] {
  color: var(--text-positive-secondary);
  max-width: 40ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 767.98px) { /* --mw-bp-tablet */
  [data-mw-page-head="record"] {
    grid-template-columns: minmax(0, 1fr);
  }
  [data-mw-page-head="record"] > div:last-child {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
`;
const recordRootStyle: CSSProperties = {
  display: "grid",
  alignItems: "start",
  columnGap: "var(--space-lg)",
  rowGap: "var(--space-md)",
};

// The meta line binds under the title at the heading rung; items md apart, body small
// secondary (theme 7's row-level caption voice). The links line follows at xs.
const metaLineStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  marginTop: "var(--flow-heading)",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--space-2xs) var(--space-md)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
};
const linksLineStyle: CSSProperties = {
  ...metaLineStyle,
  marginTop: "var(--space-xs)",
};
const metaItemStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-2xs)",
  minWidth: 0,
};
const glyphStyle: CSSProperties = {
  display: "inline-flex",
  color: "var(--text-positive-tertiary)",
};
const metaLinkStyle: CSSProperties = {
  color: "var(--accent-ink)",
  textDecoration: "none",
};
const noteStyle: CSSProperties = {
  marginTop: "var(--space-xs)",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-xs)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  color: "var(--text-positive-primary)",
};
// The actions sit on the title's line, the stamp before them, sm apart; the breadcrumbs row
// above the title is xs plus a line, so the actions drop by that much when a trail is present
// (the consumer's own line box does the rest).
// No wrap at the desk (v6.36.2): a wrapping flex box inside the head's `auto` grid track sizes to
// its min-content, so a stamp beside a select and a button broke onto two lines with half the row
// empty (the HQ's worksheet and marketing heads, the fifth pass). The phone rule in the sheet turns
// wrapping on where the actions run full width.
const actionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "nowrap",
  justifyContent: "flex-end",
  gap: "var(--space-sm)",
  alignSelf: "start",
  paddingTop: "var(--space-2xs)",
};
const stampStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  fontVariantNumeric: "tabular-nums",
  color: "var(--text-positive-tertiary)",
  // The record head's actions row wraps at the phone breakpoint (CLIENTS-F1): with no nowrap
  // here, a width-starved flex-wrap row breaks INSIDE the stamp's own text ("read 3 min" / "ago")
  // instead of moving the whole stamp to its own line. flexShrink:0 keeps it from being squeezed
  // narrower than its text first, which is what triggers the same mid-phrase wrap.
  whiteSpace: "nowrap",
  flexShrink: 0,
};
