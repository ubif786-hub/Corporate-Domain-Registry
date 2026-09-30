import { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "@carbon/icons-react";
import { Card } from "@/components/Card";
import { DataLabel } from "@/components/DataLabel";
import { Heading } from "@/components/Heading";
import { tokenNumber } from "@/components/internal/styles";

/* ============================================================
   RecordCard — one record as a card with height (v6.30.0, HQ v7 system
   pass, theme 3, the owner's brief: "the old style: each project had a
   card, with its favicon, and the cards show the same data, the same
   columns as the board"). The row of a header-less list given a
   favicon, its links and room, so a grouped set of them scans like a
   table. Built on Card variant="link" border="none": the whole surface
   is the row target, the name is the link, the marks are their own
   links lifted above the cover.

   Three regions, on the surface, padding at the lg rung:
   - LEADING: the mark (a favicon at 20 px, the studio mark as the
     fallback when there is none or the read failed), the name (Heading
     6, the sans, the link), the chips under it (sentence case for a
     phrase, caps for a one-word kind), then the one-line note in body
     small secondary, capped at two lines with an ellipsis.
   - MIDDLE, right-aligned: the figure over its caption as a mono figure
     over a DataLabel ("$9,000 of $12,000" over "Invoiced"), and beside it
     the status chips stacked 2xs apart.
   - TRAILING: the link marks as icon-only ghost xs buttons in one row,
     the domain under them as a mono stamp, and the chevron.
   Money and status always right, links always trailing.

   AssetCard is an image card (an image in a ratio with four corner slots)
   and is not this component's ancestor; the old project card was inline
   in the old HQ index and never a component. Server component.
   ============================================================ */

/** One trailing link mark: an icon-only ghost, named by `label`. Omit `href` for a link the record
 *  does not have yet (no staging, no repo): the mark holds its place, dimmed and inert, so the
 *  marks of a set of cards stay in columns (v6.33.0). */
export interface RecordCardLink {
  label: string;
  href?: string;
  icon: ReactNode;
  /** Opens in a new tab (an external site); the repo and the staging link usually do. */
  external?: boolean;
}

export interface RecordCardProps {
  /** The record's name; the card's one link. */
  name: string;
  href: string;
  /** The mark before the name: a favicon `<img>`, an inline SVG, or nothing for the fallback. */
  mark?: ReactNode;
  /** The chips under the name: kind, engagement, industry. Badges. */
  chips?: ReactNode;
  /** The one-line next or note, body small secondary, capped at two lines. */
  note?: ReactNode;
  /** The figure, right-aligned, as a mono figure ("$9,000 of $12,000"). */
  figure?: ReactNode;
  /** The figure's caption, a DataLabel under it ("Invoiced"). */
  figureLabel?: ReactNode;
  /** The status chips, stacked beside the figure: the engagement state, the sync or attention chip. */
  status?: ReactNode;
  /** The trailing link marks, at most three. */
  links?: RecordCardLink[];
  /** The production domain under the marks, a mono stamp. */
  domain?: ReactNode;
  /** The row just created: the accent wash until the next navigation (the create-in-place pattern). */
  highlight?: boolean;
  /** Accessible name for the card's cover link. Defaults to the name. */
  ariaLabel?: string;
}

export function RecordCard({ name, href, mark, chips, note, figure, figureLabel, status, links, domain, highlight = false, ariaLabel }: RecordCardProps) {
  return (
    <div data-mw-record-card="" data-highlight={highlight ? "true" : undefined} style={highlight ? { ...rootStyle, "--record-card-wash": "var(--accent-wash)" } as CSSProperties : rootStyle}>
      <style href="magentaweb-record-card" precedence="default">{recordCardCss}</style>
      <Card variant="link" href={href} border="none" padding="relaxed" ariaLabel={ariaLabel ?? name} linkLabel={null}>
        <div data-mw-record-card-grid="" style={gridStyle}>
          <div style={leadingStyle}>
            <div style={nameRowStyle}>
              <span aria-hidden="true" style={markStyle}>{mark ?? <FallbackMark />}</span>
              <Heading level={3} size={6}>
                <Link href={href} style={nameLinkStyle}>{name}</Link>
              </Heading>
            </div>
            {chips ? <div style={chipsStyle}>{chips}</div> : null}
            {note ? <p style={noteStyle}>{note}</p> : null}
          </div>
          {figure != null || status ? (
            <div data-mw-record-card-middle="" style={middleStyle}>
              {figure != null ? (
                <div data-mw-record-card-figure="" style={figureStackStyle}>
                  <span style={figureStyle}>{figure}</span>
                  {figureLabel ? <DataLabel tone="tertiary">{figureLabel}</DataLabel> : null}
                </div>
              ) : null}
              {status ? <div data-mw-record-card-status="" style={statusStackStyle}>{status}</div> : null}
            </div>
          ) : null}
          <div data-mw-record-card-trailing="" style={trailingStyle}>
            <div style={marksRowStyle}>
              {links?.map((l) => !l.href ? (
                <span key={"absent-" + l.label} role="img" aria-label={l.label} title={l.label} data-mw-record-card-mark="" data-absent="true" style={markAbsentStyle}>
                  {l.icon}
                </span>
              ) : (
                <a
                  key={l.href + l.label}
                  href={l.href}
                  aria-label={l.label}
                  title={l.label}
                  target={l.external ? "_blank" : undefined}
                  rel={l.external ? "noopener noreferrer" : undefined}
                  data-mw-record-card-mark=""
                  style={markButtonStyle}
                >
                  {l.icon}
                </a>
              ))}
              <span aria-hidden="true" style={chevronStyle}><ChevronRight size={16} /></span>
            </div>
            {domain ? <span data-mw-record-card-domain="" style={domainStyle}>{domain}</span> : null}
          </div>
        </div>
      </Card>
    </div>
  );
}

// The studio's fallback mark: a quiet circle in the tertiary ink, the size of a favicon.
function FallbackMark() {
  return <span style={fallbackMarkStyle} />;
}

/* ---------- inline styles (token-pure) ---------- */

const rootStyle: CSSProperties = {
  display: "contents",
};
// The three regions: leading grows, middle and trailing take their content.
// The column template lives in the SHEET (an inline declaration beats every sheet rule, so the
// phone rule could never collapse it; found on the HQ clients index at 390 the day it shipped).
const gridStyle: CSSProperties = {
  display: "grid",
  alignItems: "start",
  gap: "var(--space-lg)",
  padding: "var(--card-padding)",
  width: "100%",
};
const leadingStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xs)",
  minWidth: 0,
};
const nameRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-xs)",
  minWidth: 0,
};
// 20 px mark box: favicon geometry, structural.
const markStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "1.25rem",
  height: "1.25rem",
  flex: "none",
  color: "var(--text-positive-secondary)",
};
const fallbackMarkStyle: CSSProperties = {
  width: "0.75rem",
  height: "0.75rem",
  borderRadius: "var(--radius-full)",
  border: "var(--rule-weight) solid var(--text-positive-tertiary)",
};
const nameLinkStyle: CSSProperties = {
  color: "inherit",
  textDecoration: "none",
};
const chipsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--space-2xs)",
};
// The note: body small secondary, two lines then an ellipsis.
const noteStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};
const middleStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "var(--space-md)",
};
// The figure's alignment and the status stack's direction live in the sheet, so the phone rule
// can turn them (v6.32.0: inline, they held a long chip in a squeezed column at 390 and the card
// clipped it; the same trap v6.30.1 paid for on the grid template).
const figureStackStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3xs)",
};
// The inline figure (theme 7): mono at the sm rung, tabular, primary ink.
const figureStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-sm)",
  fontVariantNumeric: "tabular-nums",
  color: "var(--text-positive-primary)",
  whiteSpace: "nowrap",
};
const statusStackStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "var(--space-2xs)",
};
const trailingStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "var(--space-2xs)",
};
const marksRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2xs)",
};
// A mark is an icon-only ghost on the xs rung: a 28 px box, the hover wash from the sheet.
const markButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "var(--control-size-sm)",
  height: "var(--control-size-sm)",
  borderRadius: "var(--component-radius)",
  color: "var(--text-positive-secondary)",
  textDecoration: "none",
  transition: "background var(--motion-transition), color var(--motion-transition)",
};
// An absent link: the same box, the tertiary ink at the disabled opacity, no hover (the sheet
// skips [data-absent]).
const markAbsentStyle: CSSProperties = {
  ...markButtonStyle,
  color: "var(--text-positive-tertiary)",
  opacity: 0.5,
};
const chevronStyle: CSSProperties = {
  display: "inline-flex",
  color: "var(--text-positive-tertiary)",
  marginLeft: "var(--space-2xs)",
};
const domainStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  color: "var(--text-positive-tertiary)",
  whiteSpace: "nowrap",
};

const recordCardCss = `
[data-mw-record-card-mark]:not([data-absent]):hover {
  background: var(--background-hover-wash-strong);
  color: var(--text-positive-primary);
}
[data-mw-record-card-mark]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
/* The just-created wash: the card's own ground until the next navigation. */
[data-mw-record-card][data-highlight="true"] [data-mw-card-variant] {
  background: var(--record-card-wash);
}
/* The tracks (v6.33.0): the leading region takes the rest; the money and status region and the
   marks region have one width on every card, so a set of cards scans like a table. A consumer
   retunes the three widths through the custom properties; the defaults hold a "$9,000 of
   $12,000" figure, a "Mark missing: lockup horizontal" chip and three marks with a domain. */
[data-mw-record-card-grid] {
  grid-template-columns: minmax(0, 1fr) var(--record-card-middle, 24.5rem) var(--record-card-trailing, 12.5rem);
}
[data-mw-record-card-trailing] {
  grid-column: -2;
  min-width: 0;
}
[data-mw-record-card-middle] {
  min-width: 0;
}
[data-mw-record-card-figure] {
  align-items: flex-end;
  flex: 0 0 var(--record-card-figure, 10rem);
}
[data-mw-record-card-status] {
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
}
[data-mw-record-card-domain] {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* The phone: one column; the middle and trailing regions follow the leading one, the marks
   on their own row under the figure, everything aligned to the start. */
@media (max-width: 767.98px) { /* --mw-bp-tablet */
  [data-mw-record-card-grid] {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-sm);
  }
  [data-mw-record-card-grid] > div {
    align-items: flex-start;
  }
  /* The figure over its caption at the start, then the chips as a wrapping row under it: a
     chip never wraps, so a squeezed column clipped the long ones. */
  [data-mw-record-card-middle] {
    flex-direction: column;
    gap: var(--space-xs);
  }
  [data-mw-record-card-figure] {
    align-items: flex-start;
    flex: none;
  }
  [data-mw-record-card-trailing] {
    grid-column: auto;
  }
  [data-mw-record-card-status] {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
`;
