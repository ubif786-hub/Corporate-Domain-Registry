"use client";

import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  LogoLinkedin,
  LogoGithub,
  LogoYoutube,
  LogoInstagram,
  LogoX,
} from "@carbon/icons-react";
import { Container } from "@/components/Container";
import { VercelIcon } from "@/components/icons/VercelIcon";
import { logoHomeLinkStyle, logoPlaceholderStyle, srOnly, tokenNumber } from "@/components/internal/styles";

/* ============================================================
   Footer — production site footer. Three rows stacked vertically:
   top (logo + tagline beside link columns), middle (hairline rule),
   bottom (copyright beside social icons).

   Client component to drive a reveal animation on scroll-into-view
   via IntersectionObserver. Children stagger in 50ms apart once the
   footer crosses the threshold. Background lifts subtly via
   --background-positive-secondary.
   ============================================================ */

type SocialPlatform =
  | "linkedin"
  | "github"
  | "vercel"
  | "x"
  | "youtube"
  | "instagram";

interface FooterSocial {
  href: string;
  platform: SocialPlatform;
}

interface FooterColumn {
  heading: string;
  links: { label: string; href: string }[];
}

export interface FooterProps {
  columns: FooterColumn[];
  copyright: string;
  logo?: ReactNode;
  /** Where the logo links. Every logo is a home link by convention; default "/" . */
  logoHref?: string;
  /** Accessible name for the logo home link, appended visually-hidden INSIDE it.
   *  Default "Home". It is a prop and not a hardcoded string because the value is
   *  user-facing text, and a site in Spanish should not announce an English word. */
  homeLabel?: string;

  social?: FooterSocial[];
  tagline?: string;
  /**
   * A postal address block under the copyright, rendered as an <address> element in the
   * copyright's small type (v6.13.0). A client site's registered office has to appear on every
   * page and match its business listing exactly; passing it here keeps it one string in one
   * place and lets schema and assistive tech read it as an address. A string renders as one
   * line; pass nodes for several.
   */
  address?: ReactNode;
  // Optional controls rendered at the end of the bottom row, beside the social
  // icons (e.g. a ThemeToggle). Generic so the footer stays theme-agnostic.
  actions?: ReactNode;
  /**
   * Heading level of the column headings. Default 2: the footer is a landmark at the end of
   * the page and its navigation groups sit at section level, so a page that carries only an
   * h1 (a one-heading home) no longer ends its outline h1 -> h3. Pass 3 where the page's own
   * sections are h2 and the footer groups should read beneath them. (v5.6.0; was a fixed h3.)
   */
  headingLevel?: 2 | 3;
}

const socialLabel: Record<SocialPlatform, string> = {
  linkedin: "LinkedIn",
  github: "GitHub",
  vercel: "Vercel",
  x: "X",
  youtube: "YouTube",
  instagram: "Instagram",
};

function SocialGlyph({ platform }: { platform: SocialPlatform }) {
  switch (platform) {
    case "linkedin":
      return <LogoLinkedin size={20} aria-hidden="true" />;
    case "github":
      return <LogoGithub size={20} aria-hidden="true" />;
    case "youtube":
      return <LogoYoutube size={20} aria-hidden="true" />;
    case "instagram":
      return <LogoInstagram size={20} aria-hidden="true" />;
    case "x":
      return <LogoX size={20} aria-hidden="true" />;
    case "vercel":
      return <VercelIcon size={20} />;
  }
}

export function Footer({
  columns,
  copyright,
  logo,
  logoHref = "/",
  homeLabel = "Home",
  social,
  tagline,
  address,
  actions,
  headingLevel = 2,
}: FooterProps) {
  const ColumnHeading = `h${headingLevel}` as const;
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    if (typeof IntersectionObserver === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- IntersectionObserver subscription needs the post-mount DOM ref; this synchronous reveal is the no-IO fallback (a lazy initializer would mismatch: IO is absent on the server, present on the client).
      setRevealed(true);
      return;
    }
    // REVERSIBLE like the system's reveal primitives: under soft navigation the
    // footer lives in a persistent layout and mounts ONCE, so a play-once reveal
    // would fire on the first page and never again. Following visibility both
    // ways replays it on every approach, on every route. Newest record only: a
    // fast flick can batch out-then-in crossings into one callback.
    const observer = new IntersectionObserver(
      (entries) => {
        setRevealed(entries[entries.length - 1].isIntersecting);
      },
      { threshold: 0.15 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Stagger index covers: brand (0), each column as one slot (1..N),
  // then the social row (N+1) and copyright (N+2).
  let stagger = 0;
  const brandIdx = stagger++;
  const columnIdxStart = stagger;
  stagger += columns.length;
  const socialIdx = stagger++;
  const copyrightIdx = stagger++;

  // Brand track (fr, absorbs free space) + one auto track per column, so the link columns
  // stay content-width and right-align for any count. Guard the empty case (repeat(0, ...) is
  // invalid CSS).
  const topGridCols =
    columns.length > 0 ? `minmax(0, 1fr) repeat(${columns.length}, auto)` : "minmax(0, 1fr)";

  return (
    <footer
      ref={ref}
      data-mw-footer=""
      data-revealed={revealed ? "true" : "false"}
      style={footerStyle}
    >
      <style href="magentaweb-footer" precedence="default">{footerCss}</style>
      <Container size="lg">
        {/* The dynamic column count rides a custom property consumed by the
            hoisted rule, so the tablet collapse wins the cascade plainly (the
            old inline gridTemplateColumns needed !important to beat). */}
        <div data-mw-footer-top-grid="" style={{ ...topGridStyle, "--mw-footer-cols": topGridCols }}>
          <div
            data-mw-footer-staggered=""
            style={{ ...brandColStyle, "--stagger-index": brandIdx }}
          >
            {/* Visually-hidden child, not aria-label: see the same fix in Nav. */}
            <Link href={logoHref} data-mw-footer-logo-link="" style={logoHomeLinkStyle}>
              {logo ?? <div style={logoPlaceholderStyle} />}
              <span style={srOnly}>{homeLabel}</span>
            </Link>
            {tagline ? <p style={taglineStyle}>{tagline}</p> : null}
          </div>

          {columns.map((col, i) => (
            <div
              key={`${col.heading}-${i}`}
              data-mw-footer-staggered=""
              style={{ "--stagger-index": columnIdxStart + i }}
            >
              <ColumnHeading style={columnHeadingStyle}>{col.heading}</ColumnHeading>
              <ul style={linkListStyle} role="list">
                {col.links.map((link, j) => (
                  <li key={`${link.href}-${j}`}>
                    {/* next/link: footer navigation is soft like the Nav's
                        (raw anchors were the last full-reload holdout). */}
                    <Link href={link.href} data-mw-footer-link="">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <hr style={ruleStyle} />

        <div style={bottomRowStyle}>
          <div style={bottomStartStyle}>
            <span
              data-mw-footer-staggered=""
              style={{ ...copyrightStyle, "--stagger-index": copyrightIdx }}
            >
              {copyright}
            </span>
            {address ? (
              <address
                data-mw-footer-staggered=""
                data-mw-footer-address=""
                style={{ ...addressStyle, "--stagger-index": copyrightIdx }}
              >
                {address}
              </address>
            ) : null}
          </div>
          {actions || (social && social.length > 0) ? (
            <div style={bottomEndStyle}>
              {actions}
              {social && social.length > 0 ? (
                <div
                  data-mw-footer-staggered=""
                  style={{ ...socialRowStyle, "--stagger-index": socialIdx }}
                >
                  {social.map((s) => (
                    <a
                      key={s.platform}
                      href={s.href}
                      data-mw-footer-social=""
                      aria-label={socialLabel[s.platform]}
                      target={s.href.startsWith("http") ? "_blank" : undefined}
                      rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    >
                      <SocialGlyph platform={s.platform} />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Container>
    </footer>
  );
}

const footerCss = `
[data-mw-footer-logo-link]:focus-visible { outline: var(--focus-outline); outline-offset: 2px; }
[data-mw-footer-staggered] {
  opacity: 0;
  transform: translateY(var(--motion-reveal-distance));
  transition:
    opacity var(--motion-reveal-duration) var(--motion-ease),
    transform var(--motion-reveal-duration) var(--motion-ease);
  /* Exit is uniform: the stagger delay applies on enter only, so a scroll-away
     mid-reveal converges instead of tearing down piecewise (the system's
     enter-only-delay rule). */
  transition-delay: 0ms;
}
/* No JS, no reveal: the same floor RevealBlock carries (v5.10.0). The observer never runs, so
   data-revealed stays false and the children would rest at opacity 0 forever. */
@media (scripting: none) {
  [data-mw-footer-staggered] { opacity: 1; transform: none; }
}
[data-mw-footer][data-revealed="true"] [data-mw-footer-staggered] {
  opacity: 1;
  transform: translateY(0);
  transition-delay: calc(var(--stagger-index, 0) * var(--motion-stagger));
}

[data-mw-footer-link] {
  position: relative;
  font-family: var(--font-body);
  font-size: var(--type-sm);
  color: var(--text-positive-secondary);
  text-decoration: none;
  padding-block: var(--space-2xs);
  display: inline-block;
  transition: color var(--motion-transition);
}
/* The nav triggers' center-out underline sweep, so the chrome speaks one link
   language; rides the motion dial like everything else. */
[data-mw-footer-link]::after {
  content: "";
  position: absolute;
  left: 50%;
  right: 50%;
  bottom: 0;
  height: 1px;
  background: var(--text-positive-primary);
  transition:
    left var(--motion-transition),
    right var(--motion-transition);
}
[data-mw-footer-link]:hover,
[data-mw-footer-link]:focus-visible {
  color: var(--text-positive-primary);
}
[data-mw-footer-link]:hover::after,
[data-mw-footer-link]:focus-visible::after {
  left: 0;
  right: 0;
}
[data-mw-footer-link]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
  border-radius: var(--component-radius);
}

[data-mw-footer-social] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--control-size-md);
  height: var(--control-size-md);
  color: var(--text-positive-tertiary);
  text-decoration: none;
  border-radius: var(--component-radius);
  transition:
    color var(--motion-transition),
    background var(--motion-transition);
}
[data-mw-footer-social]:hover {
  color: var(--text-positive-primary);
  background: var(--background-hover-wash);
}
[data-mw-footer-social]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}

/* The template consumes the count-derived custom property set inline, so both
   this rule and the tablet collapse live at the same cascade level and the
   collapse wins plainly (no !important). */
[data-mw-footer-top-grid] {
  grid-template-columns: var(--mw-footer-cols, minmax(0, 1fr));
}
/* The tablet band (768-1023) cannot fit the brand track PLUS several auto
   columns: the auto tracks eat the width and the nowrap brand overflows under
   the first column (the audited GMS footer overlap at exactly 768). The brand
   takes its own full row and the columns flow in equal wrapping tracks. */
@media (max-width: 1023px) { /* --mw-bp-desktop */
  [data-mw-footer-top-grid] {
    /* S-11, sanctioned at D35 (27 Aug 2026). 12rem is a WRAP THRESHOLD for the
       auto-fit track, not a gap: it is the narrowest a link column can get
       before the longest label in it wraps and the column stops reading as a
       list. minmax feeds it to the grid algorithm as the point at which one
       more column stops fitting, which is a decision about the CONTENT, so it
       must not ride the spacing dial: at dramatic a dial-scaled threshold would
       drop a whole column on the same viewport, and at compact it would keep a
       column that no longer fits its own labels. */
    grid-template-columns: repeat(auto-fit, minmax(min(12rem, 100%), 1fr));
  }
  [data-mw-footer-top-grid] > :first-child {
    grid-column: 1 / -1;
  }
}
@media (max-width: 767px) { /* --mw-bp-tablet */
  [data-mw-footer-top-grid] {
    grid-template-columns: 1fr;
  }
  /* Clearance for the Nav's fixed bottom-center toggle, which otherwise sits
     over the copyright line once a short page's footer reaches the viewport
     bottom (the audited GMS /contact overlap). */
  [data-mw-footer] {
    --mw-footer-pad-end: calc(
      var(--footer-pad-end) + var(--control-size-touch) + max(var(--space-md), env(safe-area-inset-bottom, 0px))
    );
  }
}
`;

const footerStyle: CSSProperties = {
  background: "var(--background-positive-secondary)",
  // The footer is a BAND, so its padding rides the section multiplier like every other
  // band (v5.5.0, S-9). --footer-pad-start/-end carry the 6rem / 3rem bases this always
  // used, so the normal dial is unchanged; see the tokens.css note for the pinned dials.
  paddingBlockStart: "var(--footer-pad-start)",
  // The end padding rides a custom property so the hoisted mobile rule can widen
  // it (the fixed bottom-center Nav toggle needs clearance over the copyright
  // line on short pages; inline padding would beat any sheet rule).
  paddingBlockEnd: "var(--mw-footer-pad-end, var(--footer-pad-end))",
  color: "var(--text-positive-secondary)",
};

// gridTemplateColumns is set inline from the actual column count: a flexible brand track that
// absorbs the free space, then one content-width (auto) track per link column. The fr track
// grows, so the columns cluster and right-align regardless of how many there are (2 or 4). The
// tablet media query collapses this to a single stacked column.
const topGridStyle: CSSProperties = {
  display: "grid",
  gap: "var(--space-xl)",
  alignItems: "start",
};

const brandColStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-md)",
  // S-11, sanctioned at D35 (27 Aug 2026). A reading MEASURE for the tagline
  // under the lockup, not a spacing rung: 22rem at --type-sm is roughly 55
  // characters, inside the 45 to 75 band a line of prose stays comfortable in.
  // Off the --space ladder and off the spacing dial on purpose, for the same
  // reason as Tooltip's cap: how much text a reader takes in per line does not
  // change when a client tunes its gaps. The 12rem below is the other half of
  // the pair and is a different kind of number; see it.
  maxWidth: "22rem",
};

const taglineStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  color: "var(--text-positive-secondary)",
  lineHeight: "var(--leading-relaxed)",
  margin: 0,
};

const columnHeadingStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-xs)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--text-positive-tertiary)",
  margin: 0,
  marginBottom: "var(--space-md)",
  fontWeight: tokenNumber("var(--weight-regular)"),
};

const linkListStyle: CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
};

const ruleStyle: CSSProperties = {
  border: 0,
  borderTop: "1px solid var(--border-positive-primary)",
  marginBlock: "var(--space-2xl)",
  marginInline: 0,
};

const bottomRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-md)",
  flexWrap: "wrap",
};

// The copyright and the address stack at the bottom row's start, the address one 2xs below
// (v6.13.0): the two are one small-type block, not two rows.
const bottomStartStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2xs)",
  minWidth: 0,
};
const addressStyle: CSSProperties = {
  // The copyright's own face (the mono meta voice), so the two lines read as one block.
  fontFamily: "var(--font-code)",
  fontStyle: "normal",
  fontSize: "var(--type-xs)",
  lineHeight: "var(--leading-snug)",
  color: "var(--text-positive-tertiary)",
};
const copyrightStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-xs)",
  color: "var(--text-positive-tertiary)",
};

const socialRowStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-sm)",
};

// Right-aligned group holding the optional actions slot (e.g. ThemeToggle) beside
// the social icons in the bottom row.
const bottomEndStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-md)",
};
