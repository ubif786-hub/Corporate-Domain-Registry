import { ReactNode } from "react";
import { ArrowRight } from "@carbon/icons-react";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { DataLabel } from "@/components/DataLabel";
import { Eyebrow } from "@/components/Eyebrow";
import { Glance } from "@/components/Glance";
import { Heading } from "@/components/Heading";
import { Icon } from "@/components/Icon";
import { Kbd } from "@/components/Kbd";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { Radio, RadioGroup } from "@/components/Radio";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Switch } from "@/components/Switch";
import { IdChip } from "@/components/IdChip";
import { LegendDot } from "@/components/LegendDot";
import { PriceLabel } from "@/components/PriceLabel";
import { Stat } from "@/components/Stat";
import { StreakStrip } from "@/components/StreakStrip";
import { SwatchRow } from "@/components/SwatchRow";
import { ProgressBar } from "@/components/ProgressBar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Tabs, TabsList, TabsTab, TabsPanels, TabsPanel } from "@/components/Tabs";
import { Skeleton } from "@/components/Skeleton";
import { Divider } from "@/components/Divider";

/* ============================================================
   The showroom's ROW samples (v6.36.0, the CD reference-surface boards, the
   Components index in the HQ register): one live miniature per component that
   fits a list row, keyed by registry name. The surface register prints the
   entry's sample in the row's 15rem column "where it declares one, blank where
   not" (the board's own words), so this map is deliberately partial: a
   component whose honest sample needs a stage (a chart, a modal, a carousel)
   stays blank here and keeps its full Sample in the bordered register.

   Every miniature is the real component at its smallest sanctioned size, in
   the consuming site's own brand: a fork's index shows its tokens, the HQ the
   mother's. No stand-ins, no images. Sync unit: tokens only, no HQ imports.
   ============================================================ */

const STREAK = [
  { date: "2026-09-18", value: 2 },
  { date: "2026-09-19", value: 0 },
  { date: "2026-09-20", value: 3 },
  { date: "2026-09-21", value: 4 },
  { date: "2026-09-22", value: 1 },
  { date: "2026-09-23", value: 3 },
  { date: "2026-09-24", value: 2 },
] as const;

const inline = { display: "inline-flex", alignItems: "center", gap: "var(--space-xs)" } as const;

export const ROW_SAMPLES: Record<string, ReactNode> = {
  Avatar: (
    <span style={inline}>
      <Avatar name="Ada Lovelace" size="sm" />
      <Avatar name="Grace Sato" size="sm" variant="brand" />
    </span>
  ),
  Badge: (
    <span style={inline}>
      <Badge tone="success">In sync</Badge>
      <Badge tone="neutral" emphasis="solid">3</Badge>
    </span>
  ),
  DataLabel: <DataLabel>Invoiced to date</DataLabel>,
  Eyebrow: <Eyebrow as="span">Services</Eyebrow>,
  Glance: <Glance size="sm">1,247</Glance>,
  Heading: <Heading as="div" size={6}>Section title</Heading>,
  Icon: <Icon><ArrowRight /></Icon>,
  Kbd: (
    <span style={inline}>
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
    </span>
  ),
  Button: (
    <span style={inline}>
      <Button size="sm">Start</Button>
      <Button size="sm" variant="secondary">Cancel</Button>
    </span>
  ),
  Checkbox: <Checkbox id="sri-checkbox" label="Remember" />,
  Radio: (
    <RadioGroup name="sri-radio" defaultValue="monthly" orientation="horizontal">
      <Radio value="monthly" label="Monthly" />
    </RadioGroup>
  ),
  SegmentedControl: (
    <SegmentedControl
      name="sri-view"
      size="xs"
      ariaLabel="View"
      defaultValue="grid"
      options={[{ value: "list", label: "List" }, { value: "grid", label: "Grid" }, { value: "map", label: "Map" }]}
    />
  ),
  Switch: <Switch id="sri-switch" ariaLabel="Sample switch" defaultChecked size="sm" />,
  IdChip: <IdChip>INV-0042</IdChip>,
  LegendDot: <LegendDot color="var(--accent-base)">Web</LegendDot>,
  PriceLabel: (
    <span style={inline}>
      <PriceLabel amount={2000} />
      <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--type-xs)", color: "var(--text-positive-tertiary)" }}>/ mo</span>
    </span>
  ),
  Stat: <Stat label="Components" value={37} />,
  StreakStrip: <StreakStrip variant="compact" data={[...STREAK]} ariaLabel="Seven days" />,
  SwatchRow: (
    <span style={{ display: "inline-block", width: "6rem" }}>
      <SwatchRow ariaLabel="Brand swatches" swatches={[{ color: "var(--accent-base)" }, { color: "var(--accent-emphasis)" }, { color: "var(--accent-soft)" }, { color: "var(--text-positive-primary)" }, { color: "var(--background-positive-secondary)" }]} />
    </span>
  ),
  ProgressBar: (
    <span style={{ display: "inline-block", width: "8rem" }}>
      <ProgressBar value={62} ariaLabel="Onboarding" size="sm" />
    </span>
  ),
  Breadcrumbs: <Breadcrumbs items={[{ label: "Clients", href: "#" }, { label: "zafiro" }]} />,
  Tabs: (
    <Tabs orientation="horizontal">
      <TabsList ariaLabel="Sample tabs">
        <TabsTab>Usage</TabsTab>
        <TabsTab>Variants</TabsTab>
        <TabsTab>Code</TabsTab>
      </TabsList>
      <TabsPanels>
        <TabsPanel>{null}</TabsPanel>
        <TabsPanel>{null}</TabsPanel>
        <TabsPanel>{null}</TabsPanel>
      </TabsPanels>
    </Tabs>
  ),
  Skeleton: <Skeleton width="8rem" />,
  Divider: (
    <span style={{ display: "inline-block", width: "8rem" }}>
      <Divider spacing="none" />
    </span>
  ),
};
