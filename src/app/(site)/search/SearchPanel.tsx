"use client";

import { CSSProperties, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heading } from "@/components/Heading";
import { Row } from "@/components/Row";
import { Column } from "@/components/Column";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Select } from "@/components/Select";
import { tokenNumber } from "@/components/internal/styles";
import { DomainSearchForm } from "../DomainSearchForm";
import { CartPanel } from "../CartPanel";
import { useCart } from "../CartProvider";
import { useRegion } from "../RegionProvider";
import { inRegionCurrency } from "@/data/regions";
import {
  DEFAULT_TERM,
  NEW_TLDS,
  POPULAR_TLDS,
  SERVICE_LABELS,
  TERMS,
  money,
  priceForTerm,
  type Service,
  type Term,
} from "@/data/site";
import { formatDate, lookup, type DomainRecord } from "@/data/lookup";

/* The search experience, and the ONLY one on the site: /search, /register, /transfer and /renew
   all render this, the way bltz.com's four search pages are one form with four headings.
   The home hero renders the same field and lands here.
 *
 * THE RESULT SELLS A DOMAIN TO ANYONE WHO TYPES ONE (18 Sep 2026, the client's shot by shot
 * walkthrough of the reference, relayed by the owner). Type nike.com, get one row: Domain Renewal
 * / Transfer, a duration select priced one to ten years, and Add To Cart. That is the whole
 * result, and it does not consult a registry, which is the insight that unblocked this: the
 * reference quotes nike.com because it never asks whether nike.com is available. It offers to
 * renew or transfer WHATEVER you type, at a flat ladder, and settles what you actually hold at
 * fulfilment. It will happily quote a typo (nke.com, in the client's own screenshot).
 *
 * SO THE AVAILABILITY LOOKUP STOPS GATING THE SALE and becomes what it always was: information.
 * The snapshot still runs, and when it knows something useful it says so above the offer, but a
 * miss no longer costs the visitor the ability to buy. Before this the page could show a real
 * registration record for maplegrove.ca and then have nothing to sell, because .ca was not a
 * priced row. That is the mechanical form of the client's "the search isn't working".
 *
 * WHAT WE STILL DO THAT THE REFERENCE DOES NOT: we say when the domain is FREE, and offer to
 * register it rather than renew it. Selling somebody a renewal on a domain nobody holds is wrong
 * in a way worth one branch of code, and the row is otherwise identical: same select, same ladder,
 * same button, only the label and the cart line's service differ.
 *
 * RENEWAL AND TRANSFER ARE ONE ACTION HERE (owner call, 4 Sep 2026, matching the reference).
 * They are different operations: a transfer needs an auth/EPP code from the losing registrar and
 * a 60-day-since-registration check, a renewal needs you to already hold the domain here, and
 * CDR's own Domain Registration and Management Agreement governs them separately. On price and on
 * what the customer is buying (N years on a domain that already exists) they are identical, which
 * is why the reference fuses them. THE DISTINCTION MOVES DOWNSTREAM RATHER THAN DISAPPEARING: it
 * surfaces at fulfilment, where a transfer must collect an auth code and a renewal must not.
 * Checkout collects no card today (Stripe is not connected), so this is recorded as a requirement
 * for that build, not lost. The cart line records the "renew" service id for both; whoever wires
 * the registrar must branch on what the customer actually holds, not on what they clicked here.
 */

const panelStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--flow-group)" };
const columnStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--flow-group)" };

const resultStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-md)",
  padding: "var(--space-lg)",
  border: "var(--rule-weight) solid var(--border-positive-secondary)",
  borderRadius: "var(--component-radius)",
  background: "var(--background-positive-secondary)",
};
// The domain, centred over a rule: the reference's result header exactly. Centring is doing work
// rather than decorating, because the offer row underneath is a left-aligned three-part line and
// the heading needs to read as its title and not as its first field.
const resultHeadStyle: CSSProperties = {
  paddingBottom: "var(--space-sm)",
  borderBottom: "var(--rule-weight) solid var(--border-positive-secondary)",
  textAlign: "center",
};
const statusStyle: CSSProperties = {
  margin: 0,
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
};
/* The reference's one result row: what it is, for how long, and the button that buys it. */
const offerRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-md)",
};
const offerLabelStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-md)",
  fontWeight: tokenNumber("var(--weight-semibold)"),
  color: "var(--text-positive-primary)",
};
const offerActionsStyle: CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm)" };
const mutedStyle: CSSProperties = { margin: 0, fontSize: "var(--type-sm)", color: "var(--text-positive-tertiary)" };
const linkStyle: CSSProperties = { color: "var(--text-positive-link)" };

export function SearchPanel({ domain }: { domain: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<DomainRecord | null>(domain ? lookup(domain) : null);

  function onSearch(d: string) {
    setRecord(lookup(d));
    // Relative, so a search started on /transfer stays on /transfer and keeps its heading.
    router.replace(`?domain=${encodeURIComponent(d)}`, { scroll: false });
  }

  return (
    <div style={panelStyle}>
      <DomainSearchForm initial={record?.domain ?? domain} size="lg" onSearch={onSearch} />
      {/* Results two thirds, cart rail one third. The client asked for the rail back on 18 Sep
          after asking for it gone on 9 Sep; CartPanel's header carries that history. The
          proportion is the compromise: the 9 Sep objection was that the results and the extension
          lists were squeezed into half a page, and at 2:1 they are not. */}
      <Row cols={{ mobile: 1, tablet: 1, desktop: 3 }} gap="lg" alignItems="start">
        <Column span={{ mobile: 1, tablet: 1, desktop: 2 }}>
          <div style={columnStyle}>
            {record ? <Result record={record} /> : null}
            <TldLists />
          </div>
        </Column>
        <Column span={1}>
          <CartPanel />
        </Column>
      </Row>
    </div>
  );
}

function Result({ record }: { record: DomainRecord }) {
  const cart = useCart();
  const { region } = useRegion();
  // Five years, the reference's own default selection.
  const [term, setTerm] = useState<Term>(DEFAULT_TERM);

  // A free domain is registered, anything else is renewed or transferred. That is the ONLY thing
  // the availability lookup decides now; it no longer decides whether there is anything to sell.
  const service: Service = record.availability === "available" ? "register" : "renew";
  const price = priceForTerm(term);
  const inCart = cart.items.some((i) => i.id === `${service}:${record.domain}`);

  return (
    <div style={resultStyle} role="status" aria-live="polite" data-ds-result={record.availability}>
      <div style={resultHeadStyle}>
        <Heading level={2} size={4}>{record.domain}</Heading>
      </div>

      {/* What we know, said in a sentence rather than a badge. The badge went on 18 Sep: it was a
          three-state verdict (Available / Registered / Unable to verify) sitting beside a button
          that now works in all three states, so "Unable to verify" read as a refusal next to an
          offer. It is not one. It means the snapshot has not heard of the domain, which is true
          of almost every domain a visitor will type and interesting to none of them. */}
      <Status record={record} />

      <div style={offerRowStyle}>
        <span style={offerLabelStyle}>{SERVICE_LABELS[service]}</span>
        <div style={offerActionsStyle}>
          <Select
            id={`term-${record.domain.replace(/[^a-z0-9-]/gi, "-")}`}
            // The offer label names the row; the control keeps an accessible name so the combobox
            // is not anonymous, and shows none, which is the reference's own layout.
            aria-label={`Duration for ${record.domain}`}
            size="md"
            value={String(term)}
            options={TERMS.map((t) => ({ value: String(t), label: termOption(t, region.currency) }))}
            onChange={(e) => setTerm(Number(e.target.value) as Term)}
          />
          {inCart ? (
            /* A BADGE, NOT A DISABLED BUTTON. The reference turns its button green and holds it in
               place, and the first cut of this rendered a disabled secondary Button to match the
               shape. Measured, that came out as a dark fill at opacity 0.5, i.e. mid grey: it read
               as "you cannot add this", which is the opposite of what happened. A solid success
               Badge says "done" in the system's own status ink, which is the same green the
               reference is reaching for, and it is honest about not being a control. Nothing is
               lost: the rail beside it gained the line, and the rail carries View Cart. */
            <Badge tone="success" emphasis="solid" icon textCase="title">Added To Cart</Badge>
          ) : (
            <Button
              variant="primary"
              onClick={() => cart.add({ domain: record.domain, service, term, amount: price })}
            >
              Add To Cart
            </Button>
          )}
        </div>
      </div>

      {record.availability === "registered" ? (
        <p style={mutedStyle}>
          <Link href={`/whois?domain=${encodeURIComponent(record.domain)}`} style={linkStyle}>
            See the full registration record
          </Link>
        </p>
      ) : null}
    </div>
  );
}

/** "5 Years - $265.00", the reference's own option label, in the visitor's currency. */
function termOption(term: Term, currency: string): string {
  const amount = inRegionCurrency(priceForTerm(term), currency);
  return `${term} ${term === 1 ? "Year" : "Years"} - ${money(amount, currency)}`;
}

/**
 * One sentence about what the snapshot knows, or nothing at all.
 *
 * NOTHING IS THE COMMON CASE and it is deliberate. The snapshot is a fixed export of a thousand
 * expired 2016-17 records plus a handful of fixtures; a domain absent from it is not a finding,
 * and saying "we could not reach the registry" about it was actively false, which is the copy the
 * client read as the search being broken.
 */
function Status({ record }: { record: DomainRecord }) {
  if (record.availability === "available") {
    return <p style={statusStyle}>This domain is free to register.</p>;
  }
  if (record.availability === "registered") {
    return (
      <p style={statusStyle}>
        Already registered{record.registrar ? ` with ${record.registrar}` : ""}
        {record.expiresAt ? `, and it expires ${formatDate(record.expiresAt)}` : ""}. Checked{" "}
        {formatDate(record.checkedAt)} against our snapshot.
      </p>
    );
  }
  return null;
}

/* THE TWO EXTENSION CARDS, the reference's shape (bltz.com, screenshots 18 Sep 2026): two
 * bordered panels side by side, each a heading over a rule with the list written as a SENTENCE
 * rather than a row of chips.
 *
 * WHY PROSE BEATS THE BADGES HERE, beyond matching the reference. Fourteen chips read as a filter
 * control a visitor can press, and these are not pressable; they are a statement about what the
 * business sells. A sentence cannot be mistaken for a control, and it has room to say the thing
 * the chips could not, which is whether an extension is actually available.
 *
 * THE AVAILABILITY LINE IS THE CLIENT'S TO WRITE. bltz's own card says of its new TLDs: "We are
 * currenly working to obtain those TLDs in order to provide them to you", i.e. it cannot sell
 * them yet. Whether that is also true of CDR is a fact nobody here knows, so this copies the
 * STRUCTURE and not that claim. Flagged in PROJECT.md.
 *
 * THESE ARE NOW THE ONLY EXTENSIONS THE SITE NAMES, not the only ones it prices: the ladder is
 * flat, so a visitor who types a .ca gets quoted like everyone else. The cards say what CDR
 * talks about; they no longer gate what it sells.
 */
function TldLists() {
  return (
    <Row cols={{ mobile: 1, tablet: 1, desktop: 2 }} gap="lg" alignItems="stretch">
      <Column>
        <div style={tldCardStyle}>
          <div style={tldHeadStyle}>
            <Heading level={2} size={6}>Popular extensions</Heading>
          </div>
          <p style={tldBodyStyle}>
            The most requested extensions are {listSentence(POPULAR_TLDS)}. We register, renew and
            transfer all of these.
          </p>
        </div>
      </Column>
      <Column>
        <div style={tldCardStyle}>
          <div style={tldHeadStyle}>
            <Heading level={2} size={6}>New extensions</Heading>
          </div>
          <p style={tldBodyStyle}>
            Newer extensions include {listSentence(NEW_TLDS)}. Ask us about any extension you do
            not see here.
          </p>
        </div>
      </Column>
    </Row>
  );
}

/** "a, b and c" — an Oxford-free list, because this reads as a sentence and not as data. */
function listSentence(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

// A bordered card on the panel's own ground, the reference's shape: heading, a rule under it, then
// the sentence. Stretch so two cards of unequal text length still square off at the foot.
const tldCardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
  height: "100%",
  padding: "var(--space-lg)",
  border: "var(--rule-weight) solid var(--border-positive-secondary)",
  borderRadius: "var(--component-radius)",
  background: "var(--background-positive-primary)",
};
const tldHeadStyle: CSSProperties = {
  paddingBottom: "var(--space-xs)",
  borderBottom: "var(--rule-weight) solid var(--border-positive-secondary)",
};
const tldBodyStyle: CSSProperties = {
  margin: 0,
  fontSize: "var(--type-md)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
};
