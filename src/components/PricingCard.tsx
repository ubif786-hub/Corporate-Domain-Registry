import { CSSProperties, ReactNode } from "react";
import { Checkmark, Subtract } from "@carbon/icons-react";
import { Card } from "@/components/Card";
import { PriceLabel } from "@/components/PriceLabel";
import { Badge } from "@/components/Badge";
import { Icon } from "@/components/Icon";
import { Heading } from "@/components/Heading";
import { srOnly } from "@/components/internal/styles";

/* ============================================================
   PricingCard — one plan/tier in a pricing wall: the tier name, a
   prominent price figure, a billing-cycle caption, a check-row feature
   list, an optional "most-popular" flag, and a CTA slot. Sits in a
   mother Card so it inherits the system's surface, radius, and elevation
   — a `featured` tier lifts to the accent-bordered, raised treatment so
   the recommended plan reads as the hero of the row.

   Composition, not calculation. The price is the CONSUMER's: pass an
   integer in CENTS and PricingCard hands it to PriceLabel (whole amounts
   render bare "$20", fractional keep cents "$19.50"), OR pass any
   ReactNode — your own <PriceLabel currency=… />, a "Custom" string, a
   struck-through promo pair — when the figure needs more than the default
   USD/en-US treatment. Yearly-vs-monthly math, discounts, and per-seat
   arithmetic all belong to the fixtures that feed `price` and `cycle`;
   this card never computes pricing.

   The feature list is a real <ul>. A bare string is an included feature;
   an object with included:false renders the muted "—" glyph and a
   visually-hidden "not included" so the row's meaning survives without
   colour or the icon. Server component: presentational, no hooks.
   ============================================================ */

/** One feature row. A bare string is included by default; the object form
 *  carries included:false for a struck/muted "not in this tier" row. */
export type PricingFeature = string | { label: ReactNode; included?: boolean };

export interface PricingCardProps {
  /** The tier / plan name (e.g. "Starter", "Pro"). Rendered as the card's heading
   *  at `headingLevel` (default h3). */
  tier: ReactNode;
  /** Heading level of the tier name. Default 3 (a tier sits under a section h2). Pass 2 when
   *  the pricing row follows the page h1 directly, so the outline does not skip h1 -> h3
   *  (readilyhome's onboarding plan page). (v5.6.0; was a fixed h3.) */
  headingLevel?: 2 | 3 | 4;
  /** The audience line under the tier name (v4.8.0, e.g. "For growing practices"),
   *  so a tier reads name → audience → price in one column. Omit for none. */
  tagline?: ReactNode;
  /** The headline price. A number is read as CENTS and formatted via PriceLabel
   *  (2000 → "$20", 1950 → "$19.50"); a ReactNode is rendered verbatim for
   *  custom currencies, "Custom", or promo figures. */
  price: number | ReactNode;
  /** The billing-cycle caption beside the figure (e.g. "/mo", "per seat / month",
   *  "billed annually"). Omit for a figure with no cadence (one-time / custom). */
  cycle?: ReactNode;
  /** The feature rows. */
  features: PricingFeature[];
  /** Lifts the card to the accent-bordered, raised "recommended" treatment and,
   *  unless `badge` says otherwise, shows the "Most popular" flag. */
  featured?: boolean;
  /** The flag label. Defaults to "Most popular" when `featured`. Pass a node to
   *  relabel ("Best value"); shows the flag even when not `featured`. */
  badge?: ReactNode;
  /** "inverted" (v4.8.0): the tier sits on the INVERTED surface — the card and
   *  every child remap through the [data-section-bg="inverted"] token scope, so
   *  the hero tier reads as a dark card between light ones in light theme and
   *  mirrors (light between dark) in dark. Combine with `featured` for the
   *  pricing-wall hero. Default undefined = the normal surface. */
  surface?: "inverted";
  /** The action slot, pinned to the card foot (typically a mother <Button> —
   *  pass fullWidth so it spans the tier). */
  cta: ReactNode;
}

// Normalise a feature to { label, included }: a bare string is an included row.
function normalizeFeature(feature: PricingFeature): { label: ReactNode; included: boolean } {
  if (typeof feature === "string") return { label: feature, included: true };
  return { label: feature.label, included: feature.included !== false };
}

export function PricingCard({
  tier,
  tagline,
  price,
  cycle,
  features,
  featured = false,
  badge,
  surface,
  cta,
  headingLevel = 3,
}: PricingCardProps) {
  // A number is cents; PriceLabel takes currency units, so divide. Any other
  // node (including a caller's own PriceLabel) renders verbatim.
  const priceNode =
    typeof price === "number" ? <PriceLabel amount={price / 100} /> : price;

  // The flag shows when relabelled OR when this is the featured tier.
  const badgeLabel = badge ?? (featured ? "Most popular" : null);

  const card = (
    <Card
      variant="content"
      tone={featured ? "accent" : undefined}
      elevation={featured ? "raised" : "subtle"}
      padding="normal"
    >
      <Card.Body>
        {badgeLabel !== null ? (
          <Badge tone="accent" emphasis="solid">
            {badgeLabel}
          </Badge>
        ) : null}

        <Heading level={headingLevel} size={5}>
          {tier}
        </Heading>

        {tagline != null ? <p style={taglineStyle}>{tagline}</p> : null}

        <div style={priceRowStyle}>
          <span style={figureStyle}>{priceNode}</span>
          {cycle !== undefined ? <span style={cycleStyle}>{cycle}</span> : null}
        </div>

        <ul style={featureListStyle} role="list">
          {features.map((feature, i) => {
            const { label, included } = normalizeFeature(feature);
            return (
              <li key={i} style={featureRowStyle}>
                <span
                  style={included ? checkStyle : dashStyle}
                  aria-hidden="true"
                >
                  <Icon size="sm">{included ? <Checkmark /> : <Subtract />}</Icon>
                </span>
                <span style={included ? labelStyle : labelMutedStyle}>
                  {label}
                  {!included ? <span style={srOnly}> (not included)</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </Card.Body>

      <Card.Footer>{cta}</Card.Footer>
    </Card>
  );

  // The inverted surface: the token-remap scope wraps the card; display:contents
  // keeps the Card the real layout child (a grid/flex row still sees the card,
  // not a wrapper box), so only the surface inverts — no geometry changes.
  return surface === "inverted" ? (
    <div data-section-bg="inverted" style={{ display: "contents" }}>
      {card}
    </div>
  ) : (
    card
  );
}

/* ---------- inline styles (token-pure) ---------- */

// Figure + cadence share a baseline: the price sits large, the cycle caption
// tucks against it in the muted ink.
const priceRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  flexWrap: "wrap",
  gap: "var(--space-2xs)",
};

// The headline figure. PriceLabel inherits this size, so the tier's price
// reads a rung above body without PriceLabel owning a display tier.
const figureStyle: CSSProperties = {
  fontSize: "var(--type-3xl)",
  color: "var(--text-positive-primary)",
  lineHeight: "var(--leading-tight)",
};

const cycleStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  color: "var(--text-positive-tertiary)",
};

// The audience line: quiet, directly under the tier name.
const taglineStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
};

// The feature list: a real <ul>, reset of its native disc/padding, rows stacked
// on the card's intra-block rung.
const featureListStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xs)",
};

const featureRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "var(--space-xs)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-md)",
  lineHeight: "var(--leading-normal)",
};

// The included glyph in the success ink; the excluded glyph muted so an absent
// feature recedes. flex:0 0 auto keeps the icon from shrinking beside long labels.
const checkStyle: CSSProperties = {
  flex: "0 0 auto",
  color: "var(--status-success-text)",
};
const dashStyle: CSSProperties = {
  flex: "0 0 auto",
  color: "var(--text-positive-tertiary)",
};

const labelStyle: CSSProperties = {
  color: "var(--text-positive-secondary)",
};
// Excluded rows drop to the tertiary ink so the row reads as "not in this tier".
const labelMutedStyle: CSSProperties = {
  color: "var(--text-positive-tertiary)",
};
