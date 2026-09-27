"use client";

import { CSSProperties } from "react";
import Link from "next/link";
import { BrandWordmark } from "@/components/BrandWordmark";
import { BRAND } from "@/lib/assets";
import { CdrLockup, CdrSymbol } from "./CdrLogo";
import { ShoppingCart } from "@carbon/icons-react";
import { Container } from "@/components/Container";
import { RouteTabs } from "./RouteTabs";
import { RegionChip } from "./RegionChip";
import { tokenNumber } from "@/components/internal/styles";
import { money, SITE } from "@/data/site";
import { useRegion } from "./RegionProvider";
import { inRegionCurrency } from "@/data/regions";
import { useCart } from "./CartProvider";

/* The site shell's head, the bltz.com anatomy: a brand row (wordmark left; currency chip, the
   cart widget and sign-in right) over a full-width route tab strip (RouteTabs). The tab strip IS
   the navigation: five words, the whole site. Fork-owned; the sync unit's Nav is the wrong shape
   for this register (a link row plus a fullscreen overlay). */

const headStyle: CSSProperties = {
  background: "var(--background-positive-primary)",
  borderBottom: "var(--rule-weight) solid var(--border-positive-secondary)",
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-md)",
  flexWrap: "wrap",
  paddingBlock: "var(--space-md)",
};

// THE CLIENT'S MARK, not the fleet's text treatment (18 Sep 2026). It used to render
// BrandWordmark, which draws the name as type, because this fork had no artwork. It has one now:
// CdrLogo is GENERATED from public/logo-*.svg by the mother's scripts/brand/domain-services.mjs
// and must not be hand-edited, for the reason FORK_PROTOCOL gives after ReadilyHome's four app
// shells drew a logo the client had never approved with nothing able to detect it.
//
// BrandWordmark still WRAPS it, and that is deliberate rather than legacy: it is the component
// that publishes `data-mw-brand-status`, which is how the HQ and any future sweep can see that
// this mark is a stand-in and not a ratified one. Passing the drawing as children is the
// sanctioned route (v6.10.0); the fork is not hand-rolling a wordmark span.
const homeLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minWidth: 0,
  color: "inherit",
  textDecoration: "none",
  // The bounding box is the system's, not a number picked here: the same three tokens the
  // mother's Nav uses for every fork's lockup slot. A logo that sets its own height is how the
  // fleet ended up with eleven different nav lockups.
  maxWidth: "var(--brand-lockup-width)",
};

// Full lockup on a laptop, the leaf alone on a phone. The mother made this a DESIGN-SYSTEM rule
// rather than a per-fork fix (owner, 17 Sep 2026) and this header is fork-owned, so it has to
// honour the rule by hand. A media query cannot live in an inline style, so the swap is a hoisted
// style block, the same shape RouteTabs already uses in this fork.
const logoCss = `
[data-ds-logo-full] { display: inline-flex; align-items: center; min-width: 0; }
[data-ds-logo-full] > svg { height: var(--brand-lockup-height); width: auto; max-width: var(--brand-lockup-width); }
[data-ds-logo-symbol] { display: none; align-items: center; }
[data-ds-logo-symbol] > svg { height: var(--brand-symbol-size); width: auto; }
@media (max-width: 767.98px) { /* --mw-bp-tablet */
  [data-ds-logo-full] { display: none; }
  [data-ds-logo-symbol] { display: inline-flex; }
}
`;

const utilityRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-xs)",
  flexWrap: "wrap",
};

/* The cart widget and the sign-in link share one chip dress: a bordered pill at --type-sm in the
   body face, the system's secondary Button in miniature, so they read as one utility row. */
const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-2xs)",
  padding: "var(--space-2xs) var(--space-sm)",
  border: "var(--rule-weight) solid var(--border-positive-primary)",
  borderRadius: "var(--component-radius)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  color: "var(--text-positive-primary)",
  textDecoration: "none",
  whiteSpace: "nowrap",
  minHeight: "var(--control-size-md)",
};

const stripStyle: CSSProperties = {
  // The strip reads edge to edge inside the container, under the brand row.
  paddingTop: "var(--space-2xs)",
};

/** The header's running total: always two decimals, symbol plus the ISO code.
 *
 * money() is the shared formatter in src/data/site.ts, and it is shared for a reason: this chip,
 * the cart rail, the duration options, the cart total and the checkout figure are five surfaces
 * showing the same number, and they had three formatters between them. One of them dropped the
 * cents on a whole figure, so the header read "$0" empty and "$265.00" full. */
function cartTotalLabel(totalUsd: number, currency: string): string {
  return `${money(inRegionCurrency(totalUsd, currency), currency)} ${currency}`;
}

const logoPendingStyle: CSSProperties = { visibility: "hidden" };

export function SiteHeader() {
  const cart = useCart();
  // Prices live in USD and convert at render: Canada sees CAD, everywhere else USD.
  // THE LOGO FOLLOWS THE REGION TOO (19 Sep 2026): the maple leaf in Canada, the flag everywhere
  // else. The region resolves in the browser, so until it is `ready` the logo holds its box and
  // paints nothing, the same way the chip and the cart wait: a Canadian never sees the American
  // lockup flash first.
  const { region, code, ready } = useRegion();
  const count = cart.ready ? cart.items.length : 0;
  const total = cart.ready ? cart.total : 0;

  return (
    <header style={headStyle} data-ds-header="">
      {/* Hoisted by React 19 and deduped by href, the same shape RouteTabs uses in this fork. */}
      <style href="domain-services-logo" precedence="default">{logoCss}</style>
      <Container size="lg">
        <div style={rowStyle}>
          {/* The link carries the accessible name, and each drawing is aria-hidden, so a screen
              reader hears "Corporate Domain Registry, home" once rather than the mark's own label twice. */}
          <Link href="/" style={homeLinkStyle} aria-label={`${SITE.wordmark}, home`}>
            <BrandWordmark {...BRAND}>
              <span data-ds-logo-full="" aria-hidden="true">
                <CdrLockup region={code} style={ready ? undefined : logoPendingStyle} />
              </span>
              <span data-ds-logo-symbol="" aria-hidden="true">
                <CdrSymbol region={code} style={ready ? undefined : logoPendingStyle} />
              </span>
            </BrandWordmark>
          </Link>
          <div style={utilityRowStyle} aria-label="Account and cart">
            {/* The region chip stands where a plain USD badge used to, in the reference's flag
                slot. It REPORTS rather than offers: the client asked for a flag that says where
                you connect from, not a toggle (9 Sep 2026), so the picker came out on 18 Sep.
                It names its currency out loud, which matters more now that the currency actually
                differs by region. */}
            <RegionChip />
            <Link href="/cart" style={chipStyle} aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}, ${cartTotalLabel(total, region.currency)}`}>
              <ShoppingCart size={16} aria-hidden="true" />
              {/* "Cart (0): $0.00 USD", the reference's exact chip. NOT PriceLabel here: it drops
                  the cents on a whole number, which is right for a price in content and wrong for
                  a running total that must not jump between "$0" and "$0.00" as items go in. The
                  currency CODE is appended because the symbol alone cannot separate USD from CAD,
                  and this chip is the one place the row still states the currency at all. */}
              <span>Cart ({count}): {cartTotalLabel(total, region.currency)}</span>
            </Link>
            {/* NO SIGN-IN CHIP (owner call, 4 Sep 2026). There is no account system behind it
                yet, and the reference site's header carries only the region flag and the cart.
                A header chip that advertises an account a visitor cannot actually have is worse
                than an absent one. /login still exists as a route and its form still renders;
                it is simply unlinked from the chrome until accounts are real. */}
          </div>
        </div>
        <div style={stripStyle}>
          <RouteTabs />
        </div>
      </Container>
    </header>
  );
}
