import { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Section } from "@/components/Section";
import { Container } from "@/components/Container";
import { Heading } from "@/components/Heading";
import { Panel } from "@/components/Panel";
import { PageHead } from "@/components/PageHead";
import { Stat } from "@/components/Stat";
import { StatBand } from "@/components/StatBand";
import { TokenRow } from "@/components/TokenRow";
import { DataLabel } from "@/components/DataLabel";
import { BackToTop } from "@/components/BackToTop";
import { PageNav } from "@/components/PageNav";
import { TokenInventory } from "@/components/kit/TokenInventory";
import { DialReadout } from "@/components/kit/DialReadout";
import { SpaceRow, DialWord, StatWithSub } from "@/components/kit/style-guide-live";
import { TOKEN_SOURCE_COUNT, TOKEN_DECLARED, ALL_TOKEN_NAMES, BRAND_LOCAL_NAMES } from "@/components/kit/token-source";
import { tokenNumber } from "@/components/internal/styles";
import kitManifest from "@/components/kit/kit-manifest.json";

/* ============================================================
   StyleGuidePage — the style guide every fork ships (owner, 7 Jul): the client
   brand sheet, one synced surface. HQ mounts it at /hq/style-guide so the studio
   sees exactly what a fork gets; a fork mounts it at /style-guide. It is an
   INVENTORY, not documentation: what the brand resolves to right now, in this
   theme, on this fork. The deep teaching surface stays the mother's /foundations.

   Everything derives: color rows are TokenRow (runtime-resolved hex, so a fork
   skin shows ITS values with no edits), the token count comes from the build-time
   tokens.css parse, and the type/space scales render the live tokens.

   TWO REGISTERS, ONE PROP (v6.36.0, the CD reference-surface boards). The
   information is the same in both.
   - "bordered" (the default, the fork's public /style-guide): panel-composed,
     the ComponentsShowroom treatment (owner, 9 Jul, from the ArtistHQ reference
     canvas): each section a bordered Panel whose header carries the H2 title +
     a mono scope subtext and the head rule, PageHead intro, the PageNav rail.
   - "surface" (the HQ's /hq/style-guide): the data-surface register. PageHead
     variant="record" with the counts as Stats; Panel variant="surface" (no
     border, no head rule, the description as a sentence-case line, the stamp
     at the head's right); rows header-less with one hairline BETWEEN rows and
     never under a head; token names and values in the mono face (code and
     figures); the values the sheet cannot print resolved live from tokens.css;
     Spacing and Dials side by side; All tokens with the Toolbar and sans group
     heads. No rail: the HQ has its own.
   The children slot is the host's studio band: it opens at section rhythm below
   the client sheet, and a host may render Cards there (HQ's ops panels do), which
   visibly separates studio internals from the flat client-facing sections.
   Server component.
   ============================================================ */

// The curated role groups a client cares about, in one place (the single source all
// surfaces share; forks stop hand-copying their own lists).
const COLOR_GROUPS: { name: string; tokens: string[] }[] = [
  {
    name: "Brand",
    tokens: ["--accent-base", "--accent-soft", "--accent-emphasis", "--text-on-accent"],
  },
  {
    name: "Text and surface",
    tokens: [
      "--text-positive-primary",
      "--text-positive-secondary",
      "--text-positive-tertiary",
      "--background-positive-primary",
      "--background-positive-secondary",
    ],
  },
  {
    name: "Borders",
    tokens: ["--border-positive-primary", "--border-positive-secondary", "--border-focus", "--border-error"],
  },
  {
    name: "Status",
    tokens: ["--green-base", "--yellow-base", "--red-base", "--cyan-base"],
  },
];

// The twelve size tokens tokens.css declares (typography audit, 23 Aug 2026: the sheet showed nine,
// omitting --type-md-plus, the rung every size-6 Heading reads, and the display-reserved 5xl / 6xl).
const TYPE_SCALE = ["--type-2xs", "--type-xs", "--type-sm", "--type-md", "--type-md-plus", "--type-lg", "--type-xl", "--type-2xl", "--type-3xl", "--type-4xl", "--type-5xl", "--type-6xl"];
const DISPLAY_RESERVED = new Set(["--type-5xl", "--type-6xl"]);
// The non-size type tokens, rendered live like the scale so the sheet shows the whole voice.
const WEIGHTS = ["--weight-light", "--weight-regular", "--weight-medium", "--weight-semibold", "--weight-bold"];
const LEADINGS = ["--leading-tight", "--leading-snug", "--leading-normal", "--leading-relaxed"];
const TRACKINGS = ["--tracking-tight", "--tracking-snug", "--tracking-wide", "--tracking-wider", "--tracking-widest"];
const SPACE_SCALE = ["--space-3xs", "--space-2xs", "--space-xs", "--space-sm", "--space-md", "--space-lg", "--space-xl", "--space-2xl"];
const FONTS: { token: string; label: string }[] = [
  { token: "--font-display", label: "Display" },
  { token: "--font-body", label: "Body" },
  { token: "--font-code", label: "Code" },
  { token: "--font-brand", label: "Brand" },
];
const DIAL_COUNT = 6;

const COLOR_COUNT = COLOR_GROUPS.reduce((n, g) => n + g.tokens.length, 0);
// The value tokens.css declares for a token, as written (the surface register prints it beside
// the name; the boards drew it in brackets because the sheet cannot know it).
const declared = (token: string): string => TOKEN_DECLARED[token] ?? "";
const BASELINE = (kitManifest as { baseline: string }).baseline;

// Drives the floating PageNav rail and the section anchors. A contract with the
// H2 ids below: check-sync-unit statically extracts both and fails on mismatch.
// HQ's studio panels (the children slot) stay off the rail: they are ops extras,
// not part of the client sheet's own map. Both registers anchor the same ids.
const SECTIONS: { id: string; label: string }[] = [
  { id: "sg-colors", label: "Colors" },
  { id: "sg-typography", label: "Typography" },
  { id: "sg-spacing", label: "Spacing" },
  { id: "sg-dials", label: "Dials" },
  { id: "sg-inventory", label: "All tokens" },
];

export type StyleGuideRegister = "bordered" | "surface";

export function StyleGuidePage({
  children,
  backToTop = true,
  componentsHref = "/components",
  register = "bordered",
}: {
  children?: ReactNode;
  /** The page owns its BackToTop so a fork mount gets it for free. A host whose
      layout already mounts one (HQ) passes false; one corner, one button. */
  backToTop?: boolean;
  /** The sibling showroom's path. Fork default; HQ passes "/hq/components". */
  componentsHref?: string;
  /** The look (v6.36.0): "bordered" for a fork's public sheet, "surface" for the HQ. */
  register?: StyleGuideRegister;
}) {
  if (register === "surface") {
    const stamp = <span style={stampStyle}>tokens.css, {BASELINE}</span>;
    return (
      // background="none": the shell owns the page ground on a data surface (G1), the band paints none.
      <Section padding="normal" background="none">
        <Container size="lg">
          <style href="magentaweb-style-guide-surface" precedence="default">{surfaceCss}</style>
          <PageHead
            variant="record"
            title="Style guide"
            meta={[
              { text: <DialWord attr="data-neutral" fallback="kit" suffix=" neutral" /> },
              { text: `tokens.css, ${BASELINE}` },
            ]}
            note={<span style={ledeStyle}>The curated colour roles, the type and spacing scales and the six dials this site runs on, then every token it defines with its value in both themes.</span>}
            stamp="read live off this document"
          />
          <div data-mw-sg-stats="" style={surfaceStatsStyle}>
            <StatBand ariaLabel="Style guide counts" gap="xl" phoneColumns={2}>
              <StatWithSub label="Tokens" value={TOKEN_SOURCE_COUNT} sub={`${BRAND_LOCAL_NAMES.length} brand-local`} />
              <Stat label="Dials" value={DIAL_COUNT} />
              <Stat label="Typefaces" value={FONTS.length} />
              <StatWithSub label="Type rungs" value={TYPE_SCALE.length} sub={`${DISPLAY_RESERVED.size} display-reserved`} />
              <Stat label="Spacing steps" value={SPACE_SCALE.length} />
            </StatBand>
          </div>

          <div style={surfaceStackStyle}>
            {/* Colors: the curated roles in two columns of groups, TokenRow on the surface register. */}
            <Panel variant="surface" id="sg-colors" title="Colors" controls={stamp}>
              <p style={surfaceNoteStyle}>The curated colour roles this brand runs on. Rows re-resolve live when the theme flips; select one to copy its token.</p>
              <div data-mw-sg-two="">
                {COLOR_GROUPS.map((g) => (
                  <div key={g.name} data-mw-sg-grp="">
                    <span data-mw-sg-gt="">{g.name}</span>
                    <div data-mw-sg-rows="">
                      {g.tokens.map((t) => (
                        <TokenRow key={t} token={t} register="surface" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Typography: typefaces and weights side by side, the scale full width, leading and
                tracking side by side. The value after each token name is the declared value read
                live from tokens.css (the boards' brackets). */}
            <Panel variant="surface" id="sg-typography" title="Typography" controls={stamp}>
              <p style={surfaceNoteStyle}>The {FONTS.length} typefaces, the {TYPE_SCALE.length}-rung type scale and the weight, leading and tracking steps, rendered live at their tokens. The two largest rungs are display-reserved: no Heading size maps to them.</p>
              <div data-mw-sg-flow="">
                <div data-mw-sg-two="">
                  <div data-mw-sg-grp="">
                    <span data-mw-sg-gt="">Typefaces</span>
                    <div data-mw-sg-rows="">
                      {FONTS.map((f) => (
                        <div key={f.token} data-mw-sg-spec="" data-lead="">
                          <span data-mw-sg-k="">{f.label}</span>
                          <span style={{ fontFamily: `var(${f.token})`, fontSize: "var(--type-md)", color: "var(--text-positive-primary)" }}>The quick brown fox</span>
                          <span data-mw-sg-t="">{f.token} · <span data-mw-sg-v="" title={declared(f.token)}>{declared(f.token)}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div data-mw-sg-grp="">
                    <span data-mw-sg-gt="">Weights</span>
                    <div data-mw-sg-rows="">
                      {WEIGHTS.map((w) => (
                        <div key={w} data-mw-sg-spec="">
                          <span style={{ fontFamily: "var(--font-body)", fontSize: "var(--type-md)", fontWeight: tokenNumber(`var(${w})`), color: "var(--text-positive-primary)" }}>The quick brown fox</span>
                          <span data-mw-sg-t="">{w} · <span data-mw-sg-v="" title={declared(w)}>{declared(w)}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div data-mw-sg-grp="">
                  <span data-mw-sg-gt="">Scale</span>
                  <div data-mw-sg-rows="">
                    {TYPE_SCALE.map((t) => (
                      <div key={t} data-mw-sg-scale="">
                        <span data-mw-sg-nm="">{t}</span>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: `var(${t})`, lineHeight: "var(--leading-tight)", color: "var(--text-positive-primary)" }}>Aa</span>
                        <span data-mw-sg-t=""><span data-mw-sg-v="" title={declared(t)}>{declared(t)}</span>{DISPLAY_RESERVED.has(t) ? " · display-reserved" : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div data-mw-sg-two="">
                  <div data-mw-sg-grp="">
                    <span data-mw-sg-gt="">Leading</span>
                    <div data-mw-sg-rows="">
                      {LEADINGS.map((l) => (
                        <div key={l} data-mw-sg-spec="">
                          <span style={{ fontFamily: "var(--font-body)", fontSize: "var(--type-sm)", lineHeight: tokenNumber(`var(${l})`), color: "var(--text-positive-primary)", maxWidth: "28ch" }}>Two lines of running text show the line box each leading step draws.</span>
                          <span data-mw-sg-t="">{l} · <span data-mw-sg-v="" title={declared(l)}>{declared(l)}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div data-mw-sg-grp="">
                    <span data-mw-sg-gt="">Tracking</span>
                    <div data-mw-sg-rows="">
                      {TRACKINGS.map((t) => (
                        <div key={t} data-mw-sg-spec="">
                          <span style={{ fontFamily: "var(--font-body)", fontSize: "var(--type-sm)", letterSpacing: `var(${t})`, textTransform: t.includes("wide") ? "uppercase" : undefined, color: "var(--text-positive-primary)" }}>The quick brown fox</span>
                          <span data-mw-sg-t="">{t} · <span data-mw-sg-v="" title={declared(t)}>{declared(t)}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            {/* Spacing and Dials side by side (the board's two half-width panels). */}
            <div data-mw-sg-two="" data-panels="">
              <Panel variant="surface" id="sg-spacing" title="Spacing" controls={stamp}>
                <p style={surfaceNoteStyle}>The spacing scale at the <DialWord attr="data-spacing" fallback="normal" /> dial, each step drawn at its true size and measured in px on this document.</p>
                <div data-mw-sg-rows="">
                  {SPACE_SCALE.map((s) => (
                    <SpaceRow key={s} token={s} declared={declared(s)} />
                  ))}
                </div>
              </Panel>
              <Panel variant="surface" id="sg-dials" title="Dials" controls={<span style={stampStyle}>read live</span>}>
                <p style={surfaceNoteStyle}>The six master dials, read live off this document. Every colour, size and easing on this page resolves through them. Neutral swaps the grey ramp&apos;s temperature while holding each rung&apos;s lightness; unset is the kit ramp exactly.</p>
                <DialReadout register="surface" />
              </Panel>
            </div>

            {/* Full token inventory: the exhaustive, code-truthful list, on the surface register. */}
            <Panel variant="surface" id="sg-inventory" title="All tokens" count={String(ALL_TOKEN_NAMES.length)} controls={stamp}>
              <p style={surfaceNoteStyle}>Every token this site defines, system and brand-local, with its resolved value in both themes side by side. The brand ramp and any fork-only tokens are here, not only the curated roles above.</p>
              <TokenInventory names={ALL_TOKEN_NAMES} brandLocal={BRAND_LOCAL_NAMES} register="surface" />
            </Panel>
          </div>

          {children ? <div style={childrenBandStyle}>{children}</div> : null}
          {backToTop ? <BackToTop /> : null}
        </Container>
      </Section>
    );
  }

  return (
    <Section padding="normal">
      <Container size="lg">
        {/* The floating "on this page" rail: scroll-spied and collapsible, an
            overlay rather than a grid column, so the content keeps the full
            container width. */}
        <PageNav sections={SECTIONS} />
        <Heading level={1} size={2}>Style guide</Heading>
        <p style={leadStyle}>
          The brand sheet for this site: what every token resolves to right now, in this
          theme. See every component rendered live in the{" "}
          <Link href={componentsHref} style={linkStyle}>components showroom</Link>.
        </p>

        <div style={statBandStyle}>
          <Stat accent countUp label="Tokens" value={TOKEN_SOURCE_COUNT} />
          {BRAND_LOCAL_NAMES.length > 0 ? <Stat countUp label="Brand-local" value={BRAND_LOCAL_NAMES.length} /> : null}
          <Stat countUp label="Color roles" value={COLOR_COUNT} />
          <Stat countUp label="Type sizes" value={TYPE_SCALE.length} />
          <Stat countUp label="Space steps" value={SPACE_SCALE.length} />
        </div>

        {/* The client sheet, one Panel per section (the ArtistHQ reference
            treatment, owner, 9 Jul): panel header carries the section title +
            a mono scope line, the hairline is the panel's single rule, and the
            body holds the section's note and rows. The stack separates panels
            at the section-break tier (xl, the HQ ladder's top in-band beat);
            everything inside a panel sits tighter (lg and below). */}
        <div style={panelStackStyle}>
          {/* Colors */}
          <Panel
            id="sg-colors"
            title="Colors"
            subheading={COLOR_GROUPS.map((g) => g.name).join(" · ")}
            subheadingVariant="mono"
          >
            <p style={panelNoteStyle}>The curated color roles this brand runs on. Rows re-resolve live when the theme flips; click one to copy its token.</p>
            <div style={sectionGroupsStyle}>
              {COLOR_GROUPS.map((g) => (
                <div key={g.name}>
                  <Heading level={3} size={6}>{g.name}</Heading>
                  <div style={rowsStyle}>
                    {g.tokens.map((t) => (
                      <TokenRow key={t} token={t} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Typography */}
          <Panel
            id="sg-typography"
            title="Typography"
            subheading="Typefaces · scale · weights · leading · tracking"
            subheadingVariant="mono"
          >
            <p style={panelNoteStyle}>The {FONTS.length} typefaces, the {TYPE_SCALE.length}-rung type scale and the weight, leading and tracking steps, rendered live at their tokens. The two largest rungs are display-reserved: no Heading size maps to them.</p>
            <div style={sectionGroupsStyle}>
              <div>
                <Heading level={3} size={6}>Typefaces</Heading>
                <div style={rowsStyle}>
                  {FONTS.map((f) => (
                    <div key={f.token} style={typeRowStyle}>
                      <DataLabel>{f.label}</DataLabel>
                      <span style={{ fontFamily: `var(${f.token})`, fontSize: "var(--type-lg)", color: "var(--text-positive-primary)" }}>
                        The quick brown fox
                      </span>
                      <span style={tokenNameStyle}>{f.token}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Heading level={3} size={6}>Scale</Heading>
                <div style={rowsStyle}>
                  {TYPE_SCALE.map((t) => (
                    <div key={t} style={typeRowStyle}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: `var(${t})`, color: "var(--text-positive-primary)", lineHeight: "var(--leading-tight)" }}>
                        Aa
                      </span>
                      <span style={tokenNameStyle}>{t}{DISPLAY_RESERVED.has(t) ? " (display-reserved)" : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Heading level={3} size={6}>Weights</Heading>
                <div style={rowsStyle}>
                  {WEIGHTS.map((w) => (
                    <div key={w} style={typeRowStyle}>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "var(--type-lg)", fontWeight: tokenNumber(`var(${w})`), color: "var(--text-positive-primary)" }}>
                        The quick brown fox
                      </span>
                      <span style={tokenNameStyle}>{w}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Heading level={3} size={6}>Leading</Heading>
                <div style={rowsStyle}>
                  {LEADINGS.map((l) => (
                    <div key={l} style={typeRowStyle}>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "var(--type-md)", lineHeight: tokenNumber(`var(${l})`), color: "var(--text-positive-primary)", maxWidth: "28ch" }}>
                        Two lines of running text show the line box each leading step draws.
                      </span>
                      <span style={tokenNameStyle}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Heading level={3} size={6}>Tracking</Heading>
                <div style={rowsStyle}>
                  {TRACKINGS.map((t) => (
                    <div key={t} style={typeRowStyle}>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "var(--type-sm)", letterSpacing: `var(${t})`, textTransform: t.includes("wide") ? "uppercase" : undefined, color: "var(--text-positive-primary)" }}>
                        The quick brown fox
                      </span>
                      <span style={tokenNameStyle}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          {/* Spacing */}
          <Panel
            id="sg-spacing"
            title="Spacing"
            subheading={`${SPACE_SCALE.length} steps · drawn at true size`}
            subheadingVariant="mono"
          >
            <p style={panelNoteStyle}>The spacing scale, each step drawn at its true size.</p>
            <div style={rowsStyle}>
              {SPACE_SCALE.map((s) => (
                <div key={s} style={spaceRowStyle}>
                  <span style={{ ...spaceBarStyle, width: `var(${s})` }} aria-hidden="true" />
                  <span style={tokenNameStyle}>{s}</span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Dials. INVENTORY, not documentation, which is this sheet's whole
              contract: it reads the six master dials off <html> and says what
              THIS fork is running, rather than explaining what they do. The
              mother's /foundations is the teaching surface and links from here.

              It exists because of the neutral dial (v6.2.0). The other five are
              visible in their effects: a reader can see a radius and a type
              ratio. Neutral moves the grey ramp by hue and chroma while holding
              every rung's lightness, so it is precisely the setting a reader
              cannot name by looking, and four forks now set it. */}
          <Panel
            id="sg-dials"
            title="Dials"
            subheading="spacing · type · motion · theme · radius · neutral"
            subheadingVariant="mono"
          >
            <p style={panelNoteStyle}>The six master dials, read live off this document. Every colour, size and easing above resolves through them, so this is the setting behind the whole sheet. Neutral is the newest: it swaps the grey ramp&apos;s temperature while holding each rung&apos;s lightness, which is why the contrast ladder does not move when it does. Unset is the kit ramp exactly.</p>
            <DialReadout />
          </Panel>

          {/* Full token inventory: the exhaustive, code-truthful list. Every system
              token plus this fork's brand-local additions, each shown in light AND
              dark at once (TokenInventory measures both), so nothing defined in
              tokens.css or brand.css stays hidden. */}
          <Panel
            id="sg-inventory"
            title="All tokens"
            subheading={`${ALL_TOKEN_NAMES.length} tokens · ${BRAND_LOCAL_NAMES.length} brand-local · light and dark`}
            subheadingVariant="mono"
          >
            <p style={panelNoteStyle}>Every token this site defines, system and brand-local, with its resolved value in both themes side by side. The brand ramp and any fork-only tokens are here, not just the curated roles above.</p>
            <TokenInventory names={ALL_TOKEN_NAMES} brandLocal={BRAND_LOCAL_NAMES} />
          </Panel>
        </div>

        {/* The host's studio band: opens at section rhythm below the client
            sheet. HQ renders its ops panels (Cards, studio-tagged) here; the
            stack owns the gap between them (the band's panels render as
            sibling Cards and expect the consumer to space them). */}
        {children ? <div style={childrenBandStyle}>{children}</div> : null}
        {backToTop ? <BackToTop /> : null}
      </Container>
    </Section>
  );
}

const leadStyle: CSSProperties = {
  marginTop: "var(--space-md)",
  maxWidth: "var(--measure-prose)", // was 60ch: the reading measure (pass 4, 27 Aug 2026)
  fontSize: "var(--type-md)",
  lineHeight: "var(--leading-relaxed)",
  color: "var(--text-positive-secondary)",
};
const linkStyle: CSSProperties = { color: "var(--text-positive-link)", textDecoration: "none" };

// The stats are items, so they separate at the item rung (lg) and the head binds above them at
// xl. At xl they wrapped on a phone into a stack spaced exactly like the head's bind, and the
// spacing-ladder probe read the lede as one of the stats on every fork's /style-guide (6 Sep 2026).
const statBandStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--space-lg)",
  marginTop: "var(--space-xl)",
};

// The section panels: one Panel per sheet section, separated at the section
// break (xl, the HQ hqSectionBreak tier) and set off from the stat band by the
// same beat. Chrome earns the tighter rung: a panel border adds the optical air
// a bare heading needed 3xl to fake.
const panelStackStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xl)",
  marginTop: "var(--space-xl)",
};
// The section's one-line note, first in the panel body: quiet sentence tier,
// bound to the rows below it at the lg group rung.
const panelNoteStyle: CSSProperties = {
  margin: 0,
  marginBottom: "var(--space-lg)",
  maxWidth: "var(--measure-prose)", // was 62ch: the reading measure (pass 4, 27 Aug 2026)
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-relaxed)",
  color: "var(--text-positive-secondary)",
};

// Groups inside a flat section (Brand / Borders..., Typefaces / Scale): one rung
// tighter than the 3xl section rhythm, so the ladder reads section > group > rows.
const sectionGroupsStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-lg)",
};

const rowsStyle: CSSProperties = {
  marginTop: "var(--space-md)",
  width: "100%",
};

// The studio band the children slot opens (see the JSX note above).
const childrenBandStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-lg)",
  marginTop: "var(--space-3xl)",
};

const typeRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: "var(--space-md)",
  padding: "var(--space-xs) 0",
  borderTop: "1px solid var(--border-positive-secondary)",
  flexWrap: "wrap",
};

const spaceRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-md)",
  padding: "var(--space-xs) 0",
  borderTop: "1px solid var(--border-positive-secondary)",
};

// No radius: this bar is a RULER, drawn at the token's true size (the panel copy
// promises exactly that), and the dial's radius was eating the small steps' drawn
// length. A measurement does not react to a corner dial (structural audit, 15 Jul).
const spaceBarStyle: CSSProperties = {
  display: "inline-block",
  height: "var(--space-xs)",
  background: "var(--accent-base)",
  flexShrink: 0,
};

const tokenNameStyle: CSSProperties = {
  marginLeft: "auto",
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-xs)",
  letterSpacing: "var(--tracking-wide)",
  color: "var(--text-positive-tertiary)",
  whiteSpace: "nowrap",
};

/* ---- The surface register (v6.36.0) ---- */

// The record head's lede: one sentence under the meta and links lines, at the reading measure.
const ledeStyle: CSSProperties = {
  maxWidth: "var(--measure-prose)",
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-relaxed)",
  color: "var(--text-positive-primary)",
};
// The stamp at a panel head's right: the mono caption voice, tertiary, tabular.
const stampStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  fontVariantNumeric: "tabular-nums",
  color: "var(--text-positive-tertiary)",
  whiteSpace: "nowrap",
};
// The counts bind under the head at xl; the panel stack opens under them at the section break.
const surfaceStatsStyle: CSSProperties = { marginTop: "var(--space-xl)" };
const surfaceStackStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xl)",
  marginTop: "var(--space-2xl)",
};
// The panel's description: the sentence-case line under the head, then the rows at md.
const surfaceNoteStyle: CSSProperties = {
  margin: 0,
  marginBottom: "var(--space-md)",
  maxWidth: "var(--measure-prose)",
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-relaxed)",
  color: "var(--text-positive-secondary)",
};

// The surface rows: two-column groups on the desk that stack on a phone; every row header-less
// with one hairline BETWEEN rows (the first draws none), never under a head. The grids live in
// the sheet so the phone rules can win the cascade.
const surfaceCss = `
[data-mw-sg-two] { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: var(--space-lg); row-gap: var(--space-xl); }
[data-mw-sg-two][data-panels] { align-items: start; }
[data-mw-sg-flow] { display: flex; flex-direction: column; gap: var(--space-xl); }
[data-mw-sg-grp] { display: flex; flex-direction: column; gap: var(--space-xs); min-width: 0; }
[data-mw-sg-gt] { font-family: var(--font-body); font-size: var(--type-xs); font-weight: var(--weight-semibold); color: var(--text-positive-primary); }
[data-mw-sg-rows] { display: flex; flex-direction: column; }
[data-mw-sg-spec], [data-mw-sg-scale], [data-mw-sg-space] {
  display: grid; column-gap: var(--space-sm); align-items: center;
  padding: var(--space-xs) 0; border-top: 1px solid var(--border-positive-primary);
}
[data-mw-sg-spec]:first-child, [data-mw-sg-scale]:first-child, [data-mw-sg-space]:first-child { border-top: 0; }
[data-mw-sg-spec] { grid-template-columns: minmax(0, 1fr) auto; min-height: 2.75rem; }
[data-mw-sg-spec][data-lead] { grid-template-columns: 6rem minmax(0, 1fr) auto; }
[data-mw-sg-scale] { grid-template-columns: 7.5rem minmax(0, 1fr) auto; align-items: baseline; }
[data-mw-sg-space] { grid-template-columns: 7.5rem minmax(0, 1fr) 6rem 4.5rem; min-height: 2.375rem; }
[data-mw-sg-k] { font-size: var(--type-xs); color: var(--text-positive-secondary); }
[data-mw-sg-nm] { font-family: var(--font-code); font-size: var(--type-xs); color: var(--text-positive-primary); }
[data-mw-sg-t] {
  font-family: var(--font-code); font-size: var(--type-xs); color: var(--text-positive-secondary);
  text-align: right; white-space: nowrap; min-width: 0; max-width: 20rem; overflow: hidden; text-overflow: ellipsis;
}
[data-mw-sg-space] > [data-mw-sg-t] { max-width: none; }
[data-mw-sg-spec] > [data-mw-sg-t] { white-space: normal; max-width: 16rem; line-height: var(--leading-normal); }
[data-mw-sg-v] { display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; }
[data-mw-sg-bar] { display: block; height: 0.625rem; background: var(--accent-base); }
@media (max-width: 767px) { /* --mw-bp-tablet */
  /* StatBand's own phone-columns rule (its hoisted sheet) now covers the two-per-row
     count strip; this external override could never win against StatBand's inline
     display, which is why it never applied (REF-STATBAND-390). */
  [data-mw-sg-two] { grid-template-columns: minmax(0, 1fr); }
  [data-mw-sg-spec], [data-mw-sg-spec][data-lead] { grid-template-columns: minmax(0, 1fr); row-gap: var(--space-3xs); }
  [data-mw-sg-scale] { grid-template-columns: minmax(0, 1fr) auto; row-gap: var(--space-3xs); }
  [data-mw-sg-scale] > [data-mw-sg-t] { grid-column: 1; grid-row: 2; }
  [data-mw-sg-scale] > span:nth-child(2) { grid-column: 2; grid-row: 1 / 3; }
  [data-mw-sg-space] { grid-template-columns: minmax(0, 1fr) 4.5rem 3.5rem; row-gap: var(--space-3xs); }
  [data-mw-sg-space] > span:nth-child(2) { grid-column: 1 / -1; grid-row: 2; }
  [data-mw-sg-t] { text-align: left; max-width: none; }
}
`;
