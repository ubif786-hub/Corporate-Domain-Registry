import { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { ArrowRight, Settings, Favorite, Home, Folders, Document, Warning, Renew, CheckmarkOutline } from "@carbon/icons-react";
import { Section } from "@/components/Section";
import { Container } from "@/components/Container";
import { Row } from "@/components/Row";
import { Column } from "@/components/Column";
import { Flow } from "@/components/Flow";
import { Spacer } from "@/components/Spacer";
import { Divider } from "@/components/Divider";
import { Heading } from "@/components/Heading";
import { Eyebrow } from "@/components/Eyebrow";
import { Prose } from "@/components/Prose";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/Card";
import { Glance } from "@/components/Glance";
import { DataLabel } from "@/components/DataLabel";
import { Stat } from "@/components/Stat";
import { LegendDot } from "@/components/LegendDot";
import { Table } from "@/components/Table";
import { Timeline } from "@/components/Timeline";
import { Kbd } from "@/components/Kbd";
import { PromptedTextarea } from "@/components/PromptedTextarea";
import { StreakStrip, StreakCell } from "@/components/StreakStrip";
import { ScorecardDots } from "@/components/ScorecardDots";
import { TieredRung } from "@/components/TieredRung";
import { IdChip } from "@/components/IdChip";
import { PriceLabel } from "@/components/PriceLabel";
import { AssetCard } from "@/components/AssetCard";
import { SwatchRow } from "@/components/SwatchRow";
import { ProvenanceQuote } from "@/components/ProvenanceQuote";
import { DiaryEntry } from "@/components/DiaryEntry";
import { HeroBanner } from "@/components/HeroBanner";
import { CalloutCard } from "@/components/CalloutCard";
import { AiCard } from "@/components/AiCard";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatContextCard } from "@/components/ChatContextCard";
import { EmptyState } from "@/components/EmptyState";
import { InvoicePaper } from "@/components/InvoicePaper";
import { LineItemRow } from "@/components/LineItemRow";
import { ContactStrip } from "@/components/ContactStrip";
import { TokenRow } from "@/components/TokenRow";
import { Badge } from "@/components/Badge";
import { Avatar } from "@/components/Avatar";
import { Panel } from "@/components/Panel";
import { BackToTop } from "@/components/BackToTop";
import { PageNav } from "@/components/PageNav";
import { Button } from "@/components/Button";
import { Image } from "@/components/Image";
import { Video } from "@/components/Video";
import { Media } from "@/components/Media";
import { Carousel } from "@/components/Carousel";
import { Lightbox } from "@/components/Lightbox";
import { Marquee } from "@/components/Marquee";
import { Input } from "@/components/Input";
import { Textarea } from "@/components/Textarea";
import { Checkbox } from "@/components/Checkbox";
import { Radio, RadioGroup } from "@/components/Radio";
import { ChoiceCard } from "@/components/ChoiceCard";
import { Switch } from "@/components/Switch";
import { Select } from "@/components/Select";
import { Combobox } from "@/components/Combobox";
import { MultiSelect } from "@/components/MultiSelect";
import { Listbox } from "@/components/Listbox";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Slider } from "@/components/Slider";
import { Otp } from "@/components/Otp";
import { Rating } from "@/components/Rating";
import { ColorPicker } from "@/components/ColorPicker";
import { TimePicker } from "@/components/TimePicker";
import { DatePicker } from "@/components/DatePicker";
import { DateRangePicker } from "@/components/DateRangePicker";
import { FormGroup } from "@/components/FormGroup";
import { FilterPanel } from "@/components/FilterPanel";
import { Accordion } from "@/components/Accordion";
import { Tabs, TabsList, TabsTab, TabsPanels, TabsPanel } from "@/components/Tabs";
import { Tooltip, TooltipInfoTrigger } from "@/components/Tooltip";
import { Footer } from "@/components/Footer";
import { NavRail } from "@/components/NavRail";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CountUp } from "@/components/motion/CountUp";
import { Magnetic } from "@/components/motion/Magnetic";
import { Parallax } from "@/components/motion/Parallax";
import { RevealBlock } from "@/components/motion/RevealBlock";
import { RevealText } from "@/components/motion/RevealText";
import { ScrollFillText } from "@/components/motion/ScrollFillText";
import { ScrollScene } from "@/components/motion/ScrollScene";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { LineChart } from "@/components/charts/LineChart";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { ChannelSplitBar } from "@/components/charts/ChannelSplitBar";
import { WordFrequencyCloud } from "@/components/charts/WordFrequencyCloud";
import { TopBar } from "@/components/TopBar";
import { BrandLockup } from "@/components/BrandLockup";
import { BrandMark } from "@/components/BrandMark";
import { ShowroomHeroPlateDemo } from "./showroom-demos";
import { ShowroomModalDemo, ShowroomMenuDemo, ShowroomToastDemo, ShowroomAppShellDemo, ShowroomPhotoStripDemo, ShowroomCommandPaletteDemo, ShowroomLineItemRowDemo, ShowroomSearchDemo, ShowroomPaginationDemo, ShowroomTabLinksDemo, ShowroomChatComposerDemo, ShowroomBrandLockupDemo, ShowroomBrandWordmarkDemo, ShowroomHelpModalDemo, ShowroomNotificationsDemo, ShowroomFormModalDemo, ShowroomFileUploadDemo, ShowroomBulkActionBarDemo } from "@/components/kit/showroom-demos";
import { PageHead } from "@/components/PageHead";
import { Toolbar } from "@/components/Toolbar";
import { RecordCard } from "@/components/RecordCard";
import { Search } from "@/components/Search";
import { StatBand } from "@/components/StatBand";
import { PanelGrid } from "@/components/PanelGrid";
import { ProgressBar } from "@/components/ProgressBar";
import { TextField } from "@/components/TextField";
import { MaskedInput, PHONE_MASK } from "@/components/MaskedInput";
import { CurrencyInput } from "@/components/CurrencyInput";
import { PricingCard } from "@/components/PricingCard";
import { Stepper } from "@/components/Stepper";
import { DataTable } from "@/components/DataTable";
import { NotificationFeed } from "@/components/NotificationFeed";
import { Skeleton } from "@/components/Skeleton";
import { tokenNumber } from "@/components/internal/styles";
import kitManifest from "@/components/kit/kit-manifest.json";
import { ShowroomIndex, type ShowroomIndexRow } from "@/components/kit/ShowroomIndex";
import { ROW_SAMPLES } from "@/components/kit/showroom-row-samples";
import { atlasIconFor } from "@/components/kit/atlas-icons";

/* ============================================================
   ComponentsShowroom: the synced live showroom every fork ships (decision A,
   owner-approved). Every atlas component rendered as a client would actually
   use it, in the CONSUMING context's own brand: a fork shows its tokens, HQ
   shows the mother's. One copy in the sync unit, so the per-fork hand-copied
   showrooms (and their proven API drift) are retired.

   COVERAGE-CHECKED (the anti-drift mechanism): every Sample declares the
   registry components it demonstrates via `components={[...]}`, and the
   SHOWROOM_EXEMPT literal below names the components that genuinely cannot be
   demoed here, with the reason. scripts/check-sync-unit.mjs statically
   extracts both and FAILS if any atlas (grouped) registry component is
   neither demoed nor exempted, if a name is unknown, or if a name appears in
   both. Adding a component to the registry breaks the check until it appears
   here.

   The inventory folds into this page: the manifest stat band under the H1,
   and each Sample's label row carries its components' variant chips.
   Brand-agnostic: tokens only; demo imagery is remote sample content.
   ============================================================ */

// Components that cannot be demoed in this context. Exemptions are for genuine
// collisions only, never for awkwardness; every entry carries its reason.
const SHOWROOM_EXEMPT: Record<string, string> = {
  Nav: "the live Nav is this page's own chrome; a second live nav on one page would collide on the Primary landmark and its element ids",
  BackToTop:
    "the live BackToTop is this page's own furniture (the showroom mounts it); a second fixed instance would stack on the same corner",
  PageNav:
    "the live PageNav is this page's own rail (scroll-spying these sections); a second fixed rail would stack on the same corner",
};

const kit = kitManifest as {
  baseline: string;
  groups: string[];
  components: { name: string; label: string; slug: string; group: string; kind: string; variants: string[]; options: number }[];
};
const BY_NAME = new Map(kit.components.map((c) => [c.name, c]));

// Drives the floating PageNav rail and the section anchors. A contract with the
// H2 ids below: check-sync-unit statically extracts both and fails on mismatch.
const SECTIONS: { id: string; label: string }[] = [
  { id: "sr-content", label: "Content and typography" },
  { id: "sr-forms", label: "Forms and inputs" },
  { id: "sr-data-display", label: "Data display" },
  { id: "sr-overlays", label: "Overlays and navigation" },
  { id: "sr-media", label: "Media" },
  { id: "sr-dataviz", label: "Data visualisation" },
  { id: "sr-layout", label: "Layout and structure" },
  { id: "sr-motion", label: "Motion" },
  { id: "sr-theme", label: "Theme" },
  { id: "sr-also", label: "Also in the system" },
];

// Deterministic demo data for StreakStrip: `days` ISO dates ending at `end`,
// values cycling a fixed pattern (no randomness, stable across renders). UTC
// day math only, so server and client agree.
function streakDemoData(end: string, days: number): StreakCell[] {
  const pattern = [2, 0, 3, 4, 1, 0, 2, 3, 0, 1, 4, 2, 0, 3] as const;
  const endMs = Date.parse(`${end}T00:00:00Z`);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(endMs - (days - 1 - i) * 86400000);
    return { date: d.toISOString().slice(0, 10), value: pattern[i % pattern.length] };
  });
}

// Fixed demo dates for the date fields. Two rules, both learned the hard way.
//
// FIXED, never `new Date()`: this file is a server component with no "use client" and its
// mount is statically prerendered, so a bare `new Date()` bakes the BUILD day into the flight
// payload. Weeks later the demo contradicts its own helper text, which is what it did as
// "Future only" with minDate={new Date()} (A-119).
//
// NOON, not midnight: these are built from LOCAL components on the build host (UTC on Vercel)
// and cross to the client as an instant, where DatePicker re-reads them through
// startOfDay(), which is setHours(0,0,0,0) in the VIEWER's zone. Pinned at midnight, every
// viewer west of UTC resolves them one day early, so a "from Jan 1" bound silently admits
// Dec 31. Noon buys twelve hours of slack in each direction, which covers UTC-12 through
// UTC+11. Viewers at UTC+12 and beyond still shift a day; closing that needs the bound
// computed client-side, which a prerendered demo cannot do.
const DEMO_DEADLINE = new Date(2026, 5, 5, 12);
const DEMO_MIN_DATE = new Date(2026, 0, 1, 12);
const DEMO_RANGE_START = new Date(2026, 4, 7, 12);
const DEMO_RANGE_END = new Date(2026, 5, 5, 12);

// One demo block: the size-6 heading label, the demonstrated components' variant
// chips (from the manifest), the framed body, and an optional note. `components`
// is the coverage contract the sync-unit check reads.
function Sample({
  label,
  components,
  note,
  children,
}: {
  label: string;
  components: string[];
  note?: string;
  children: ReactNode;
}) {
  const variants = components.flatMap((name) => BY_NAME.get(name)?.variants ?? []);
  return (
    <div style={sampleStyle}>
      <div style={sampleHeadStyle}>
        {/* The shared kit label standard (owner, 8 Jul): item/group labels on both
            kit pages are real size-6 headings (the StyleGuidePage group-head
            treatment), not mono eyebrows; the mono voice is reserved for metadata
            (the variant chips, DataLabel). Component names read at full presence
            and both pages carry the same H1 > H2 > H3 outline. */}
        <Heading level={3} size={6}>{label}</Heading>
        {variants.length > 0 ? (
          <span style={chipRowStyle}>
            {variants.map((v) => (
              <span key={v} style={chipStyle}>{v}</span>
            ))}
          </span>
        ) : null}
      </div>
      <div style={sampleBodyStyle}>{children}</div>
      {note ? <p style={sampleNoteStyle}>{note}</p> : null}
    </div>
  );
}

export type ShowroomRegister = "bordered" | "surface";

export function ComponentsShowroom({
  children,
  backToTop = true,
  styleGuideHref = "/style-guide",
  register = "bordered",
  sectionsHref,
  rowHrefPrefix,
  linkedSlugs,
}: {
  children?: ReactNode;
  /** The page owns its BackToTop so a fork mount gets it for free. A host whose
      layout already mounts one (HQ) passes false; one corner, one button. */
  backToTop?: boolean;
  /** The sibling style guide's path. Fork default; HQ passes "/hq/style-guide". */
  styleGuideHref?: string;
  /** The look (v6.36.0, the CD reference-surface boards). "bordered" (the default, a fork's
      public /components): the live showroom, every component's full Sample in a bordered Panel
      per group, PageHead intro, the PageNav rail. "surface" (the HQ's /hq/components): the
      Components INDEX in the HQ register: PageHead variant="record" with the counts as Stats,
      the Toolbar (a Search on the sm rung, a group Select, the live count), the six groups as
      sans heads with a count chip on the page ground, and every component as a header-less row
      in list density: glyph, name, kind as a caps chip, options count, variants as code chips
      set as written, the entry's live row sample where it declares one, a chevron where the row
      opens the component's own page. One component, one prop. */
  register?: ShowroomRegister;
  /** SURFACE: the section library's path for the head's links line ("See also"). HQ passes
      "/hq/sections"; a fork has no library page and omits it. */
  sectionsHref?: string;
  /** SURFACE: the row links' prefix, joined with the slug ("/components/"), for the slugs in
      linkedSlugs. Both omitted: rows do not link (no page to open). */
  rowHrefPrefix?: string;
  linkedSlugs?: string[];
}) {
  const all = kit.components;
  if (register === "surface") {
    const linked = new Set(linkedSlugs ?? []);
    const rows: ShowroomIndexRow[] = all.map((c) => {
      const Glyph = atlasIconFor(c.slug);
      return {
        name: c.name,
        label: c.label,
        slug: c.slug,
        group: c.group,
        kind: c.kind,
        variants: c.variants,
        options: c.options,
        glyph: <Glyph />,
        sample: ROW_SAMPLES[c.name] ?? null,
        href: rowHrefPrefix && linked.has(c.slug) ? `${rowHrefPrefix}${c.slug}` : undefined,
      };
    });
    return (
      // background="none": the shell owns the page ground on a data surface (G1), the band paints none.
      <Section as="section" padding="normal" background="none">
        <Container size="lg">
          <PageHead
            variant="record"
            title="Components"
            meta={[
              { text: `${all.length} components in ${kit.groups.length} groups` },
              { text: `system.json, ${kit.baseline}` },
            ]}
            links={[
              { label: "See also", value: "Style guide", href: styleGuideHref },
              ...(sectionsHref ? [{ value: "Section library", href: sectionsHref }] : []),
            ]}
            note={<span style={surfaceLedeStyle}>Every component in the library, grouped by taxonomy. Variants are the named looks a project brief picks from; each row carries its variants, opens the component&apos;s own page, and shows its sample where it has one.</span>}
            stamp={`system.json ${kit.baseline}`}
          />
          <div data-mw-sri-stats="" style={surfaceStatsStyle}>
            <StatBand ariaLabel="Library counts" gap="xl">
              <Stat label="Components" value={all.length} />
              <Stat label="With variants" value={all.filter((c) => c.variants.length > 0).length} />
              <Stat label="Server" value={all.filter((c) => c.kind === "server").length} />
              <Stat label="Client" value={all.filter((c) => c.kind === "client").length} />
              <Stat label="Groups" value={kit.groups.length} />
            </StatBand>
          </div>
          <div style={surfaceIndexStyle}>
            <ShowroomIndex groups={kit.groups} rows={rows} />
          </div>
          {children != null ? <div style={childrenSlotStyle}>{children}</div> : null}
          {backToTop ? <BackToTop /> : null}
        </Container>
      </Section>
    );
  }
  return (
    <Section as="section" padding="normal">
      <Container size="lg">
        {/* The floating "on this page" rail: scroll-spied and collapsible, an
            overlay rather than a grid column, so the content keeps the full
            container width. */}
        <PageNav sections={SECTIONS} />
        <Heading level={1} size={2}>Components</Heading>
        <p style={leadStyle}>
          A live sample of every component in the design system, grouped by role and rendered in
          this site&apos;s own brand, at baseline {kit.baseline}. Chips name each component&apos;s
          sanctioned variants. See the brand colours, type, and spacing in the{" "}
          <Link href={styleGuideHref} style={linkStyle}>style guide</Link>.
        </p>

        <div style={statBandStyle}>
          <Stat accent countUp label="Components" value={all.length} />
          <Stat countUp label="With variants" value={all.filter((c) => c.variants.length > 0).length} />
          <Stat countUp label="Server" value={all.filter((c) => c.kind === "server").length} />
          <Stat countUp label="Client" value={all.filter((c) => c.kind === "client").length} />
          <Stat countUp label="Groups" value={kit.groups.length} />
        </div>

        {/* The showroom sections, one Panel per group (the ArtistHQ reference
            treatment, owner, 9 Jul): the panel header carries the H2 title + a
            mono scope line, the hairline is the panel's single rule, and the
            body flows the section note and its samples at the lg item rung.
            Panels separate at the xl section break (the HQ ladder's top
            in-band beat); chrome earns the tighter rung the bare heads set at
            3xl. */}
        <div style={panelStackStyle}>
          {/* Content and typography */}
          <Panel
            id="sr-content"
            title="Content and typography"
            subheading="Heading · eyebrow · prose · icon · kbd"
            subheadingVariant="mono"
          >
            <div style={sampleFlowStyle}>
              <p style={panelNoteStyle}>Headings, section labels, long-form prose, and inline icons that inherit colour from the theme.</p>
              <Sample label="Heading" components={["Heading"]} note="Level is semantic, size is visual; every size reads the display face, sizes 1-3 at regular weight, 4-6 at medium.">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                  <Heading as="div" size={1}>Quick brown fox</Heading>
                  <Heading as="div" size={3}>Section title</Heading>
                  <Heading as="div" size={5}>Small, medium weight</Heading>
                  <Heading as="div" size={2} kinetic>Hover to feel the weight</Heading>
                </div>
              </Sample>
              <Sample label="Eyebrow" components={["Eyebrow"]}>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", alignItems: "flex-start" }}>
                  <Eyebrow variant="quiet">Introducing</Eyebrow>
                  <Eyebrow variant="rule">Section three</Eyebrow>
                  <Eyebrow variant="pill">New</Eyebrow>
                </div>
              </Sample>
              <Sample label="Prose" components={["Prose"]}>
                <Prose size="md" style={{ maxWidth: "var(--measure-prose)" /* was 60ch: the reading measure (pass 4, 27 Aug 2026) */ }}>
                  <p>
                    A standard paragraph. Prose handles rhythm between elements automatically.{" "}
                    <strong>Strong text</strong> stays bold, <em>emphasis</em> goes italic,{" "}
                    <a href="#">links</a> pick up the accent colour, and <code>inline code</code>{" "}
                    reads in the code font with a tinted background.
                  </p>
                  <ul>
                    <li>List items get appropriate spacing.</li>
                    <li>Markers tint to the tertiary text colour.</li>
                  </ul>
                  <blockquote>Blockquotes pull from the display font for editorial weight.</blockquote>
                </Prose>
              </Sample>
              <Sample label="Icon" components={["Icon"]}>
                <div style={{ display: "flex", gap: "var(--space-md)", alignItems: "center", color: "var(--text-positive-primary)" }}>
                  <Icon size="lg"><ArrowRight /></Icon>
                  <Icon size="lg"><Settings /></Icon>
                  <Icon size="lg" label="Favourite"><Favorite /></Icon>
                </div>
              </Sample>
              <Sample label="Kbd" components={["Kbd"]} note="The inline keyboard hint: mono micro type on a 6% ink wash that self-mirrors per theme. Content is literal; key caps are case-sensitive.">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center", flexWrap: "wrap" }}>
                    <Kbd>⌘↵</Kbd>
                    <Kbd>⌘K</Kbd>
                    <Kbd>Esc</Kbd>
                    <Kbd>Shift</Kbd>
                    <Kbd>L</Kbd>
                  </div>
                  <p style={{ margin: 0, fontSize: "var(--type-sm)", color: "var(--text-positive-secondary)" }}>
                    Press <Kbd>⌘↵</Kbd> to log it, or <Kbd>Esc</Kbd> to close without saving.
                  </p>
                </div>
              </Sample>
              <Sample label="HeroBanner" components={["HeroBanner"]} note="The gradient band at a detail page's head: 2-5 stops arriving as data (the SwatchRow exception), a fluid clamp to 11.25rem (180px at a 16px root), badge nodes in the top corner, and the bottom overlay line on the inverse ink scrim so it reads over any palette.">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)", width: "100%", maxWidth: "40rem" }}>
                  <HeroBanner
                    stops={["var(--category-1)", "var(--category-2)", "#28335C"]}
                    badges={[<Badge key="status" tone="accent" emphasis="solid">Active series</Badge>, <IdChip key="id">SR-2026-04</IdChip>]}
                    overlayText={
                      <span>
                        <strong style={{ fontFamily: "var(--font-display)", fontWeight: tokenNumber("var(--weight-medium)"), fontSize: "var(--type-lg)", display: "block" }}>Harbor</strong>
                        12 pieces · 3 sold · palette from the series
                      </span>
                    }
                  />
                  <HeroBanner
                    stops={["var(--category-5)", "var(--category-4)"]}
                    height="var(--space-3xl)"
                    ariaLabel="Course category gradient"
                  />
                </div>
              </Sample>
              <Sample label="ContactStrip" components={["ContactStrip"]} note="The contact fields row under a name: mono voice, middle-dot separators, each field optional. Email and phone are real mailto: / tel: links (the tel href stripped to digits); location stays plain text.">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", alignItems: "flex-start" }}>
                  <ContactStrip email="m.anders@post.example" phone="+1 415 555 0182" location="Sausalito, CA" />
                  <ContactStrip email="gallery@harborlight.example" location="Portland, ME" />
                  <ContactStrip phone="+31 20 555 0143" />
                </div>
              </Sample>
            </div>
          </Panel>

          {/* Forms and inputs */}
          <Panel
            id="sr-forms"
            title="Forms and inputs"
            subheading="Buttons · fields · pickers · groups"
            subheadingVariant="mono"
          >
            <div style={sampleFlowStyle}>
              <p style={panelNoteStyle}>Buttons and self-managing field controls that drop in as client islands and need no external state.</p>
              <Sample label="Button" components={["Button"]}>
                <div style={{ display: "flex", gap: "var(--space-md)", alignItems: "center", flexWrap: "wrap" }}>
                  <Button variant="primary" size="md" icon={<ArrowRight />} iconPosition="right">Start a project</Button>
                  <Button variant="secondary">View case studies</Button>
                  <Button variant="ghost" size="sm">Learn more</Button>
                  <Button variant="ghost" icon={<ArrowRight />} iconPosition="right" iconTone="accent">View the work</Button>
                  <Button variant="ink">Log it</Button>
                  <Button variant="ink" disabled>Log it</Button>
                  <Button variant="primary" disabled>Disabled</Button>
                </div>
              </Sample>
              <Sample label="Input" components={["Input"]}>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", maxWidth: "24rem", width: "100%" }}>
                  <Input id="sr-email" label="Email" type="email" required placeholder="you@studio.com" helper="Only used for project updates." />
                  <Input id="sr-password" label="Password" type="password" error="Password must be at least 12 characters." />
                  <Input id="sr-seats" label="Team seats" type="number" defaultValue="3" min={1} max={50} />
                </div>
              </Sample>
              <Sample label="Textarea" components={["Textarea"]}>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", maxWidth: "28rem", width: "100%" }}>
                  <Textarea id="sr-brief" label="Project brief" rows={4} helper="A few sentences on scope, timeline, and budget." defaultValue="A marketing site refresh for our spring launch, six pages, four weeks." />
                  <Textarea id="sr-notes" label="Notes" rows={2} error="Notes are required before submitting." required />
                </div>
              </Sample>
              <Sample label="Field fill" components={["Input", "Select"]} note="v4.7.0: a field fills its container's inline size in a flex-start column (e.g. a Card.Body) instead of shrink-wrapping to its widest control: the field root is align-self: stretch. In a flex ROW it stretches the cross axis (height) only, so side-by-side fields are unaffected. The column below is align-items: flex-start, yet both fields fill to one measure.">
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--space-md)", maxWidth: "24rem" }}>
                  <Input id="sr-fill-name" label="Full name" placeholder="Jordan Ellis" />
                  <Select id="sr-fill-plan" label="Plan" placeholder="Choose a plan" options={[{ value: "m", label: "Monthly" }, { value: "y", label: "Yearly" }]} />
                </div>
              </Sample>
              <Sample label="PromptedTextarea" components={["PromptedTextarea"]} note="The word-count textarea: composes Textarea's field, counts words live, and reads the count against wordCountBands (muted / success / warning through the status text tokens). italic renders the entry in the display face; link is the cross-reference slot.">
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-lg)", width: "100%" }}>
                  {([
                    ["sr-pta-empty", "Empty", undefined],
                    ["sr-pta-typing", "Below range", "Second glaze went on well."],
                    ["sr-pta-range", "In range", "Second glaze pulled the shadow to indigo. Warm anchors still missing."],
                    [
                      "sr-pta-over",
                      "Over range",
                      "Second glaze pulled the harbor shadow to a proper indigo, though the transition into the sky still needs work. Warm anchors are still missing and the foreground reads flat; tomorrow starts with the rocks, then the reflected light, then one more pass over the horizon line before the varnish decision.",
                    ],
                  ] as const).map(([id, label, defaultValue]) => (
                    <div key={id} style={{ maxWidth: "22rem", width: "100%" }}>
                      <PromptedTextarea
                        id={id}
                        label={label}
                        italic
                        rows={3}
                        placeholder="One line: what actually happened at the easel."
                        defaultValue={defaultValue}
                        link={id === "sr-pta-empty" ? { label: "Yesterday's line", href: "#sr-forms" } : undefined}
                        wordCountBands={[
                          { min: 1, label: "getting there", tone: "muted" },
                          { min: 8, label: "honest enough", tone: "success" },
                          { min: 41, label: "long enough", tone: "warning" },
                        ]}
                      />
                    </div>
                  ))}
                </div>
              </Sample>
              <Sample label="ScorecardDots" components={["ScorecardDots"]} note="Tap-to-score: tapping dot N fills to N, tapping the last filled dot un-fills it by one. Arrow keys move and select (a native radio group, the Rating grammar). gap speaks the danger voice.">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", alignItems: "flex-start" }}>
                  <ScorecardDots id="sr-scd-0" label="Untouched" defaultValue={0} />
                  <ScorecardDots id="sr-scd-1" label="Practiced" defaultValue={1} />
                  <ScorecardDots id="sr-scd-2" label="Reliable" defaultValue={2} />
                  <ScorecardDots id="sr-scd-3" label="Dependable" defaultValue={3} />
                  <ScorecardDots id="sr-scd-gap" label="Edge control" defaultValue={1} gap />
                  <ScorecardDots id="sr-scd-off" label="Archived skill" defaultValue={2} disabled />
                </div>
              </Sample>
              <Row cols={{ desktop: 2, tablet: 2, mobile: 1 }} gap="lg">
                <Column>
                  <Sample label="Checkbox" components={["Checkbox"]}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                      <Checkbox id="sr-cb-a" label="Default" />
                      <Checkbox id="sr-cb-b" label="Checked" defaultChecked />
                      <Checkbox id="sr-cb-c" label="Indeterminate" indeterminate />
                      <Checkbox id="sr-cb-d" label="Unavailable option" disabled />
                    </div>
                  </Sample>
                </Column>
                <Column>
                  <Sample label="Switch" components={["Switch"]}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                      <Switch id="sr-sw-a" label="Enable notifications" defaultChecked />
                      <Switch id="sr-sw-b" label="Compact mode" size="sm" />
                      <Switch id="sr-sw-c" label="Auto-save" helper="Saves a draft every few seconds." defaultChecked />
                    </div>
                  </Sample>
                </Column>
              </Row>
              <Sample label="Radio" components={["Radio"]}>
                <RadioGroup name="sr-billing" label="Billing cycle" defaultValue="annual">
                  <Radio value="monthly" label="Monthly" description="Billed every month, cancel anytime." />
                  <Radio value="annual" label="Annual" description="Two months free versus monthly." />
                  <Radio value="lifetime" label="Lifetime" description="One payment, no renewals." />
                </RadioGroup>
              </Sample>
              <Sample label="ChoiceCard" components={["ChoiceCard"]} note="The selectable card: the whole surface toggles the real Radio or Checkbox inside. The IMAGE variant (bottom row) turns the card into a media tile: pass a { src } photo or a ReactNode line-art to `image`; the tile is decorative, so there is no alt. Unselected tiles blur and recede, the selected tile shows the full image with its label on a bottom scrim.">
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xl)", alignItems: "flex-start" }}>
                  <div style={{ maxWidth: "22rem", width: "100%" }}>
                    <RadioGroup name="sr-plan" label="Plan" defaultValue="studio">
                      <ChoiceCard mode="single" value="studio" label="Studio" description="For small teams shipping one site at a time." />
                      <ChoiceCard mode="single" value="agency" label="Agency" description="For rosters of client projects." />
                    </RadioGroup>
                  </div>
                  <div style={{ maxWidth: "22rem", width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                    <ChoiceCard mode="multi" name="sr-addons" value="analytics" label="Analytics" description="Traffic and conversion reporting." defaultChecked />
                    <ChoiceCard mode="multi" name="sr-addons" value="support" label="Priority support" />
                  </div>
                </div>
                {/* Image variant: a single-select group of media tiles. */}
                <div style={{ marginTop: "var(--space-lg)", maxWidth: "34rem", width: "100%" }}>
                  <RadioGroup name="sr-material" label="Surface" defaultValue="clay">
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--space-sm)" }}>
                      <ChoiceCard mode="single" value="concrete" label="Concrete" image={{ src: "https://putl0nxdpoepzh5o.public.blob.vercel-storage.com/assets/showroom-architecture-c6ced177.webp" }} />
                      <ChoiceCard mode="single" value="clay" label="Clay" image={{ src: "https://putl0nxdpoepzh5o.public.blob.vercel-storage.com/assets/showroom-interior-732f8097.webp" }} />
                    </div>
                  </RadioGroup>
                </div>
              </Sample>
              <Row cols={{ desktop: 2, tablet: 2, mobile: 1 }} gap="lg">
                <Column>
                  <Sample label="Select" components={["Select"]}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", maxWidth: "22rem" }}>
                      <Select
                        id="sr-type"
                        label="Project type"
                        placeholder="Choose a type"
                        defaultValue="web"
                        options={[
                          { value: "brand", label: "Brand identity" },
                          { value: "web", label: "Website" },
                          { value: "product", label: "Product design" },
                        ]}
                        helper="Sets the intake checklist."
                      />
                    </div>
                  </Sample>
                </Column>
                <Column>
                  <Sample label="SegmentedControl" components={["SegmentedControl"]} note="Three sizes on one ladder, each a type rung and a space rung below the last: xs for a panel header, sm for a toolbar, md the default. Two registers: the default view switch, and the comfortable variant for inviting choices like a billing cycle: larger type, roomier padding, the pill posture, and a raised active segment.">
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--space-md)" }}>
                      <SegmentedControl
                        name="sr-view-xs"
                        ariaLabel="View, extra small"
                        size="xs"
                        defaultValue="board"
                        options={[
                          { value: "list", label: "List" },
                          { value: "board", label: "Board" },
                          { value: "timeline", label: "Timeline" },
                        ]}
                      />
                      <SegmentedControl
                        name="sr-view-sm"
                        ariaLabel="View, small"
                        size="sm"
                        defaultValue="board"
                        options={[
                          { value: "list", label: "List" },
                          { value: "board", label: "Board" },
                          { value: "timeline", label: "Timeline" },
                        ]}
                      />
                      <SegmentedControl
                        name="sr-view"
                        ariaLabel="View"
                        defaultValue="board"
                        options={[
                          { value: "list", label: "List" },
                          { value: "board", label: "Board" },
                          { value: "timeline", label: "Timeline" },
                        ]}
                      />
                      <SegmentedControl
                        name="sr-billing"
                        ariaLabel="Billing cycle"
                        variant="comfortable"
                        defaultValue="yearly"
                        options={[
                          { value: "monthly", label: "Monthly" },
                          { value: "yearly", label: "Yearly" },
                        ]}
                      />
                    </div>
                  </Sample>
                </Column>
              </Row>
              <Sample label="Pagination" components={["Pagination"]} note="Fully controlled paging: the consumer owns the page state and the slice, the control reports intent. Eight pages here, so the ellipsis collapse is live.">
                <ShowroomPaginationDemo />
              </Sample>
              <Sample label="Combobox" components={["Combobox"]} note="Type to filter; arrow keys and Enter select.">
                <div style={{ maxWidth: "22rem", width: "100%" }}>
                  <Combobox
                    id="sr-city"
                    name="sr-city"
                    label="Studio city"
                    placeholder="Search cities"
                    options={[
                      { value: "ams", label: "Amsterdam" },
                      { value: "ber", label: "Berlin" },
                      { value: "cph", label: "Copenhagen" },
                      { value: "lis", label: "Lisbon" },
                      { value: "lon", label: "London" },
                      { value: "osl", label: "Oslo" },
                    ]}
                    helper="Where the kickoff happens."
                  />
                </div>
              </Sample>
              <Sample label="Search" components={["Search"]} note="The inline search field: a leading Carbon Search glyph, a clear button once the field is non-empty, and a non-empty Escape that clears in place while an empty-field Escape still reaches a parent overlay.">
                <ShowroomSearchDemo />
              </Sample>
              <Row cols={{ desktop: 2, tablet: 2, mobile: 1 }} gap="lg">
                <Column>
                  <Sample label="MultiSelect" components={["MultiSelect"]}>
                    <div style={{ maxWidth: "22rem" }}>
                      <MultiSelect
                        id="sr-channels"
                        name="sr-channels"
                        label="Launch channels"
                        placeholder="Pick channels"
                        defaultValue={["email", "social"]}
                        options={[
                          { value: "email", label: "Email" },
                          { value: "social", label: "Social" },
                          { value: "press", label: "Press" },
                          { value: "events", label: "Events" },
                        ]}
                      />
                    </div>
                  </Sample>
                </Column>
                <Column>
                  <Sample label="Listbox" components={["Listbox"]}>
                    <div style={{ maxWidth: "22rem" }}>
                      <Listbox
                        id="sr-owner"
                        name="sr-owner"
                        label="Project owner"
                        defaultValue="mira"
                        rows={4}
                        options={[
                          { value: "ada", label: "Ada Osei" },
                          { value: "mira", label: "Mira Chen" },
                          { value: "tomas", label: "Tomas Ruiz" },
                          { value: "yara", label: "Yara Haddad" },
                        ]}
                      />
                    </div>
                  </Sample>
                </Column>
              </Row>
              <Sample label="Slider" components={["Slider"]}>
                <div style={{ maxWidth: "24rem", width: "100%" }}>
                  <Slider id="sr-budget" label="Budget" min={5} max={100} step={5} defaultValue={40} showRange helper="Thousands, project total." />
                </div>
              </Sample>
              <Row cols={{ desktop: 2, tablet: 2, mobile: 1 }} gap="lg">
                <Column>
                  <Sample label="Otp" components={["Otp"]}>
                    <Otp id="sr-otp" name="sr-otp" label="Verification code" length={6} helper="Sent to your email." />
                  </Sample>
                </Column>
                <Column>
                  <Sample label="Rating" components={["Rating"]}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                      <Rating id="sr-rating" name="sr-rating" label="Rate the kickoff" defaultValue={4} helper="Half steps round up." />
                      <Rating id="sr-rating-ro" name="sr-rating-ro" label="Average so far" defaultValue={5} disabled />
                    </div>
                  </Sample>
                </Column>
              </Row>
              <Row cols={{ desktop: 2, tablet: 2, mobile: 1 }} gap="lg">
                <Column>
                  <Sample label="ColorPicker" components={["ColorPicker"]} note="Opens the OS colour picker; submits a hex in a plain form.">
                    <div style={{ maxWidth: "22rem" }}>
                      <ColorPicker id="sr-brand" label="Brand accent" defaultValue="#A759A1" helper="The value a form receives." />
                    </div>
                  </Sample>
                </Column>
                <Column>
                  <Sample label="TimePicker" components={["TimePicker"]}>
                    <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap" }}>
                      <TimePicker id="sr-open" label="Opens" defaultValue="09:00" />
                      <TimePicker id="sr-close" label="Closes" defaultValue="17:30" />
                    </div>
                  </Sample>
                </Column>
              </Row>
              <Row cols={{ desktop: 2, tablet: 2, mobile: 1 }} gap="lg">
                <Column>
                  <Sample label="DatePicker" components={["DatePicker"]}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)", maxWidth: "24rem" }}>
                      <DatePicker id="sr-deadline" label="Project deadline" defaultValue={DEMO_DEADLINE} helper="Opens on the selected date." />
                      <DatePicker id="sr-future" label="From Jan 2026" minDate={DEMO_MIN_DATE} helper="Earlier dates render disabled." />
                    </div>
                  </Sample>
                </Column>
                <Column>
                  <Sample label="DateRangePicker" components={["DateRangePicker"]} note="Preset rail plus a two-month calendar.">
                    <DateRangePicker id="sr-period" label="Reporting period" defaultValue={{ start: DEMO_RANGE_START, end: DEMO_RANGE_END }} helper="A preset date range." />
                  </Sample>
                </Column>
              </Row>
              <Sample label="FormGroup" components={["FormGroup"]} note="A native fieldset: the legend names the group, disabled cascades to every field.">
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xl)", alignItems: "flex-start" }}>
                  <div style={{ maxWidth: "24rem", width: "100%" }}>
                    <FormGroup id="sr-contact" legend="Contact" description="How we reach you about the project." required>
                      <Input id="sr-fg-name" label="Full name" placeholder="Ada Osei" />
                      <Input id="sr-fg-email" label="Email" type="email" placeholder="ada@studio.com" />
                    </FormGroup>
                  </div>
                  <div style={{ maxWidth: "24rem", width: "100%" }}>
                    <FormGroup legend="Address" variant="card" description="Where invoices are sent.">
                      <Input id="sr-fg-street" label="Street" />
                      <Input id="sr-fg-city" label="City" />
                    </FormGroup>
                  </div>
                </div>
              </Sample>
              <Sample label="FilterPanel" components={["FilterPanel"]} note="Titled ChoiceCard groups with live selection; a single-select group and multi-select groups mix in one panel.">
                <div style={{ maxWidth: "24rem", width: "100%" }}>
                  <FilterPanel
                    ariaLabel="Shop filters"
                    groups={[
                      {
                        id: "sr-series",
                        title: "Series",
                        mode: "single",
                        defaultValue: "coastal",
                        options: [
                          { value: "coastal", label: "Coastal", description: "Seascapes and shoreline studies." },
                          { value: "urban", label: "Urban", description: "City light and architecture." },
                        ],
                      },
                      {
                        id: "sr-medium",
                        title: "Medium",
                        mode: "multi",
                        defaultValue: ["oil"],
                        options: [
                          { value: "oil", label: "Oil" },
                          { value: "watercolor", label: "Watercolor" },
                        ],
                      },
                    ]}
                  />
                </div>
              </Sample>
            </div>
          </Panel>

          {/* Data display */}
          <Panel
            id="sr-data-display"
            title="Data display"
            subheading="Cards · stats · tables · badges · token rows"
            subheadingVariant="mono"
          >
            <div style={sampleFlowStyle}>
              <p style={panelNoteStyle}>Cards, captioned stats, status chips, legends, and the token rows a style guide is made of.</p>
              <Sample label="Card" components={["Card"]}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-lg)", alignItems: "flex-start" }}>
                  <div style={{ maxWidth: "20rem", width: "100%" }}>
                    <Card elevation="raised">
                      <Card.Image src="https://putl0nxdpoepzh5o.public.blob.vercel-storage.com/assets/showroom-interior-732f8097.webp" alt="Forest path with morning light" />
                      <Card.Body>
                        <Heading as="div" size={5}>Raised card</Heading>
                        <p style={cardTextStyle}>A media card with an image, body, and a footer split across the ends.</p>
                      </Card.Body>
                      <Card.Footer align="between">
                        <span style={{ color: "var(--text-positive-secondary)", fontSize: "var(--type-sm)" }}>3 min read</span>
                        <Button variant="ghost" size="sm">Read</Button>
                      </Card.Footer>
                    </Card>
                  </div>
                  <div style={{ maxWidth: "20rem", width: "100%" }}>
                    <Card variant="feature" elevation="subtle">
                      <Card.Icon label="Settings"><Settings /></Card.Icon>
                      <Card.Body>
                        <Heading as="div" size={5}>Feature card</Heading>
                        <p style={cardTextStyle}>An icon sits on an accent-soft tile above the body.</p>
                      </Card.Body>
                    </Card>
                  </div>
                  <div style={{ maxWidth: "20rem", width: "100%" }}>
                    <Card variant="link" href="#article" ariaLabel="Whole card link" elevation="subtle" linkLabel="Read article">
                      <Card.Body>
                        <Heading as="div" size={5}>Whole-card link</Heading>
                        <p style={cardTextStyle}>The entire surface navigates. The cue below renders by default; it is a span, not a second anchor.</p>
                      </Card.Body>
                    </Card>
                  </div>
                  <div style={{ maxWidth: "20rem", width: "100%" }}>
                    <Card variant="link" tone="accent" href="#case-study" ariaLabel="Accent-toned case study card" linkLabel="View case study">
                      <Card.Body>
                        <Heading as="div" size={5}>Accent tone</Heading>
                        <p style={cardTextStyle}>The brand-bordered treatment: accent hairline at rest, and the link hover adds a neutral fill lift.</p>
                      </Card.Body>
                    </Card>
                  </div>
                  {/* The accent LEFT RULE (v3.9.0): one card per ink, so all
                      five values render. */}
                  {([
                    ["accent", "Companion note", "The brand rule marks the callout voice."],
                    ["success", "Paid in full", "The success rule marks a settled state."],
                    ["warning", "Commission at 15 days", "The warning rule flags an aging item."],
                    ["danger", "Rework flagged", "The danger rule marks a blocking state."],
                    ["info", "Order shipped", "The info rule marks a neutral update."],
                  ] as const).map(([accent, title, body]) => (
                    <div key={accent} style={{ maxWidth: "16rem", width: "100%" }}>
                      <Card accent={accent} padding="compact">
                        <Card.Body>
                          <Heading as="div" size={6}>{title}</Heading>
                          <p style={cardTextStyle}>{body} (accent=&quot;{accent}&quot;)</p>
                        </Card.Body>
                      </Card>
                    </div>
                  ))}
                </div>
              </Sample>
              <Sample label="CalloutCard" components={["CalloutCard"]} note="The opinionated callout over Card's accent rule: Card draws the 2px left rule (nothing re-implemented); CalloutCard adds the fixed arrangement and voice - the tone-inked icon, the title / body ladder, actions under the body, and the thumb pinned to the row's end.">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)", width: "100%", maxWidth: "40rem" }}>
                  <CalloutCard
                    tone="accent"
                    icon={<Favorite size={20} />}
                    title="Commission inquiry from R. Kessler"
                    body="Interested in a 16x20 in the Blue Hour palette. Last purchase: First Frost, March."
                    actions={
                      <>
                        <Button variant="primary" size="sm">Draft an offer</Button>
                        <Button variant="ghost" size="sm">Later</Button>
                      </>
                    }
                    thumb={<div style={{ width: "5rem", height: "5rem", background: "linear-gradient(155deg, var(--category-2), var(--category-1))" }} />}
                  />
                  <CalloutCard
                    tone="warning"
                    icon={<Warning size={20} />}
                    title="Low Tide, no. 3 has sat untouched for 12 days"
                    body="Last honest line: warm anchors still missing. A 20-minute rescue sitting counts."
                    actions={<Button variant="secondary" size="sm">Plan a rescue</Button>}
                  />
                  <CalloutCard
                    tone="success"
                    title="Invoice 2026-014 paid in full"
                    body="R. Kessler settled the Blue Hour deposit. No action needed."
                  />
                </div>
              </Sample>
              <Sample label="AiCard" components={["AiCard"]} note="The shell for every non-chat AI moment, over Card's accent rule (the CalloutCard lineage): the twinkle eyebrow marks generated content as generated, the variant picks the voice (nudge speaks in plain body copy; reflection and critique speak in the display italic), and loading renders the thinking line while the actions row stays mounted, so a pressed action keeps focus (disable your own while loading). Presentational only - the consumer fetches, this renders.">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)", width: "100%", maxWidth: "40rem" }}>
                  <AiCard
                    variant="nudge"
                    eyebrow="Today's studio plan"
                    body="Low Tide's second glaze is dry enough for the third. Twenty minutes of edge control on scrap first; it has been twelve days."
                    actions={
                      <>
                        <Button variant="primary" size="sm">Start the warmup</Button>
                        <Button variant="ghost" size="sm" icon={<Renew size={16} />}>Regenerate</Button>
                      </>
                    }
                  />
                  <AiCard
                    variant="reflection"
                    eyebrow="Pattern in the last five entries"
                    body={<>You have flagged &ldquo;warm anchors still missing&rdquo; twice this week. Notice which answer tomorrow&rsquo;s glaze gives.</>}
                    actions={
                      <>
                        <Button variant="secondary" size="sm">Save with entry</Button>
                        <Button variant="ghost" size="sm">Dismiss</Button>
                      </>
                    }
                  />
                  <AiCard
                    variant="critique"
                    eyebrow="On Low Tide, no. 3"
                    body={<>The locked palette is holding, but the horizon value merges with the water two steps back. One session on the far band settles it.</>}
                    actions={<Button variant="ghost" size="sm">Open the conversation</Button>}
                  />
                  <AiCard eyebrow="From the Companion" loading />
                </div>
              </Sample>
              <Sample label="ChatMessage" components={["ChatMessage"]} note="One turn in a chat thread. user sits right on the negative surface (the inverse family, so both themes mirror for free); assistant sits left behind the 2px accent rule with the optional speaker attribution (a prop: the name is product vocabulary). markdown renders paragraphs and line breaks from plain text, nothing more; pending is the thinking bubble.">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)", width: "100%", maxWidth: "34rem" }}>
                  <ChatMessage
                    role="assistant"
                    speaker="Companion"
                    markdown
                    content={"The second glaze pulled the harbor shadow to a proper indigo. One small step for tonight: a five-minute value check on the far band.\nNothing else needs touching."}
                  />
                  <ChatMessage role="user" content="Is the palette still holding at four pigments?" />
                  <ChatMessage role="assistant" speaker="Companion" pending />
                </div>
              </Sample>
              <Sample label="ChatComposer" components={["ChatComposer"]} note="The chat input over TextareaField + Button: Enter sends, Shift+Enter breaks a line, send disables while empty, and an uncontrolled composer clears itself after a send. The helper line is the standing mono hint; rateLimited replaces it with a role=alert line and stands send down. Live here: sends land in the thread above.">
                <ShowroomChatComposerDemo />
              </Sample>
              <Sample label="ChatContextCard" components={["ChatContextCard"]} note="The transparency panel beside a chat surface: a labelled definition list of exactly the state the consumer feeds the model's system prompt, rendered from the same object so panel and prompt cannot drift. The trust mechanism, not decoration.">
                <div style={{ maxWidth: "22rem", width: "100%" }}>
                  <ChatContextCard
                    label="What the model sees"
                    items={[
                      { eyebrow: "On the easel", content: "Low Tide, no. 3 · glazing · 9.5 hrs logged" },
                      { eyebrow: "Current focus", content: "Stage 3 of 8 · limited palettes" },
                      { eyebrow: "Recent entries", content: "5 lines from the practice log, most recent Jul 14" },
                      { eyebrow: "Guardrail", content: "No invented facts; one next step, not five" },
                    ]}
                  />
                </div>
              </Sample>
              <Sample label="EmptyState" components={["EmptyState"]} note="The canonical empty state. No surface of its own - the caller's Card wraps it (every panel specimen here sits in a Card body; the page register sits bare as the page main). Three tones and the glyph carries the temperature - the words stay calm in secondary. Title renders as a p in heading dress, out of the outline. Neutral escalates grey to the accent tile between panel and page: the escalation is the invitation.">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)", width: "100%" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)", width: "100%", maxWidth: "36rem" }}>
                    <Card>
                      <Card.Body>
                        <EmptyState
                          icon={<Folders />}
                          title="No documents yet"
                          description="Files you attach to a project land here, so the paperwork stays with the work."
                          actions={<Button variant="secondary" size="sm">Add a document</Button>}
                        />
                      </Card.Body>
                    </Card>
                    <Card>
                      <Card.Body>
                        <EmptyState
                          tone="success"
                          icon={<CheckmarkOutline />}
                          title="All caught up"
                          description="New requests land here as clients send them."
                        />
                      </Card.Body>
                    </Card>
                    <Card>
                      <Card.Body>
                        <EmptyState
                          tone="warning"
                          icon={<Warning />}
                          title="Couldn't load invoices"
                          description="The connection timed out. Nothing was lost."
                          actions={<Button variant="secondary" size="sm">Try again</Button>}
                        />
                      </Card.Body>
                    </Card>
                    <div style={{ maxWidth: "18rem" }}>
                      <Card>
                        <Card.Body>
                          <EmptyState
                            align="start"
                            icon={<Document />}
                            title="No notes yet"
                            description="Notes you leave on a project stay with it."
                          />
                        </Card.Body>
                      </Card>
                    </div>
                  </div>
                  <EmptyState
                    size="page"
                    icon={<Home />}
                    title="No rooms yet"
                    description="Start with one room and list what is in it. Each room you add builds the total value of your home's contents."
                    actions={
                      <>
                        <Button variant="primary">Add a room</Button>
                        <Button variant="secondary">Import rooms</Button>
                      </>
                    }
                  />
                </div>
              </Sample>
              <Sample label="Panel" components={["Panel"]} note="The dashboard content block: header (title, optional subheading in a quiet or mono voice, meta badges, controls slot) split from the body by a full-width hairline. For dashboard and admin surfaces; list cards and tiles stay plain Cards. This page's own sections are panels with the mono subtext.">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)", width: "100%", maxWidth: "36rem" }}>
                  <Panel title="Plain panel" headingLevel={3}>
                    <p style={cardTextStyle}>Title, hairline, body. The smallest useful shape.</p>
                  </Panel>
                  <Panel
                    headingLevel={3}
                    title="Mono subtext"
                    subheading="Default · hover · active · disabled"
                    subheadingVariant="mono"
                  >
                    <p style={cardTextStyle}>The header-with-subtext treatment: the scope line reads in the DataLabel metadata voice.</p>
                  </Panel>
                  <Panel
                    headingLevel={3}
                    title="With every header variant"
                    subheading="A quiet line for what the panel measures or where its data comes from."
                    meta={<Badge tone="neutral">12 rows</Badge>}
                    controls={
                      <SegmentedControl
                        name="panel-demo-view"
                        ariaLabel="Demo view switch"
                        // xs is the panel-header rung (4 Aug 2026): the header aligns
                        // flex-start, so a control taller than the title's line box reads
                        // as a second row. sm stands ~39px against a ~21px title; xs ~28px.
                        size="xs"
                        options={[
                          { value: "all", label: "All" },
                          { value: "open", label: "Open" },
                          { value: "won", label: "Won" },
                        ]}
                      />
                    }
                  >
                    <p style={cardTextStyle}>Meta badges and an interactive control share the header end; the body flows under the rule.</p>
                  </Panel>
                </div>
              </Sample>
              <Sample label="Glance and DataLabel" components={["Glance", "DataLabel"]}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xl)", alignItems: "flex-end" }}>
                  <div style={statColStyle}><DataLabel>Active projects</DataLabel><Glance size="lg">42</Glance></div>
                  <div style={statColStyle}><DataLabel>Invoiced to date</DataLabel><Glance size="md" prefix="$">102,750</Glance></div>
                  <div style={statColStyle}><DataLabel>Utilisation</DataLabel><Glance size="sm" suffix="%">95</Glance></div>
                </div>
              </Sample>
              <Sample label="Stat" components={["Stat"]} note="The KPI unit: figure over caption, counting up on mount and riding the motion dial. A band is a flex row of Stats. `treatment` picks the look: bare, outlined (the bordered, generously-padded studio-door cell), or filled.">
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xl)" }}>
                  <Stat accent countUp label="Projects delivered" value={42} />
                  <Stat countUp prefix="$" label="Invoiced to date" value={102750} />
                  <Stat countUp suffix="%" label="Utilisation" value={95} />
                  <Stat accent label="Hours this quarter" value={168} delta={{ value: "+38 vs Q1", direction: "up" }} />
                  <Stat accent prefix="$" label="Rate per hour" value={19} delta={{ value: "-$3 vs Q1", direction: "down" }} />
                  <Stat zero label="On easel" value={0} />
                  <Stat label="Backlog" value={null} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)", marginTop: "var(--space-md)" }}>
                  <Stat treatment="outlined" accent countUp label="Projects delivered" value={42} />
                  <Stat treatment="outlined" countUp prefix="$" label="Invoiced to date" value={102750} />
                  <Stat treatment="outlined" accent label="Hours this quarter" value={168} delta={{ value: "+38 vs Q1", direction: "up" }} />
                </div>
              </Sample>
              <Sample label="CountUp" components={["CountUp"]} note="Climbs on mount, riding the motion dial. Compose it inside Glance for units.">
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xl)", alignItems: "flex-end" }}>
                  <div style={statColStyle}><DataLabel>Invoiced to date</DataLabel><Glance size="md" prefix="$"><CountUp value={102750} /></Glance></div>
                  <div style={statColStyle}><DataLabel>Utilisation</DataLabel><Glance size="md" suffix="%"><CountUp value={95} /></Glance></div>
                </div>
              </Sample>
              <Sample label="LegendDot" components={["LegendDot"]} note="The documented dot + label idiom: chart legends, calendar kinds, status lines. shape=&quot;square&quot; is the swatch key for series and channels.">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)" }}>
                    <LegendDot color="var(--accent-base)">Milestone</LegendDot>
                    <LegendDot color="var(--cyan-base)">Phase deadline</LegendDot>
                    <LegendDot color="var(--yellow-base)">Task due</LegendDot>
                    <LegendDot color="var(--green-base)">Invoice</LegendDot>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)" }}>
                    <LegendDot shape="square" color="var(--category-1)">Site</LegendDot>
                    <LegendDot shape="square" color="var(--category-3)">Fair</LegendDot>
                    <LegendDot shape="square" color="var(--category-5)">Gallery</LegendDot>
                    <LegendDot shape="square" color="var(--accent-base)">Direct</LegendDot>
                  </div>
                </div>
              </Sample>
              <Sample label="Table" components={["Table"]} note="The kit data table: a real table element, header band on the tint with the mono label voice, hairline row rules (the data-table law's sanctioned exception), no zebra. Numeric columns align right with tabular figures; the whole table scrolls in its own overflow wrapper. The second table groups consecutive rows under eyebrow bands with kind dots and washes the current row in the accent wash.">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)", width: "100%" }}>
                  <Table
                    caption="Recent sales"
                    columns={[
                      { key: "piece", header: "Piece" },
                      { key: "buyer", header: "Buyer" },
                      { key: "channel", header: "Channel" },
                      { key: "price", header: "Price", align: "right", render: (r) => <PriceLabel amount={r.price} /> },
                    ]}
                    rows={[
                      { piece: "Harbor Study no. 2", buyer: "M. Anders", channel: "Direct", price: 680 },
                      { piece: "First Frost", buyer: "K. Ito", channel: "Gallery", price: 180 },
                      { piece: "Low Tide, no. 3", buyer: "R. Kessler", channel: "Fair", price: 640 },
                    ]}
                  />
                  <Table
                    caption="Supplies by category"
                    columns={[
                      { key: "item", header: "Item" },
                      { key: "state", header: "State" },
                      { key: "qty", header: "Qty", align: "right" },
                    ]}
                    rows={[
                      { cat: "Paint", item: "Titanium white 200ml", state: "In use", qty: 2, current: false },
                      { cat: "Paint", item: "Ultramarine 40ml", state: "Needed", qty: 0, current: false },
                      { cat: "Canvas", item: "Linen roll 2.1m", state: "Ordered", qty: 1, current: false },
                      { cat: "Canvas", item: "Panel 10 x 10", state: "Delivered", qty: 6, current: true },
                    ]}
                    groupBy={(r) => r.cat}
                    groupDot={(k) => (k === "Paint" ? "var(--category-3)" : "var(--category-5)")}
                    rowHighlight={(r) => r.current}
                  />
                </div>
              </Sample>
              <Sample label="Timeline" components={["Timeline"]} note="The vertical event list: 6px kind-colored dots on a hairline thread, timestamps in the mono metadata voice. The consumer maps its kinds onto the status accents and category tokens; an unmapped kind falls back to the neutral dot.">
                <div style={{ maxWidth: "32rem", width: "100%" }}>
                  <Timeline
                    ariaLabel="Studio activity"
                    kindColor={{
                      sale: "var(--status-success-accent)",
                      deadline: "var(--status-warning-accent)",
                      blocked: "var(--status-danger-accent)",
                      update: "var(--status-info-accent)",
                      series: "var(--category-2)",
                    }}
                    items={[
                      { kind: "sale", title: "Harbor Study no. 2 sold", subtitle: "M. Anders · direct", timestamp: "Jul 8" },
                      { kind: "deadline", title: "Commission at 15 days", subtitle: "R. Kessler · Blue Hour study", timestamp: "Jul 7" },
                      { kind: "blocked", title: "Rework flagged on Low Tide, no. 3", subtitle: "Warm anchors still missing", timestamp: "Jul 6" },
                      { kind: "series", title: "Salt Meadow opened", subtitle: "Series created with 3 ideas", timestamp: "Jul 5" },
                      { kind: "update", title: "Invoice 2026-014 sent", timestamp: "Jul 4" },
                      { kind: "misc", title: "An unmapped kind falls back to the neutral dot", timestamp: "Jul 1" },
                    ]}
                  />
                </div>
              </Sample>
              <Sample label="StreakStrip" components={["StreakStrip"]} note="The contribution heatmap on the --heat-0..4 ramp (brand-relative, so forks rebrand automatically). Cells after today render dashed (planned); today carries the accent ring. Static by construction: nothing animates, PRM-safe.">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)", alignItems: "flex-start" }}>
                  <div>
                    <DataLabel as="div" style={{ marginBottom: "var(--space-xs)" }}>compact · 7 days · day labels · legend</DataLabel>
                    <StreakStrip
                      variant="compact"
                      data={streakDemoData("2026-07-12", 7)}
                      today="2026-07-09"
                      showLegend
                      ariaLabel="This week: 4 of 5 logged days active"
                    />
                  </div>
                  <div>
                    <DataLabel as="div" style={{ marginBottom: "var(--space-xs)" }}>long · 16 weeks · legend</DataLabel>
                    <StreakStrip
                      variant="long"
                      data={streakDemoData("2026-07-12", 112)}
                      today="2026-07-09"
                      showLegend
                    />
                  </div>
                </div>
              </Sample>
              <Sample label="TieredRung" components={["TieredRung"]} note="The progression list item: done / current / locked / gated. Adjacent rungs separate on a hairline automatically; gated carries the warning-voice gate line with a mini progress track. Composes Badge, Button, and the mono meta voice.">
                <div style={{ maxWidth: "36rem", width: "100%", background: "var(--background-positive-secondary)", border: "1px solid var(--border-positive-secondary)" }}>
                  <TieredRung state="done" title="Ground and gesso" meta="Done" actionLabel="Notes" actionHref="#sr-data-display" />
                  <TieredRung
                    state="current"
                    number={3}
                    title="Limited palettes"
                    description="Build a 3-6 color palette and stay in it."
                    actionLabel="Mark done"
                    actionHref="#sr-data-display"
                  />
                  <TieredRung state="locked" number={4} title="Alla prima" meta="Locked · finish stage 3 first" />
                  <TieredRung
                    state="gated"
                    title="Series development"
                    meta="Gate"
                    gateProgress={{ current: 1, required: 3, label: "published series" }}
                    actionLabel="Check gate"
                    actionHref="#sr-data-display"
                  />
                </div>
              </Sample>
              <Sample label="IdChip" components={["IdChip"]} note="The mono identifier chip on the inverse scrim, readable over imagery; corner anchoring belongs to the consumer (absolute inside a relative frame). It also reads inline on plain surfaces.">
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-lg)", alignItems: "flex-start" }}>
                  <div style={{ position: "relative", maxWidth: "20rem", width: "100%" }}>
                    <Image src="https://putl0nxdpoepzh5o.public.blob.vercel-storage.com/assets/showroom-landscape-eb9ea504.webp" alt="City rooftops at dusk" aspect="standard" sizes="20rem" />
                    <span style={{ position: "absolute", top: "var(--space-xs)", right: "var(--space-xs)" }}>
                      <IdChip>CM-2026-013</IdChip>
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center", flexWrap: "wrap" }}>
                    <IdChip>INV-2026-014</IdChip>
                    <IdChip>SKU-88-1017</IdChip>
                  </div>
                </div>
              </Sample>
              <Sample label="PriceLabel" components={["PriceLabel"]} note="The inline price figure: display face at the surrounding size, currency affix muted to the tertiary ink (the Stat affix convention). Whole amounts render bare; fractional keep their cents; the affix lands where the locale puts it.">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", color: "var(--text-positive-primary)" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "var(--space-xl)" }}>
                    <span style={{ fontSize: "var(--type-2xl)" }}><PriceLabel amount={640} /></span>
                    <span style={{ fontSize: "var(--type-lg)" }}><PriceLabel amount={19.5} /></span>
                    <span style={{ fontSize: "var(--type-lg)" }}><PriceLabel amount={1450} currency="EUR" locale="de-DE" /></span>
                  </div>
                  <p style={{ margin: 0, fontSize: "var(--type-sm)", color: "var(--text-positive-secondary)" }}>
                    Inline anywhere: First Frost is <PriceLabel amount={180} /> unframed.
                  </p>
                </div>
              </Sample>
              <Sample label="AssetCard" components={["AssetCard"]} note="The image-led inventory card: per-instance aspect ratios (mixed ratios side by side are the point), corner slots composing Badge, IdChip, and PriceLabel, and the title / mono meta below. A link card's frame border pulls to the accent on hover; muted is the sold / archived 0.65 state; with no image the frame renders the quiet accent-soft placeholder.">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))", gap: "var(--space-lg)", alignItems: "start", width: "100%" }}>
                  <AssetCard
                    aspectRatio="4/3"
                    href="#sr-data-display"
                    ariaLabel="Low Tide, no. 3"
                    image={<div style={{ background: "linear-gradient(155deg, var(--category-1) 0%, var(--background-positive-secondary) 100%)" }} />}
                    topLeft={<Badge tone="accent">WIP</Badge>}
                    title="Low Tide, no. 3"
                    meta="Harbor · 9.5 hrs"
                  />
                  <AssetCard
                    aspectRatio="3/4"
                    href="#sr-data-display"
                    ariaLabel="First Frost"
                    image={<NextImage src="https://putl0nxdpoepzh5o.public.blob.vercel-storage.com/assets/showroom-landscape-eb9ea504.webp" alt="" fill sizes="12rem" style={{ objectFit: "cover" }} />}
                    topLeft={<Badge tone="success" emphasis="solid">Ready</Badge>}
                    bottomRight={<IdChip><PriceLabel amount={180} /></IdChip>}
                    title="First Frost"
                    meta={'Winter Light · 10x10"'}
                  />
                  <AssetCard
                    aspectRatio="4/3"
                    muted
                    image={<div style={{ background: "linear-gradient(155deg, var(--category-2) 0%, var(--background-positive-secondary) 100%)" }} />}
                    topLeft={<Badge tone="neutral" emphasis="solid">Sold</Badge>}
                    topRight={<IdChip>CM-2026-013</IdChip>}
                    bottomRight={<IdChip><PriceLabel amount={680} /></IdChip>}
                    title="Harbor Study no. 2"
                    meta="Harbor · M. Anders"
                  />
                  <AssetCard
                    aspectRatio="16/9"
                    topLeft={<Badge tone="accent" emphasis="solid">Commission</Badge>}
                    title="Blue Hour study"
                    meta="R. Kessler · due Jul 24"
                  />
                </div>
              </Sample>
              <Sample label="SwatchRow" components={["SwatchRow"]} note="The palette strip: equal-weight blocks, sm inline chips or lg labelled blocks in the mono voice. Swatch colors are DATA (tokens or product hexes rendered as given, the chart-series exception); the strip's own dress stays token-pure.">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)", width: "100%", maxWidth: "28rem" }}>
                  <SwatchRow
                    size="lg"
                    showLabels
                    ariaLabel="Harbor palette"
                    swatches={[
                      { color: "var(--category-1)", label: "Harbor" },
                      { color: "var(--category-2)", label: "Blue hour" },
                      { color: "var(--category-4)", label: "Salt meadow" },
                      { color: "#28335C", label: "Indigo (hex)" },
                      { color: "var(--accent-base)", label: "Accent" },
                    ]}
                  />
                  <SwatchRow
                    size="sm"
                    ariaLabel="Piece palette"
                    swatches={[
                      { color: "var(--category-1)" },
                      { color: "var(--category-3)" },
                      { color: "var(--category-5)" },
                      { color: "var(--category-7)" },
                    ]}
                  />
                </div>
              </Sample>
              <Sample label="ProvenanceQuote" components={["ProvenanceQuote"]} note="The where-this-came-from block: mono eyebrow, display-italic quote, optional mono cross-reference out. The outward icon belongs to the component (the PromptedTextarea precedent), never to the copy.">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)", maxWidth: "32rem" }}>
                  <ProvenanceQuote
                    eyebrow="From the session log · Jul 6"
                    quote="Second glaze pulled the harbor shadow to a proper indigo. Warm anchors still missing."
                    link={{ label: "Open entry", href: "#sr-data-display" }}
                  />
                  <ProvenanceQuote
                    eyebrow="Idea pool · released Apr 12"
                    quote="A tide series painted only at slack water."
                  />
                </div>
              </Sample>
              <Sample label="DiaryEntry" components={["DiaryEntry"]} note="The day-grouped entry list: mono time, title with optional display-italic quote and mono meta, and the display-face duration figure right. groupByDay pins each consumer-worded day banner (Table's group band dress, made sticky) while its entries scroll; the frame here scrolls to show it.">
                {/* A NAMED group, the way Table names its own scroller. This frame scrolls on
                    purpose (to show the sticky day banner) and DiaryEntry renders nothing
                    focusable, so Chromium 130+ makes the scroller itself a Tab stop. Without a
                    role and a name that stop announced as nothing at all, on every fork's public
                    /components page. role="group" rather than region: the showroom would gain a
                    landmark per sample. */}
                <div role="group" aria-label="Practice log, scrollable sample" style={{ maxWidth: "36rem", width: "100%", maxHeight: "16rem", overflowY: "auto", border: "1px solid var(--border-positive-secondary)" }}>
                  <DiaryEntry
                    ariaLabel="Practice log"
                    groupByDay
                    entries={[
                      { day: "Wednesday · July 9", time: "9:40 am", title: "Third glaze on Low Tide, no. 3", quote: "Edges finally holding at the waterline.", meta: "Harbor · glazing", duration: "1.5 hrs" },
                      { day: "Wednesday · July 9", time: "2:10 pm", title: "Edge control drill on scrap", meta: "Technique", duration: "20 min" },
                      { day: "Tuesday · July 8", time: "10:05 am", title: "Blocked in Blue Hour study", quote: "Values first, color can wait until Thursday.", meta: "Commission · R. Kessler", duration: "2 hrs" },
                      { day: "Tuesday · July 8", time: "4:30 pm", title: "Stretched two 10x10 panels", duration: "45 min" },
                      { day: "Monday · July 7", time: "9:15 am", title: "Palette study for Salt Meadow", meta: "Series prep", duration: "1 hr" },
                    ]}
                  />
                </div>
              </Sample>
              <Sample label="LineItemRow" components={["LineItemRow"]} note="The invoice line grid: description | qty | rate | amount, money through PriceLabel, the amount always qty x rate. Editable rows are a client island (qty field on the Input surface, Carbon Close remove); the read-only row is server-safe and shares the same grid, so mixed rows align.">
                <ShowroomLineItemRowDemo />
              </Sample>
              <Sample label="InvoicePaper" components={["InvoicePaper"]} note="The print-preview shell on the theme-constant paper tokens: the sheet stays white with dark ink in dark mode too (an invoice prints white), re-grounding the positive semantic family for its subtree so composed components speak paper automatically. Under @media print the rest of the page hides and the paper fills the sheet. Framed and scrollable here (the AppShell bounded-stage treatment).">
                <div role="group" aria-label="Invoice paper, scrollable sample" style={{ width: "100%", maxWidth: "40rem", maxHeight: "26rem", overflowY: "auto", border: "1px dashed var(--border-positive-secondary)", borderRadius: "var(--component-radius)", padding: "var(--space-lg)", background: "var(--background-positive-secondary)" }}>
                  <InvoicePaper
                    ariaLabel="Invoice 2026-014"
                    letterhead={
                      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xs)" }}>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--type-lg)", fontWeight: tokenNumber("var(--weight-medium)") }}>Clara Marsh Studio</span>
                        <ContactStrip email="studio@claramarsh.example" phone="+1 415 555 0182" location="Sausalito, CA" />
                      </div>
                    }
                    meta={
                      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xs)", alignItems: "flex-end" }}>
                        <IdChip>INV-2026-014</IdChip>
                        <span>Issued Jul 8, 2026</span>
                        <span>Due Jul 22, 2026</span>
                      </div>
                    }
                    billTo={
                      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xs)" }}>
                        <DataLabel as="div">Bill to</DataLabel>
                        <span>R. Kessler</span>
                        <ContactStrip email="r.kessler@post.example" location="Portland, ME" />
                      </div>
                    }
                    totals={
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--space-lg)" }}>
                        <DataLabel as="span">Total due</DataLabel>
                        <span style={{ fontSize: "var(--type-xl)" }}><PriceLabel amount={858} /></span>
                      </div>
                    }
                    paymentNote="Payment by bank transfer to the account on file · net 14"
                    thankYou="Thank you for living with this work."
                  >
                    <LineItemRow description="Low Tide, no. 3 · oil on panel" qty={1} rate={640} />
                    <LineItemRow description="Float frame, natural oak" qty={2} rate={85} />
                    <LineItemRow description="Shipping · insured courier" qty={1} rate={48} />
                  </InvoicePaper>
                </div>
              </Sample>
              <Sample label="TokenRow" components={["TokenRow"]} note="The standard swatch, name, and hex row; the hex resolves live and the row copies its token. The style guide is built from these.">
                <div style={{ maxWidth: "28rem", width: "100%" }}>
                  <TokenRow token="--accent-base" />
                  <TokenRow token="--background-positive-primary" />
                  <TokenRow token="--green-base" />
                </div>
              </Sample>
              <Sample label="Badge" components={["Badge"]} note="Two registers via textCase: the default 'caps' is the mono, UPPERCASE, tracked metadata register (a system label, a status code); 'title' renders the label as authored (body font, no transform) for CONTENT badges that read as words: a person's role, a project status.">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", alignItems: "center" }}>
                    <Badge tone="neutral">Draft</Badge>
                    <Badge tone="info" icon>Info</Badge>
                    <Badge tone="success" icon>In sync</Badge>
                    <Badge tone="warning" icon>2 behind</Badge>
                    <Badge tone="error" icon>Failed</Badge>
                    <Badge tone="accent">Marketing</Badge>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", alignItems: "center" }}>
                    <Badge tone="neutral" emphasis="solid">Draft</Badge>
                    <Badge tone="info" emphasis="solid" icon>Info</Badge>
                    <Badge tone="success" emphasis="solid" icon>In sync</Badge>
                    <Badge tone="warning" emphasis="solid" icon>2 behind</Badge>
                    <Badge tone="error" emphasis="solid" icon>Failed</Badge>
                    <Badge tone="accent" emphasis="solid">Marketing</Badge>
                  </div>
                  {/* v4.7.0 — the content register (textCase="title"): reads as words, not a code. */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", alignItems: "center" }}>
                    <Badge tone="success" textCase="title">In progress</Badge>
                    <Badge tone="warning" textCase="title">Upcoming</Badge>
                    <Badge tone="neutral" textCase="title">Realtor</Badge>
                    <Badge tone="accent" textCase="title">Featured partner</Badge>
                  </div>
                </div>
              </Sample>
              <Sample label="Avatar" components={["Avatar"]} note="The person identity chip: initials derive from the name, a src swaps in the photo face, and the disc stays a pinned circle regardless of the radius dial.">
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", alignItems: "center" }}>
                  <Avatar name="Ada Osei" size="sm" />
                  <Avatar name="R. Kessler" />
                  <Avatar name="Mona" size="lg" />
                  <Avatar name="June Park" src="https://putl0nxdpoepzh5o.public.blob.vercel-storage.com/assets/showroom-interior-732f8097.webp" size="lg" />
                </div>
              </Sample>
            </div>
          </Panel>

          {/* Overlays and navigation */}
          <Panel
            id="sr-overlays"
            title="Overlays and navigation"
            subheading="Modal · menu · toast · tabs · shell chrome"
            subheadingVariant="mono"
          >
            <div style={sampleFlowStyle}>
              <p style={panelNoteStyle}>Layered surfaces and wayfinding: dialogs, menus, toasts, tabbed panels, and the site chrome.</p>
              <Row cols={{ desktop: 2, tablet: 2, mobile: 1 }} gap="lg">
                <Column>
                  <Sample label="Modal" components={["Modal"]}><ShowroomModalDemo /></Sample>
                </Column>
                <Column>
                  <Sample label="DropdownMenu" components={["DropdownMenu"]} note="Opening with a pointer click lands focus on the menu container, so no item reads as pre-selected; opening from the keyboard focuses an item (ArrowDown / Enter / Space land on the first, ArrowUp on the last), WAI-ARIA. The item fill is :focus-visible, so a mouse-opened menu shows no highlight until you key into it."><ShowroomMenuDemo /></Sample>
                </Column>
              </Row>
              <Row>
                <Column>
                  <Sample label="BrandLockup" components={["BrandLockup"]} note="The app top bar's brand slot: a square product mark, a faint hairline divider, and the product name. Passed as TopBar's expanded brand; the bare mark is brandCollapsed, so the divider disappears on collapse.">
                    <ShowroomBrandLockupDemo />
                  </Sample>
                </Column>
                <Column>
                  <Sample label="HeroPlate" components={["HeroPlate"]} note="A looping plate behind a hero claim, blended into the ground and masked; its opacities are the video's, declared on the fork's slot and measured, never copied.">
                    <ShowroomHeroPlateDemo />
                  </Sample>
                </Column>
                <Column>
                  <Sample label="BrandWordmark" components={["BrandWordmark"]} note="A site's brand in the Nav and Footer logo slots. With no children it is the name in the brand face, the fleet's one placeholder treatment for a client with no logo yet; a drawn stand-in or the final wordmark goes in as children. The status is declared in the fork's asset manifest and read by the HQ (v6.10.0).">
                    <ShowroomBrandWordmarkDemo />
                  </Sample>
                </Column>
                <Column>
                  <Sample label="HelpModal" components={["HelpModal"]} note="A labelled Help button that opens a tabbed modal; the first tab renders the product's keyboard shortcuts from data. Further tabs (a help centre, release notes) pass through.">
                    <ShowroomHelpModalDemo />
                  </Sample>
                </Column>
                <Column>
                  <Sample label="NotificationsButton" components={["NotificationsButton"]} note="A labelled bell with an optional unread dot, opening the product's feed, or a calm empty state until one exists.">
                    <ShowroomNotificationsDemo />
                  </Sample>
                </Column>
              </Row>

              {/* v4.5.0 — the web-app / product primitives */}
              <Sample label="Toolbar" components={["Toolbar"]} note="The list's control row on a data surface (v6.30.0): filters leading (a Search on the sm rung, a track SegmentedControl, toggles, links, in that order), actions trailing (ghosts with their stamps, then the one primary), the live count under them. Every child on the sm rung, one baseline.">
                <div style={{ width: "100%" }}>
                  <Toolbar
                    filters={
                      <>
                        <Search id="sr-toolbar-q" label="Search clients" labelHidden size="sm" placeholder="Search clients" />
                        <SegmentedControl name="sr-toolbar-density" ariaLabel="Density" variant="track" size="sm" options={[{ value: "rows", label: "Rows" }, { value: "cards", label: "Cards" }]} />
                      </>
                    }
                    actions={
                      <>
                        <Button variant="ghost" size="sm" icon={<Renew size={16} />}>Refresh</Button>
                        <Button variant="primary" size="sm">New client</Button>
                      </>
                    }
                    count="8 clients"
                  />
                </div>
              </Sample>
              <Sample label="RecordCard" components={["RecordCard"]} note="One record as a card with height (v6.30.0): the row of a header-less list given a favicon, its links and room. A borderless link Card; the name is the link, the marks are their own links; money and status always right, links always trailing.">
                <div style={{ width: "100%" }}>
                  <RecordCard
                    name="zafiro"
                    href="#sr-record-card"
                    chips={<><Badge tone="finance" textCase="sentence">Finance</Badge><Badge tone="neutral">Web</Badge><Badge tone="neutral">Brand</Badge></>}
                    note="Launched 19 Sep, late, on the owner's word. The apex 308s to www; both hold certificates."
                    figure="$9,000 of $12,000"
                    figureLabel="Invoiced"
                    status={<><Badge tone="success" icon>Active</Badge><Badge tone="error" icon textCase="sentence">Invoice past due</Badge></>}
                    links={[
                      { label: "Production", href: "#sr-rc-prod", icon: <Home size={16} /> },
                      { label: "Repository", href: "#sr-rc-repo", icon: <Document size={16} /> },
                    ]}
                    domain="zafirointl.com"
                  />
                </div>
              </Sample>
              <Sample label="PageHead" components={["PageHead"]} note="The app-page section header: an OPTIONAL mono eyebrow, a level-1 heading, an optional lede, and a right-aligned action. Omit eyebrow for a bare title: no eyebrow element, no reserved gap. align='center' stacks it for auth/onboarding flows; variant='record' is the head of a record on a data surface (breadcrumbs, a meta line, a links line, the stamp and the actions).">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)", width: "100%" }}>
                  {/* as="div": specimens, not page structure; they were a second and third h1 on every fork's /components (typography audit, 23 Aug 2026). */}
                  <PageHead
                    as="div"
                    eyebrow="The pool"
                    title="The idea pool"
                    lede="Anything may enter. Ideas form, float, promote into pieces, or release with a reason on record."
                    action={<Button variant="primary" size="sm">Drop an idea</Button>}
                  />
                  {/* v4.7.0 — eyebrow is optional: a bare title, no eyebrow element, no reserved gap. */}
                  <PageHead
                    as="div"
                    title="Settings"
                    lede="No eyebrow: the title stands alone when the rail already names the page."
                  />
                </div>
              </Sample>
              <Row>
                <Column>
                  <Sample label="StatBand" components={["StatBand"]} note="A responsive KPI row of Stat children with one consistent gap; works with every Stat treatment (bare, outlined, filled).">
                    <StatBand ariaLabel="Studio KPIs">
                      <Stat accent countUp label="Projects" value={42} />
                      <Stat countUp prefix="$" label="Invoiced" value={102750} />
                      <Stat countUp suffix="%" label="Utilisation" value={95} />
                    </StatBand>
                  </Sample>
                </Column>
                <Column>
                  <Sample label="ProgressBar" components={["ProgressBar"]} note="A token-pure meter with five tones, two weights, and an optional label + value readout. size=&quot;lg&quot; is the meter that carries a row rather than sitting inside one.">
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", width: "100%" }}>
                      <ProgressBar value={66} label="Onboarding" showValue />
                      <ProgressBar value={4} max={5} tone="success" label="Licenses used" showValue />
                      <ProgressBar value={90} tone="warning" label="Storage" showValue />
                      <ProgressBar value={97} tone="danger" label="Past due" showValue />
                      <ProgressBar value={78} size="lg" label="Roof lifespan used" showValue />
                      <ProgressBar value={97} size="lg" tone="danger" label="Water heater lifespan used" showValue />
                    </div>
                  </Sample>
                </Column>
              </Row>
              <Sample label="PanelGrid" components={["PanelGrid"]} note="The dashboard panel grid: main+aside / halves / thirds with min-width:0 guards baked into every track; stacks below the desktop breakpoint.">
                <PanelGrid layout="main-aside">
                  <Card elevation="subtle"><Card.Body><Heading as="div" size={6}>Main</Heading><p style={showroomPanelProseStyle}>The primary panel takes 2fr.</p></Card.Body></Card>
                  <Card elevation="subtle"><Card.Body><Heading as="div" size={6}>Aside</Heading><p style={showroomPanelProseStyle}>The aside takes 1fr and stacks under below 1024px.</p></Card.Body></Card>
                </PanelGrid>
              </Sample>
              <Row>
                <Column>
                  <Sample label="TextField" components={["TextField"]} note="The labelled server-form input row over Input, with name passthrough for server actions.">
                    <TextField id="sr-textfield" name="displayName" label="Name" helper="However you sign your name. One field, any form." />
                  </Sample>
                  <Sample label="TextField, password" components={["TextField"]} note="reveal adds the show/hide control; requirements lists the rules from first paint and ticks them as they are met, rather than waiting to fail somebody after they submit. The rules are DATA, never predicates: a function cannot cross into the client leaf that checks them.">
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                      <TextField
                        id="sr-password-signin"
                        name="password"
                        type="password"
                        label="Password"
                        reveal
                        autoComplete="current-password"
                        helper="Signing in: reveal on its own, no rule list. Nobody needs the rules to type a password they already have."
                      />
                      <TextField
                        id="sr-password-new"
                        name="newPassword"
                        type="password"
                        label="Create a password"
                        reveal
                        requirements={{ minLength: 8, number: true }}
                        autoComplete="new-password"
                      />
                    </div>
                  </Sample>
                  <Sample label="MaskedInput" components={["MaskedInput"]} note="Formats as you type against a mask pattern; a hidden input carries the RAW digits, so a plain form submit gets clean data.">
                    <MaskedInput id="sr-masked" name="phone" label="Phone number" mask={PHONE_MASK} placeholder="(555) 000-0000" helper="Digits only are submitted." />
                  </Sample>
                  <Sample label="CurrencyInput" components={["CurrencyInput"]} note="Money entry with live thousands grouping; a hidden input carries the RAW MINOR UNITS (integer cents), so a plain form submit gets clean data. currency drives the symbol; decimals={0} takes whole units only.">
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                      <CurrencyInput id="sr-currency" name="amount" label="Amount" placeholder="0.00" helper="Cents are submitted: $1,234.56 arrives as 123456." />
                      <CurrencyInput id="sr-currency-whole" name="budget" label="Budget" currency="EUR" decimals={0} placeholder="0" helper="Whole units: a pasted 1,234.56 truncates to 1234." />
                    </div>
                  </Sample>
                </Column>
                <Column>
                  <Sample label="Stepper" components={["Stepper"]} note="A horizontal numbered wizard header (done/current/upcoming). Distinct from Breadcrumbs (nav path) and TieredRung (vertical ladder). variant=&quot;compact&quot; drops the per-step labels and carries the count in one caption, for longer flows in narrower containers.">
                    <Stepper steps={[{ label: "Create profile" }, { label: "Purchase plan" }, { label: "Send invites" }]} current={1} />
                    <div style={{ marginTop: "var(--space-lg)" }}>
                      <Stepper
                        variant="compact"
                        current={3}
                        ariaLabel="Compact progress"
                        steps={[
                          { label: "Address" },
                          { label: "Home" },
                          { label: "Roof shape" },
                          { label: "Roof material" },
                          { label: "Recent work" },
                          { label: "Contacts" },
                          { label: "Account" },
                        ]}
                      />
                    </div>
                  </Sample>
                </Column>
              </Row>
              <Row>
                <Column>
                  <Sample label="FormModal" components={["FormModal"]} note="Trigger → Modal → async onSubmit → toast, remounting on open so no stale draft and no React-19 reset wipe.">
                    <ShowroomFormModalDemo />
                  </Sample>
                </Column>
                <Column>
                  <Sample label="FileUpload" components={["FileUpload"]} note="Dropzone + preview grid + per-file remove and progress. The real upload is the consumer's (a BACKEND seam).">
                    <ShowroomFileUploadDemo />
                  </Sample>
                </Column>
              </Row>
              <Sample label="BulkActionBar" components={["BulkActionBar"]} note="A sticky contextual bar that appears on multi-select: 'N selected' + actions + clear. Escape clears; the visible bar renders nothing at zero, while a resident status region announces the count.">
                <ShowroomBulkActionBarDemo />
              </Sample>
              <Sample label="TopBar · account" components={["TopBar"]} note="The top bar&apos;s built-in account control (v4.8.0: AccountMenu folded into TopBar; pass the account prop). Avatar + name trigger in the SECONDARY register; menu opens onto an identity header and configurable items, destructive tail fenced by a divider. TopBar also exports the inclusive name/email validators.">
                <TopBar showToggle={false} brand={null} account={{ name: "Sofia Vance", email: "sofia@moonlightstudio.test", items: [{ label: "Settings", href: "#" }, { label: "Log out", href: "#", destructive: true }] }} />
              </Sample>
              <Sample label="TopBar · context" components={["TopBar"]} note="The context slot (v4.10.0, promoted from the readilyhome homeowner bar): product context pinned at the leading edge of the utilities region: the region grows to span the bar and the action cluster moves to the trailing edge. Omitted, the bar keeps the cluster-only layout.">
                <TopBar showToggle={false} brand={null} context={<span style={{ fontSize: "var(--type-sm)", color: "var(--text-positive-secondary)" }}>128 Alder Lane, Portland</span>} utilities={<Button variant="ghost" size="sm" href="#log-out">Log out</Button>} />
              </Sample>
              <Sample label="PricingCard" components={["PricingCard"]} note="A plan/tier card: price (via PriceLabel), cycle, a check-row feature list, an optional most-popular Badge, and a CTA. Pricing math is the consumer's.">
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-lg)" }}>
                  <PricingCard tier="Silver" price={4900} cycle="/mo" features={["25 licenses", "Standard support"]} cta={<Button variant="secondary">Choose Silver</Button>} />
                  <PricingCard tier="Gold" price={9900} cycle="/mo" featured badge="Most popular" features={["100 licenses", "Priority support", { label: "Dedicated manager", included: false }]} cta={<Button variant="primary">Choose Gold</Button>} />
                </div>
              </Sample>
              <Sample label="DataTable, lead rows" components={["DataTable"]} note="leadRows always come first and never sort: sort any column and the two pinned rows hold while the rest reorder beneath them. For pinned favourites, a summary row, or records a viewer was assigned rather than created. NOTE the shape of this sample — plain columns and plain rows, no render or rowKey functions. The showroom is a SERVER component and DataTable is a client one, so a function passed here compiles clean and fails at prerender.">
                <DataTable
                  ariaLabel="Territories, two pinned"
                  sortable
                  leadRows={[
                    { zip: "92109", city: "San Diego", homes: 412 },
                    { zip: "33139", city: "Miami Beach", homes: 288 },
                  ]}
                  rows={[
                    { zip: "78704", city: "Austin", homes: 934 },
                    { zip: "10012", city: "New York", homes: 1205 },
                    { zip: "60614", city: "Chicago", homes: 671 },
                  ]}
                  columns={[
                    { key: "zip", header: "Zip", sortable: true },
                    { key: "city", header: "City", sortable: true },
                    { key: "homes", header: "Homes", align: "right", sortable: true },
                  ]}
                />
              </Sample>
              <Sample label="DataTable" components={["DataTable"]} note="A client wrapper over the presentational Table: client-side sort + pagination + an empty state.">
                <DataTable
                  ariaLabel="Invites"
                  sortable
                  pageSize={5}
                  columns={[{ key: "name", header: "Partner" }, { key: "status", header: "Status" }, { key: "sent", header: "Sent", sortable: true, sortDescFirst: true }]}
                  rows={[{ name: "Blick", status: "Accepted", sent: 12 }, { name: "NY Central", status: "Sent", sent: 40 }, { name: "Harbor Co", status: "Opened", sent: 7 }]}
                />
              </Sample>
              <Sample label="Skeleton" components={["Skeleton"]} note="The loading placeholder primitive: three shapes (line / block / disc), built-in pulse, reduced-motion safe, always aria-hidden. Row and card skeletons are compositions of these: mirror the real layout's silhouette at the call site.">
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", maxWidth: "28rem" }}>
                  {/* A table-row recipe: disc + two lines + a trailing bar. */}
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                    <Skeleton shape="disc" />
                    <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", gap: "var(--space-2xs)" }}>
                      <Skeleton width="60%" />
                      <Skeleton width="35%" />
                    </div>
                    <Skeleton width="4rem" />
                  </div>
                  {/* A media-card recipe: block + caption lines. */}
                  <Skeleton shape="block" aspectRatio="16 / 9" />
                  <Skeleton width="45%" />
                </div>
              </Sample>
              <Sample label="NotificationFeed" components={["NotificationFeed"]} note="A grouped, unread-aware activity feed that works both inside the NotificationsButton drawer and as a full page.">
                <NotificationFeed
                  groups={[
                    { title: "Today", items: [{ id: "n1", type: "success", title: "Invite accepted", description: "Blick accepted your invite.", timestamp: "2h", unread: true, href: "#" }] },
                    { title: "Earlier", items: [{ id: "n2", type: "info", title: "Plan renewed", timestamp: "Mon", href: "#" }] },
                  ]}
                />
              </Sample>
              <Sample label="Tooltip" components={["Tooltip"]} note="Hover the info glyph, or Tab to it: the chip opens on the shared top layer, centred under its trigger, and Escape closes it. Tooltip.InfoTrigger is the house info button (Information--Square--Filled): set the icon once in the mother and every product tooltip follows. Short clarifying text only, never essential content.">
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2xs)" }}>
                  <span style={{ fontSize: "var(--type-sm)", color: "var(--text-positive-secondary)" }}>Net 30</span>
                  <Tooltip content="Payment is due 30 days from the invoice date.">
                    <TooltipInfoTrigger label="What Net 30 means" />
                  </Tooltip>
                </div>
              </Sample>
              <Sample label="CommandPalette" components={["CommandPalette"]} note="The keyboard-first search overlay on the Modal machinery: fuzzy matches highlight the query characters in the accent, arrows walk the flat list across groups, Enter runs, Escape closes the palette before any parent overlay (the element-level Escape claim). No matches offers the fallback action.">
                <ShowroomCommandPaletteDemo />
              </Sample>
              <Sample label="Toast" components={["Toast"]} note="Cards render inline; the button raises a live one into the viewport.">
                <ShowroomToastDemo />
              </Sample>
              <Sample label="NavRail" components={["NavRail"]} note="The app-shell left rail with the page-local subgroup: core destinations, then a divider, a mono title, and quieter items. The active subgroup item wears the 2px accent rule on the accent wash at medium weight. The theme toggle sits at the rail foot (themeToggle); the Collapse control joins it when the rail is wired to AppShell; see the AppShell demo below.">
                <div style={navRailFrameStyle}>
                  <NavRail
                    ariaLabel="Showroom rail"
                    themeToggle
                    items={[
                      { href: "#nr-home", label: "Home", icon: <Home size={20} /> },
                      { href: "#nr-works", label: "Works", icon: <Folders size={20} />, active: true },
                      { href: "#nr-settings", label: "Settings", icon: <Settings size={20} /> },
                    ]}
                    subgroup={{
                      title: "Series",
                      items: [
                        { href: "#nr-harbor", label: "Harbor", icon: <Document size={20} />, active: true },
                        { href: "#nr-blue-hour", label: "Blue hour", icon: <Document size={20} /> },
                        { href: "#nr-salt-meadow", label: "Salt meadow", icon: <Document size={20} /> },
                      ],
                    }}
                  />
                </div>
              </Sample>
              <Sample label="TopBar" components={["TopBar"]} note="The app-shell header: mobile hamburger + the BrandLockup (mark + hairline divider + product name) left, the consumer's utilities right, on the frosted chrome recipe. It owns no state; AppShell supplies the toggle, collapsed, and overlay state (collapsed swaps the lockup for the bare mark).">
                <div style={{ width: "100%", border: "1px dashed var(--border-positive-secondary)", borderRadius: "var(--component-radius)", overflow: "hidden" }}>
                  <TopBar
                    brand={<BrandLockup mark={<BrandMark href="#brand-home" size="2rem" title="Showroom" />} name="Showroom" />}
                    brandCollapsed={<BrandMark href="#brand-home" size="2rem" title="Showroom" />}
                    utilities={
                      <>
                        <Button variant="ghost" size="sm" href="#docs">Docs</Button>
                        <Button variant="ghost" size="sm" href="#log-out">Log out</Button>
                      </>
                    }
                  />
                </div>
              </Sample>
              <Sample label="AppShell" components={["AppShell"]} note="The composed working shell: TopBar + NavRail + content, with AppShell as the single owner of the collapsed / overlay state. Live inside the frame: the rail's foot control collapses it on desktop; on a narrow viewport the hamburger opens the overlay.">
                <ShowroomAppShellDemo />
              </Sample>
              <Sample label="Breadcrumbs" components={["Breadcrumbs"]} note="The path trail for hierarchies of three or more navigable levels; at two levels a trail is decoration and the back button is the affordance (house doctrine, 7 Jul). Links reveal the accent on hover; the quiet tail is the current page.">
                <Breadcrumbs
                  ariaLabel="Showroom breadcrumb"
                  items={[
                    { label: "Partners", href: "#bc-partners" },
                    { label: "Acme Home Services", href: "#bc-acme" },
                    { label: "Activation" },
                  ]}
                />
              </Sample>
              <Sample label="Accordion" components={["Accordion"]} note="The disclosure list. Panel content stays in the DOM when collapsed, hidden by grid-row collapse plus inert, so crawlers, assistants and in-page find all reach it and the open can animate. Each trigger is a button inside a real heading, and the level is a required prop because it has to continue the page outline.">
                <Accordion
                  headingLevel={4}
                  ariaLabel="Accordion demo"
                  items={[
                    {
                      title: "What does a disclosure buy over a plain list?",
                      children: "Length. A specification list of thirty rows is unreadable open and scannable closed. If the content is short, leave it open: a collapsed panel costs a click and buys nothing.",
                      defaultOpen: true,
                    },
                    {
                      title: "Why is the content still in the DOM when closed?",
                      children: "Because hiding it by conditional render makes it invisible to search engines, to assistants, and to ctrl+F. inert keeps it out of the tab order and out of the accessibility tree without removing it from the page.",
                    },
                    {
                      title: "Single or multiple?",
                      children: "Multiple by default, which suits questions and specifications. Single suits alternatives, where reading one means you are done with the others.",
                    },
                  ]}
                />
              </Sample>
              <Sample label="Tabs" components={["Tabs"]}>
                <Tabs orientation="horizontal">
                  <TabsList ariaLabel="Tabs demo">
                    <TabsTab>Overview</TabsTab>
                    <TabsTab>Tokens</TabsTab>
                    <TabsTab>Components</TabsTab>
                  </TabsList>
                  <TabsPanels>
                    <TabsPanel>The lay of the land. Five dials shift the look without rewriting a component.</TabsPanel>
                    <TabsPanel>Raw primitives at one layer, semantic aliases at another.</TabsPanel>
                    <TabsPanel>One system, many pieces, each consuming only semantic tokens.</TabsPanel>
                  </TabsPanels>
                </Tabs>
              </Sample>
              <Sample label="TabLinks" components={["TabLinks"]} note="Route navigation dressed as tabs: Tabs switches co-located panels in place with real tablist semantics, while TabLinks is a nav landmark of next/link anchors between sibling routes, the consumer marking the active one.">
                <ShowroomTabLinksDemo />
              </Sample>
              <Sample label="Footer" components={["Footer"]} note="The live footer is at the bottom of this page; this framed one shows the full column and social set.">
                <div style={{ maxWidth: "56rem", border: "1px dashed var(--border-positive-secondary)", borderRadius: "var(--component-radius)", overflow: "hidden" }}>
                  <Footer
                    tagline="Design and engineering studio for ambitious teams."
                    columns={[
                      { heading: "Work", links: [{ label: "Case studies", href: "#work" }, { label: "Clients", href: "#clients" }] },
                      { heading: "Studio", links: [{ label: "About", href: "#about" }, { label: "Team", href: "#team" }] },
                      { heading: "Resources", links: [{ label: "Journal", href: "#journal" }, { label: "Docs", href: "#docs" }] },
                      { heading: "Legal", links: [{ label: "Privacy", href: "#privacy" }, { label: "Terms", href: "#terms" }] },
                    ]}
                    copyright="2026. All rights reserved."
                    address="Sample registered office: 1 Studio Lane, Suite 2, West Palm Beach, FL 33401"
                    social={[
                      { platform: "linkedin", href: "#linkedin" },
                      { platform: "github", href: "#github" },
                      { platform: "x", href: "#x" },
                    ]}
                  />
                </div>
              </Sample>
              <Sample label="Nav" components={[]} note="Exempt from a live demo: the Nav at the very top of this page IS the component (logo, link row, panels, CTA, and the full-screen menu below the tablet breakpoint); a second live nav would collide on the Primary landmark.">
                <p style={inlineNoteStyle}>
                  The Nav component is this page&apos;s own chrome. Open the full-screen menu on a narrow
                  viewport to see the overlay, the emblem, and the close choreography.
                </p>
              </Sample>
            </div>
          </Panel>

          {/* Media */}
          <Panel
            id="sr-media"
            title="Media"
            subheading="Image · video · lightbox · marquee"
            subheadingVariant="mono"
          >
            <div style={sampleFlowStyle}>
              <p style={panelNoteStyle}>Images, embedded video, a lightbox gallery, scroll-reactive art, and a running marquee on token-pure surfaces.</p>
              <Row cols={{ desktop: 2, tablet: 2, mobile: 1 }} gap="lg">
                <Column>
                  <Sample label="Image" components={["Image"]}>
                    <div style={{ maxWidth: "28rem", width: "100%" }}>
                      <Image src="https://putl0nxdpoepzh5o.public.blob.vercel-storage.com/assets/showroom-architecture-c6ced177.webp" alt="Concrete facade in daylight" aspect="wide" caption="Studio archive" sizes="(min-width: 1024px) 28rem, 100vw" />
                    </div>
                  </Sample>
                </Column>
                <Column>
                  <Sample label="Video" components={["Video"]}>
                    <div style={{ maxWidth: "32rem", width: "100%" }}>
                      <Video src="https://www.youtube.com/watch?v=ta_tTZrarE0" title="Studio reel" aspect="16x9" caption="Studio reel, 2026 cut." />
                    </div>
                  </Sample>
                </Column>
              </Row>
              <Sample label="Lightbox" components={["Lightbox"]} note="Click a thumbnail: the gallery opens full-screen with arrow-key navigation.">
                <div style={{ maxWidth: "40rem", width: "100%" }}>
                  <Lightbox
                    label="Project gallery"
                    columns={3}
                    images={[
                      { src: "https://putl0nxdpoepzh5o.public.blob.vercel-storage.com/assets/showroom-architecture-c6ced177.webp", alt: "Concrete facade in daylight", caption: "Facade study" },
                      { src: "https://putl0nxdpoepzh5o.public.blob.vercel-storage.com/assets/showroom-landscape-eb9ea504.webp", alt: "City rooftops at dusk", caption: "Site context" },
                      { src: "https://putl0nxdpoepzh5o.public.blob.vercel-storage.com/assets/showroom-interior-732f8097.webp", alt: "Forest path with morning light", caption: "Landscape approach" },
                    ]}
                  />
                </div>
              </Sample>
              <Sample label="PhotoStrip" components={["PhotoStrip"]} note="The thumb grid with the dashed add slot: six square slots, real button thumbs, the selected one under the 2px accent ring. Click a thumb to move the selection; the add slot washes to the accent on hover.">
                <ShowroomPhotoStripDemo />
              </Sample>
              <Sample label="Media" components={["Media"]} note="Fade-in on load, hover-zoom, and a scroll parallax drift.">
                <div style={{ maxWidth: "40rem", width: "100%" }}>
                  <Media src="https://putl0nxdpoepzh5o.public.blob.vercel-storage.com/assets/showroom-architecture-c6ced177.webp" alt="Concrete facade in daylight" aspect="wide" rounding="soft" sizes="(min-width: 1024px) 40rem, 100vw" />
                </div>
              </Sample>
              <Sample label="Carousel" components={["Carousel"]} note="A quiet auto-crossfade slideshow: a thin frosted progress bar fills over each slide, frosted nav dots (active = accent) ride the bottom, and the frost mirrors light/dark. Reduced-motion holds one slide. Brand-agnostic: the images and any emblem are passed in.">
                <div style={{ maxWidth: "40rem", width: "100%" }}>
                  <Carousel
                    ariaLabel="Studio slideshow"
                    aspect="16 / 9"
                    slides={[
                      { src: "https://putl0nxdpoepzh5o.public.blob.vercel-storage.com/assets/showroom-architecture-c6ced177.webp", alt: "Concrete facade in daylight" },
                      { src: "https://putl0nxdpoepzh5o.public.blob.vercel-storage.com/assets/showroom-landscape-eb9ea504.webp", alt: "City rooftops at dusk" },
                      { src: "https://putl0nxdpoepzh5o.public.blob.vercel-storage.com/assets/showroom-interior-732f8097.webp", alt: "Forest path with morning light" },
                    ]}
                  />
                </div>
              </Sample>
              <Sample label="Marquee" components={["Marquee"]}>
                <Marquee speed="normal" gap="lg">
                  {["Aurora", "Bastion", "Citrine", "Drift", "Ember", "Foundry"].map((word) => (
                    <span key={word} style={marqueeItemStyle}>{word}</span>
                  ))}
                </Marquee>
              </Sample>
            </div>
          </Panel>

          {/* Data visualisation */}
          <Panel
            id="sr-dataviz"
            title="Data visualisation"
            subheading="Bar · donut · line · stacked · split · cloud"
            subheadingVariant="mono"
          >
            <div style={sampleFlowStyle}>
              <p style={panelNoteStyle}>Charts that read the chart tokens, size themselves, and follow the theme dial.</p>
              <Row cols={{ desktop: 2, tablet: 2, mobile: 1 }} gap="lg">
                <Column>
                  <Sample label="BarChart" components={["BarChart"]}>
                    <BarChart series="Units sold" showLegend data={[
                      { label: "Apparel", value: 320 },
                      { label: "Footwear", value: 245 },
                      { label: "Bags", value: 180 },
                      { label: "Watches", value: 140 },
                      { label: "Eyewear", value: 95 },
                    ]} />
                  </Sample>
                </Column>
                <Column>
                  <Sample label="DonutChart" components={["DonutChart"]}>
                    <DonutChart size={220} thickness={30} centerValue="100%" centerLabel="Market" data={[
                      { label: "Northwind", value: 38 },
                      { label: "Contoso", value: 27 },
                      { label: "Fabrikam", value: 21 },
                      { label: "Others", value: 14 },
                    ]} />
                  </Sample>
                </Column>
              </Row>
              <Sample label="LineChart" components={["LineChart"]}>
                <LineChart series="Revenue" showLegend smooth data={[
                  { label: "Jan", value: 42000 },
                  { label: "Feb", value: 47500 },
                  { label: "Mar", value: 51000 },
                  { label: "Apr", value: 48000 },
                  { label: "May", value: 56000 },
                  { label: "Jun", value: 61000 },
                ]} />
              </Sample>
              <Sample label="StackedBarChart" components={["StackedBarChart"]} note="N-column stacked bars on BarChart's axis and tooltip conventions. Segment colors arrive as data (--category-* here, so the series rebrand and mirror per theme); projectionColumn renders that column as the dashed projection stub, an outline of what is expected rather than a fact, with an italic axis label.">
                <StackedBarChart
                  projectionColumn={3}
                  legend={[
                    { key: "originals", label: "Originals", color: "var(--category-1)" },
                    { key: "prints", label: "Prints", color: "var(--category-3)" },
                    { key: "commissions", label: "Commissions", color: "var(--category-5)" },
                  ]}
                  columns={[
                    { label: "Q1", values: [
                      { key: "originals", value: 1240, color: "var(--category-1)" },
                      { key: "prints", value: 420, color: "var(--category-3)" },
                      { key: "commissions", value: 680, color: "var(--category-5)" },
                    ] },
                    { label: "Q2", values: [
                      { key: "originals", value: 1580, color: "var(--category-1)" },
                      { key: "prints", value: 510, color: "var(--category-3)" },
                      { key: "commissions", value: 320, color: "var(--category-5)" },
                    ] },
                    { label: "Q3", values: [
                      { key: "originals", value: 1120, color: "var(--category-1)" },
                      { key: "prints", value: 640, color: "var(--category-3)" },
                      { key: "commissions", value: 900, color: "var(--category-5)" },
                    ] },
                    { label: "Q4", values: [
                      { key: "originals", value: 1750, color: "var(--category-1)" },
                      { key: "prints", value: 700, color: "var(--category-3)" },
                      { key: "commissions", value: 560, color: "var(--category-5)" },
                    ] },
                  ]}
                />
              </Sample>
              <Row cols={{ desktop: 2, tablet: 2, mobile: 1 }} gap="lg">
                <Column>
                  <Sample label="ChannelSplitBar" components={["ChannelSplitBar"]} note="The horizontal stacked single bar: proportional segments with a 4px minimum sliver so a sub-4% channel never vanishes, percentages computed by largest remainder (they always sum to 100), and the square-dot legend in the mono voice. Static and PRM-safe.">
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
                      <ChannelSplitBar segments={[
                        { label: "Site", value: 4200, color: "var(--category-1)" },
                        { label: "Fair", value: 2600, color: "var(--category-3)" },
                        { label: "Gallery", value: 1900, color: "var(--category-5)" },
                        { label: "Direct", value: 240, color: "var(--accent-base)" },
                      ]} />
                      <ChannelSplitBar showLegend={false} segments={[
                        { label: "Site", value: 62, color: "var(--category-1)" },
                        { label: "Fair", value: 38, color: "var(--category-3)" },
                      ]} />
                    </div>
                  </Sample>
                </Column>
                <Column>
                  <Sample label="WordFrequencyCloud" components={["WordFrequencyCloud"]} note="The read-once frequency viz: display-face words sized on the square root of normalized frequency, dealt center-out from a frequency sort (deterministic, no randomness), colors cycling --category-* unless the data brings its own.">
                    <WordFrequencyCloud
                      maxFontSize={64}
                      words={[
                        { text: "harbor", frequency: 42 },
                        { text: "glaze", frequency: 31 },
                        { text: "indigo", frequency: 24 },
                        { text: "edges", frequency: 18 },
                        { text: "shadow", frequency: 14 },
                        { text: "warm", frequency: 11 },
                        { text: "anchors", frequency: 8 },
                        { text: "scrap", frequency: 5 },
                        { text: "tide", frequency: 3 },
                      ]}
                    />
                  </Sample>
                </Column>
              </Row>
            </div>
          </Panel>

          {/* Layout and structure */}
          <Panel
            id="sr-layout"
            title="Layout and structure"
            subheading="Bands · width · grid · rhythm"
            subheadingVariant="mono"
          >
            <div style={sampleFlowStyle}>
              <p style={panelNoteStyle}>The primitives that own the page skeleton: full-width bands, constrained width, grid tracks, vertical rhythm, and the gaps between.</p>
              <Sample label="Section" components={["Section"]} note="Shown nested for the demo; in a real page a Section is a top-level band. Inverted flips to the opposite theme surface.">
                <Section padding="normal">
                  <Container size="md"><Heading as="div" size={4}>Section, padding normal</Heading></Container>
                </Section>
                <Section padding="normal" background="inverted">
                  <Container size="md"><Heading as="div" size={4}>Inverted band</Heading></Container>
                </Section>
              </Sample>
              <Sample label="Container" components={["Container"]}>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                  {(["sm", "md", "lg"] as const).map((size) => (
                    <Container key={size} size={size} style={{ background: "var(--background-positive-secondary)", minHeight: "2.5rem", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--component-radius)", fontFamily: "var(--font-code)", fontSize: "var(--type-xs)", color: "var(--text-positive-secondary)" }}>
                      size={size}
                    </Container>
                  ))}
                </div>
              </Sample>
              <Sample label="Row and Column" components={["Row", "Column"]}>
                <Row cols={4} gap="md">
                  <Column span={2}><div style={demoCellStyle}>span 2</div></Column>
                  <Column><div style={demoCellStyle}>1</div></Column>
                  <Column><div style={demoCellStyle}>1</div></Column>
                </Row>
              </Sample>
              <Sample label="Flow" components={["Flow"]} note="Vertical rhythm applied to direct children, with per-child gap overrides.">
                <Flow>
                  <p data-flow-gap="tight" style={{ fontFamily: "var(--font-code)", fontSize: "var(--type-xs)", color: "var(--text-positive-secondary)", margin: 0 }}>Overview</p>
                  <Heading as="div" size={5}>Vertical rhythm as a system property</Heading>
                  <p style={{ color: "var(--text-positive-primary)", margin: 0 }}>First paragraph, spaced by the flow token below it.</p>
                  <p data-flow-gap="group" style={{ color: "var(--text-positive-primary)", margin: 0 }}>A group break opens a wider gap before this block.</p>
                </Flow>
              </Sample>
              <Row cols={{ desktop: 2, tablet: 2, mobile: 1 }} gap="lg">
                <Column>
                  <Sample label="Spacer" components={["Spacer"]}>
                    <div style={demoCellStyle}>Above</div>
                    <Spacer size="2xl" />
                    <div style={demoCellStyle}>Below</div>
                  </Sample>
                </Column>
                <Column>
                  <Sample label="Divider" components={["Divider"]}>
                    <div style={demoCellStyle}>Above</div>
                    <Divider weight="strong" spacing="lg" />
                    <div style={demoCellStyle}>Below</div>
                  </Sample>
                </Column>
              </Row>
            </div>
          </Panel>

          {/* Motion */}
          <Panel
            id="sr-motion"
            title="Motion"
            subheading="Pointer · scroll · reveal"
            subheadingVariant="mono"
          >
            <div style={sampleFlowStyle}>
              <p style={panelNoteStyle}>Pointer and scroll-driven reveals that ride the motion dial and rest still under reduced motion. The full catalog lives on the mother&apos;s /motion reference.</p>
              <Row cols={{ desktop: 2, tablet: 2, mobile: 1 }} gap="lg">
                <Column>
                  <Sample label="Magnetic" components={["Magnetic"]} note="Follows the pointer on a real mouse.">
                    <Magnetic strength={0.4} range={120}>
                      <span style={magneticStyle}>Start a project</span>
                    </Magnetic>
                  </Sample>
                </Column>
                <Column>
                  <Sample label="Parallax" components={["Parallax"]} note="Drifts as the page scrolls.">
                    <div style={{ overflow: "hidden", borderRadius: "var(--component-radius)" }}>
                      <Parallax speed={0.5}>
                        <div style={parallaxTileStyle}>
                          <div style={parallaxKickerStyle}>speed 0.5</div>
                          <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--type-md)", color: "var(--text-positive-primary)" }}>Lags the page as you scroll</div>
                        </div>
                      </Parallax>
                    </div>
                  </Sample>
                </Column>
              </Row>
              <Sample label="RevealBlock" components={["RevealBlock"]}>
                <RevealBlock variant="fade-up" trigger="mount">
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--type-2xl)", color: "var(--text-positive-primary)", lineHeight: "var(--leading-tight)", letterSpacing: "var(--tracking-snug)" }}>
                    A block that arrives as one.
                  </div>
                </RevealBlock>
              </Sample>
              <Sample label="RevealText" components={["RevealText"]} note="Each word arrives a beat after the one before it.">
                <RevealText variant="word" trigger="mount" style={{ fontFamily: "var(--font-display)", fontSize: "var(--type-2xl)", color: "var(--text-positive-primary)", lineHeight: "var(--leading-tight)", letterSpacing: "var(--tracking-snug)" }}>
                  Each word arrives a beat after the one before it.
                </RevealText>
              </Sample>
              <Sample label="ScrollScene" components={["ScrollScene"]} note="Scrubs off scroll position; rests fully revealed with no JS.">
                <ScrollScene>
                  <div style={{ ...parallaxTileStyle, opacity: "calc(0.3 + 0.7 * var(--mw-scene-progress, 1))", transform: "translateY(calc((1 - var(--mw-scene-progress, 1)) * 1.25rem))" }}>
                    <div style={parallaxKickerStyle}>--mw-scene-progress</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--type-md)", color: "var(--text-positive-primary)" }}>Scrubs as this panel crosses the viewport</div>
                  </div>
                </ScrollScene>
              </Sample>
              <Sample label="ScrollFillText" components={["ScrollFillText"]} note="Inks in a word at a time as it crosses the viewport, and un-inks on the way back; rests fully inked with no JS.">
                <ScrollFillText style={{ fontFamily: "var(--font-display)", fontSize: "var(--type-xl)", color: "var(--text-positive-primary)", lineHeight: "var(--leading-snug)", margin: 0 }}>
                  The text rests in a muted ink and is written in as you read, piece by piece, then written out again if you scroll back.
                </ScrollFillText>
              </Sample>
            </div>
          </Panel>

          {/* Theme */}
          <Panel
            id="sr-theme"
            title="Theme"
            subheading="One dial · every surface"
            subheadingVariant="mono"
          >
            <div style={sampleFlowStyle}>
              <p style={panelNoteStyle}>
                Every colour on this page follows the theme dial. Theme control ships two ways, picked
                per surface: ThemeToggle, the two-state light and dark switch a fork mounts in its site
                chrome (this site&apos;s footer carries it), and MasterControls, the five-dial panel the
                HQ and docs surfaces use. A live toggle is deliberately not mounted here: theme control
                belongs to the page chrome, and a second controller on one page would fight it.
              </p>
            </div>
          </Panel>

          {/* Also in the system */}
          <Panel
            id="sr-also"
            title="Also in the system"
            subheading="Wired once in the layout"
            subheadingVariant="mono"
          >
            <div style={sampleFlowStyle}>
              <p style={panelNoteStyle}>
                Some parts run page-wide rather than as a placed component, wired once in the layout: the
                smooth-scroll provider, the custom cursor, the page-load curtain, the scroll-progress bar,
                and the theme and toast providers. Menus and dialogs float above everything through a shared
                top-layer panel, and self-hosted video swaps in behind the same Video component.
              </p>
            </div>
          </Panel>
        </div>

        {/* The mount's extra panels (HQ's sync-unit scope, a fork's additions)
            join the page at the SAME xl panel break every section above uses —
            v4.8.0 fix: the bare slot used to butt against the last section. */}
        {children != null ? <div style={childrenSlotStyle}>{children}</div> : null}
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
const showroomPanelProseStyle: CSSProperties = { margin: 0, fontSize: "var(--type-sm)", lineHeight: "var(--leading-normal)", color: "var(--text-positive-secondary)" };
// The stats are items, so they separate at the item rung (lg) and the head binds above them at
// xl. At xl they wrapped on a phone into a stack spaced exactly like the head's bind, and the
// spacing-ladder probe read the lede as one of the stats on every fork's /components (6 Sep 2026).
const statBandStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--space-lg)",
  marginTop: "var(--space-xl)",
};
const inlineNoteStyle: CSSProperties = {
  margin: 0,
  maxWidth: "var(--measure-prose)", // was 60ch: the reading measure (pass 4, 27 Aug 2026)
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-relaxed)",
  color: "var(--text-positive-secondary)",
};
// The section panels: one Panel per showroom group, separated at the xl
// section break (the HQ hqSectionBreak tier) and set off from the stat band by
// the same beat. Panel anchors carry their own chrome-clearing scroll margin.
// The children slot joins at the panel-stack's own xl break (v4.8.0).
const childrenSlotStyle: CSSProperties = {
  marginTop: "var(--space-xl)",
};

const panelStackStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xl)",
  marginTop: "var(--space-xl)",
};
// The flow inside a panel body: the section note, then sample after sample at
// the lg item rung (one rung under the panel break; the flow owns the gaps, so
// samples carry no margins of their own).
const sampleFlowStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-lg)",
};
// The section's one-line note, first in the panel body: quiet sentence tier.
const panelNoteStyle: CSSProperties = {
  margin: 0,
  maxWidth: "var(--measure-prose)", // was 62ch: the reading measure (pass 4, 27 Aug 2026)
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-relaxed)",
  color: "var(--text-positive-secondary)",
};
const sampleStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-sm)" };
const sampleHeadStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "var(--space-md)",
  flexWrap: "wrap",
};
const chipRowStyle: CSSProperties = {
  display: "inline-flex",
  flexWrap: "wrap",
  gap: "var(--space-2xs)",
};
const chipStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  color: "var(--accent-emphasis)",
  background: "var(--accent-soft)",
  border: "1px solid var(--accent-base)",
  borderRadius: "var(--component-radius)",
  padding: "var(--space-3xs) var(--space-2xs)",
  whiteSpace: "nowrap",
};
const sampleBodyStyle: CSSProperties = {
  padding: "var(--space-lg)",
  border: "1px solid var(--border-positive-secondary)",
  borderRadius: "var(--component-radius)",
};
const sampleNoteStyle: CSSProperties = {
  margin: 0,
  fontSize: "var(--type-xs)",
  lineHeight: "var(--leading-snug)",
  color: "var(--text-positive-tertiary)",
};
// The NavRail demo frame: the rail is a full-height chrome column, so the demo
// gives it a bounded stage (structural height cap, not page rhythm).
const navRailFrameStyle: CSSProperties = {
  height: "22rem",
  display: "flex",
  alignItems: "stretch",
  overflow: "hidden",
  border: "1px dashed var(--border-positive-secondary)",
  borderRadius: "var(--component-radius)",
};
const demoCellStyle: CSSProperties = {
  padding: "var(--space-md)",
  background: "var(--background-positive-secondary)",
  borderRadius: "var(--component-radius)",
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-xs)",
  color: "var(--text-positive-secondary)",
  textAlign: "center",
};
const cardTextStyle: CSSProperties = {
  color: "var(--text-positive-secondary)",
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-snug)",
  margin: 0,
};
const statColStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-2xs)" };
const marqueeItemStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  paddingBlock: "var(--space-md)",
  paddingInline: "var(--space-lg)",
  background: "var(--background-positive-secondary)",
  borderRadius: "var(--component-radius)",
  fontFamily: "var(--font-display)",
  fontSize: "var(--type-lg)",
  color: "var(--text-positive-secondary)",
  letterSpacing: "var(--tracking-wide)",
  whiteSpace: "nowrap",
};
const magneticStyle: CSSProperties = {
  display: "inline-block",
  fontFamily: "var(--font-display)",
  fontSize: "var(--type-md)",
  color: "var(--text-positive-primary)",
  background: "var(--background-positive-secondary)",
  border: "1px solid var(--border-positive-primary)",
  borderRadius: "var(--component-radius)",
  padding: "var(--space-sm) var(--space-lg)",
};
const parallaxTileStyle: CSSProperties = {
  padding: "var(--space-xl) var(--space-lg)",
  background: "linear-gradient(135deg, var(--accent-soft), var(--background-positive-primary))",
  border: "1px solid var(--border-positive-primary)",
  borderRadius: "var(--component-radius)",
};
const parallaxKickerStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--accent-emphasis)",
  marginBottom: "var(--space-2xs)",
};

/* ---- The surface register (v6.36.0) ---- */
// The record head's lede at the reading measure; the counts bind under the head at xl; the index
// (toolbar, groups, rows) opens under them at the section break.
const surfaceLedeStyle: CSSProperties = {
  maxWidth: "var(--measure-prose)",
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-relaxed)",
  color: "var(--text-positive-primary)",
};
const surfaceStatsStyle: CSSProperties = { marginTop: "var(--space-xl)" };
const surfaceIndexStyle: CSSProperties = { marginTop: "var(--space-2xl)" };

// Referenced so the exemption literal is part of the module contract (the
// sync-unit check parses it statically; this keeps it live code, not dead).
export const SHOWROOM_EXEMPTIONS = SHOWROOM_EXEMPT;
